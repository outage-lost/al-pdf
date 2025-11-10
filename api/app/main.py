import os
import uuid
import zipfile
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import aiofiles

from app.services.compression import compress_pdf, get_compression_estimates
from app.services.merging import merge_pdfs
from app.services.splitting import split_pdf
from app.services.conversion import convert_to_pdf
from app.utils import cleanup_temp_files, generate_random_filename

app = FastAPI(title="AL PDF Server", version="1.0.0")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = os.getenv("TEMP_DIR", "/app/temp")

# Asegurar que el directorio temporal existe
os.makedirs(TEMP_DIR, exist_ok=True)

@app.get("/")
async def root():
    return {"message": "AL PDF Server - Servicios de procesamiento de PDF"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Servicio de Compresión
@app.post("/compress/estimates")
async def get_compression_estimates_endpoint(file: UploadFile = File(...)):
    """Obtener estimaciones de compresión para diferentes calidades"""
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(400, "Solo se permiten archivos PDF")
    
    # Guardar archivo temporal
    temp_id = str(uuid.uuid4())
    input_path = os.path.join(TEMP_DIR, f"{temp_id}_input.pdf")
    
    async with aiofiles.open(input_path, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
    
    try:
        estimates = get_compression_estimates(input_path)
        return {"estimates": estimates, "temp_id": temp_id}
    except Exception as e:
        raise HTTPException(500, f"Error al procesar archivo: {str(e)}")
    finally:
        cleanup_temp_files([input_path])

@app.post("/compress")
async def compress_pdf_endpoint(
    file: UploadFile = File(...),
    quality: str = Form(...),
    temp_id: str = Form(None)
):
    """Comprimir PDF con calidad específica"""
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(400, "Solo se permiten archivos PDF")
    
    if quality not in ["baja", "media", "alta", "extrema"]:
        raise HTTPException(400, "Calidad no válida")
    
    # Guardar archivo temporal
    input_filename = f"{temp_id}_input.pdf" if temp_id else f"{uuid.uuid4()}_input.pdf"
    input_path = os.path.join(TEMP_DIR, input_filename)
    output_filename = generate_random_filename("pdf")
    output_path = os.path.join(TEMP_DIR, output_filename)
    
    async with aiofiles.open(input_path, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
    
    try:
        compress_pdf(input_path, output_path, quality)
        
        # Verificar que el archivo de salida existe
        if not os.path.exists(output_path):
            raise HTTPException(500, "El archivo comprimido no se generó correctamente")
            
        return FileResponse(
            output_path,
            filename=output_filename,
            media_type='application/pdf'
        )
    except Exception as e:
        raise HTTPException(500, f"Error al comprimir PDF: {str(e)}")
    finally:
        cleanup_temp_files([input_path])

# Servicio de Unión
@app.post("/merge")
async def merge_pdfs_endpoint(files: list[UploadFile] = File(...)):
    """Unir múltiples PDFs en uno solo"""
    if len(files) < 2:
        raise HTTPException(400, "Se requieren al menos 2 archivos PDF")
    
    temp_paths = []
    try:
        # Guardar archivos temporales
        for file in files:
            if not file.filename or not file.filename.lower().endswith('.pdf'):
                raise HTTPException(400, "Todos los archivos deben ser PDF")
            
            temp_id = str(uuid.uuid4())
            temp_path = os.path.join(TEMP_DIR, f"{temp_id}.pdf")
            temp_paths.append(temp_path)
            
            async with aiofiles.open(temp_path, 'wb') as out_file:
                content = await file.read()
                await out_file.write(content)
        
        # Unir PDFs
        output_filename = generate_random_filename("pdf")
        output_path = os.path.join(TEMP_DIR, output_filename)
        
        merge_pdfs(temp_paths, output_path)
        
        # Verificar que el archivo de salida existe
        if not os.path.exists(output_path):
            raise HTTPException(500, "El archivo unido no se generó correctamente")
        
        return FileResponse(
            output_path,
            filename=output_filename,
            media_type='application/pdf'
        )
    
    except Exception as e:
        raise HTTPException(500, f"Error al unir PDFs: {str(e)}")
    finally:
        cleanup_temp_files(temp_paths)

# Servicio de División
@app.post("/split")
async def split_pdf_endpoint(
    file: UploadFile = File(...),
    split_type: str = Form(...),
    custom_parts: int = Form(None),
    pages_per_part: int = Form(None)
):
    """Dividir PDF según diferentes métodos"""
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(400, "Solo se permiten archivos PDF")
    
    # Validar parámetros
    if split_type == "custom_parts" and (not custom_parts or custom_parts < 2):
        raise HTTPException(400, "custom_parts es requerido y debe ser al menos 2 para este tipo de división")
    if split_type == "pages_per_part" and (not pages_per_part or pages_per_part < 1):
        raise HTTPException(400, "pages_per_part es requerido y debe ser al menos 1 para este tipo de división")
    
    # Guardar archivo temporal
    temp_id = str(uuid.uuid4())
    input_path = os.path.join(TEMP_DIR, f"{temp_id}_input.pdf")
    
    async with aiofiles.open(input_path, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
    
    output_files = []
    try:
        output_files = split_pdf(input_path, split_type, custom_parts, pages_per_part)
        
        if not output_files:
            raise HTTPException(500, "No se generaron archivos de salida")
        
        # Crear archivo ZIP con los resultados
        zip_filename = generate_random_filename("zip")
        zip_path = os.path.join(TEMP_DIR, zip_filename)
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for output_file in output_files:
                if os.path.exists(output_file):
                    zipf.write(output_file, os.path.basename(output_file))
        
        # Verificar que el archivo ZIP existe
        if not os.path.exists(zip_path):
            raise HTTPException(500, "El archivo ZIP no se generó correctamente")
            
        return FileResponse(
            zip_path,
            filename=zip_filename,
            media_type='application/zip'
        )
            
    except Exception as e:
        raise HTTPException(500, f"Error al dividir PDF: {str(e)}")
    finally:
        # Limpiar archivos temporales
        cleanup_temp_files([input_path] + output_files)

# Servicio de Conversión
@app.post("/convert")
async def convert_to_pdf_endpoint(file: UploadFile = File(...)):
    """Convertir archivos a PDF"""
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.txt']
    
    if not file.filename:
        raise HTTPException(400, "Nombre de archivo no válido")
        
    file_ext = os.path.splitext(file.filename.lower())[1]
    
    if file_ext not in allowed_extensions:
        raise HTTPException(400, f"Formato no soportado. Formatos permitidos: {', '.join(allowed_extensions)}")
    
    # Guardar archivo temporal
    temp_id = str(uuid.uuid4())
    input_path = os.path.join(TEMP_DIR, f"{temp_id}_input{file_ext}")
    
    async with aiofiles.open(input_path, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
    
    try:
        output_filename = generate_random_filename("pdf")
        output_path = os.path.join(TEMP_DIR, output_filename)
        
        convert_to_pdf(input_path, output_path)
        
        # Verificar que el archivo de salida existe
        if not os.path.exists(output_path):
            raise HTTPException(500, "El archivo convertido no se generó correctamente")
        
        return FileResponse(
            output_path,
            filename=output_filename,
            media_type='application/pdf'
        )
    
    except Exception as e:
        raise HTTPException(500, f"Error al convertir archivo: {str(e)}")
    finally:
        cleanup_temp_files([input_path])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)