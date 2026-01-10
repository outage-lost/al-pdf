import os
import uuid
import zipfile
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from fastapi.middleware.cors import CORSMiddleware
import aiofiles

from app.services.compression import compresspdf, getcompressionestimates
from app.services.merging import mergepdfs
from app.services.splitting import splitpdf
from app.services.conversion import converttopdf
from app.utils import cleanuptempfiles, generaterandomfilename

app = FastAPI(
    title="AL PDF Server",
    version="1.0.0",
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMPDIR = os.getenv("TEMPDIR", "temp")

# Asegurar que el directorio temporal existe
os.makedirs(TEMPDIR, exist_ok=True)


@app.get("/")
async def root():
    return {"message": "AL PDF Server - Servicios de procesamiento de PDF"}


@app.get("/health")
async def healthcheck():
    return {"status": "healthy"}


# ---------------------------------------------------------
# Servicio de Compresión - estimaciones
# ---------------------------------------------------------
@app.post("/compress/estimates")
async def get_compression_estimates_endpoint(file: UploadFile = File(...)):
    """Obtener estimaciones de compresión para diferentes calidades"""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")

    tempid = str(uuid.uuid4())
    inputpath = os.path.join(TEMPDIR, f"{tempid}_input.pdf")

    async with aiofiles.open(inputpath, "wb") as outfile:
        content = await file.read()
        await outfile.write(content)

    try:
        estimates = getcompressionestimates(inputpath)
        return {"estimates": estimates, "tempid": tempid}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al procesar archivo: {str(e)}",
        )
    finally:
        cleanuptempfiles([inputpath])


# ---------------------------------------------------------
# Servicio de Compresión
# ---------------------------------------------------------
@app.post("/compress")
async def compresspdfendpoint(
    file: UploadFile = File(...),
    quality: str = Form(...),
    tempid: Optional[str] = Form(None),
):
    """Comprimir PDF con calidad específica"""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")

    if quality not in ["baja", "media", "alta", "extrema"]:
        raise HTTPException(status_code=400, detail="Calidad no válida")

    inputfilename = (
        f"{tempid}_input.pdf" if tempid else f"{uuid.uuid4()}_input.pdf"
    )
    inputpath = os.path.join(TEMPDIR, inputfilename)
    outputfilename = generaterandomfilename("pdf")
    outputpath = os.path.join(TEMPDIR, outputfilename)

    async with aiofiles.open(inputpath, "wb") as outfile:
        content = await file.read()
        await outfile.write(content)

    try:
        compresspdf(inputpath, outputpath, quality)

        if not os.path.exists(outputpath):
            # Attempted to create output but file missing
            # Clean up and raise error
            cleanuptempfiles([inputpath, outputpath])
            raise HTTPException(
                status_code=500,
                detail="El archivo comprimido no se generó correctamente",
            )

        # Use BackgroundTask to remove temp files AFTER the response is sent
        return FileResponse(
            outputpath,
            filename=outputfilename,
            media_type="application/pdf",
            background=BackgroundTask(lambda: cleanuptempfiles([inputpath, outputpath])),
        )
    except Exception as e:
        # Ensure temporary files are removed on error
        cleanuptempfiles([inputpath, outputpath])
        raise HTTPException(
            status_code=500,
            detail=f"Error al comprimir PDF: {str(e)}",
        )


# ---------------------------------------------------------
# Servicio de Unión
# ---------------------------------------------------------
@app.post("/merge")
async def mergepdfsendpoint(files: List[UploadFile] = File(...)):
    """Unir múltiples PDFs en uno solo"""
    if len(files) < 2:
        raise HTTPException(
            status_code=400,
            detail="Se requieren al menos 2 archivos PDF",
        )

    temppaths: List[str] = []

    try:
        for file in files:
            if not file.filename or not file.filename.lower().endswith(".pdf"):
                raise HTTPException(
                    status_code=400,
                    detail="Todos los archivos deben ser PDF",
                )

            tempid = str(uuid.uuid4())
            temppath = os.path.join(TEMPDIR, f"{tempid}.pdf")
            temppaths.append(temppath)

            async with aiofiles.open(temppath, "wb") as outfile:
                content = await file.read()
                await outfile.write(content)

        outputfilename = generaterandomfilename("pdf")
        outputpath = os.path.join(TEMPDIR, outputfilename)

        mergepdfs(temppaths, outputpath)

        if not os.path.exists(outputpath):
            raise HTTPException(
                status_code=500,
                detail="El archivo unido no se generó correctamente",
            )

        # Clean up temporaries after response is served
        return FileResponse(
            outputpath,
            filename=outputfilename,
            media_type="application/pdf",
            background=BackgroundTask(lambda: cleanuptempfiles(temppaths + [outputpath])),
        )
    except Exception as e:
        # Ensure temporaries removed on error
        cleanuptempfiles(temppaths)
        raise HTTPException(
            status_code=500,
            detail=f"Error al unir PDFs: {str(e)}",
        )


# ---------------------------------------------------------
# Servicio de División
# ---------------------------------------------------------
@app.post("/split")
async def splitpdfendpoint(
    file: UploadFile = File(...),
    splittype: str = Form(...),
    customparts: Optional[int] = Form(None),
    pagesperpart: Optional[int] = Form(None),
):
    """Dividir PDF según diferentes métodos"""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")

    if splittype == "customparts" and (not customparts or customparts < 1):
        raise HTTPException(
            status_code=400,
            detail=(
                "customparts es requerido y debe ser al menos 1 "
                "para este tipo de división"
            ),
        )

    if splittype == "pagesperpart" and (not pagesperpart or pagesperpart < 1):
        raise HTTPException(
            status_code=400,
            detail=(
                "pagesperpart es requerido y debe ser al menos 1 "
                "para este tipo de división"
            ),
        )

    tempid = str(uuid.uuid4())
    inputpath = os.path.join(TEMPDIR, f"{tempid}_input.pdf")

    async with aiofiles.open(inputpath, "wb") as outfile:
        content = await file.read()
        await outfile.write(content)

    outputfiles: List[str] = []

    try:
        outputfiles = splitpdf(inputpath, splittype, customparts, pagesperpart)

        if not outputfiles:
            raise HTTPException(
                status_code=500,
                detail="No se generaron archivos de salida",
            )

        zipfilename = generaterandomfilename("zip")
        zippath = os.path.join(TEMPDIR, zipfilename)

        with zipfile.ZipFile(zippath, "w", zipfile.ZIP_DEFLATED) as zipf:
            for outputfile in outputfiles:
                if os.path.exists(outputfile):
                    zipf.write(outputfile, os.path.basename(outputfile))

        if not os.path.exists(zippath):
            raise HTTPException(
                status_code=500,
                detail="El archivo ZIP no se generó correctamente",
            )

        # Remove temp files after response has been served
        return FileResponse(
            zippath,
            filename=zipfilename,
            media_type="application/zip",
            background=BackgroundTask(lambda: cleanuptempfiles([inputpath] + outputfiles + [zippath])),
        )
    except Exception as e:
        # Ensure temporaries removed on error
        cleanuptempfiles([inputpath] + outputfiles)
        raise HTTPException(
            status_code=500,
            detail=f"Error al dividir PDF: {str(e)}",
        )


# ---------------------------------------------------------
# Servicio de Conversión (multi-archivo)
# ---------------------------------------------------------
@app.post("/convert")
async def converttopdfendpoint(files: List[UploadFile] = File(...)):
    """
    Convertir uno o varios archivos a PDF.
    - Si se sube 1 archivo: se devuelve directamente el PDF.
    - Si se suben varios: se devuelven todos los PDFs en un ZIP.
    Soporta imágenes, TXT y Office.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No se recibieron archivos")

    allowedextensions = {
        ".jpg",
        ".jpeg",
        ".png",
        ".bmp",
        ".tiff",
        ".tif",
        ".txt",
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
        ".ppt",
        ".pptx",
    }

    inputpaths: List[str] = []
    outputpaths: List[str] = []

    try:
        # Guardar todos los archivos de entrada
        for upload in files:
            if not upload.filename:
                raise HTTPException(
                    status_code=400, detail="Nombre de archivo no válido"
                )

            fileext = os.path.splitext(upload.filename)[1].lower()

            if fileext not in allowedextensions:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Formato no soportado. Formatos permitidos: "
                        "JPG, JPEG, PNG, BMP, TIFF, TIF, TXT, "
                        "DOC, DOCX, XLS, XLSX, PPT, PPTX."
                    ),
                )

            tempid = str(uuid.uuid4())
            inputpath = os.path.join(TEMPDIR, f"{tempid}_input{fileext}")
            inputpaths.append(inputpath)

            async with aiofiles.open(inputpath, "wb") as outfile:
                content = await upload.read()
                await outfile.write(content)

        # Convertir todos a PDF
        for inputpath in inputpaths:
            outputfilename = generaterandomfilename("pdf")
            outputpath = os.path.join(TEMPDIR, outputfilename)
            converttopdf(inputpath, outputpath)

            if not os.path.exists(outputpath):
                raise HTTPException(
                    status_code=500,
                    detail="Uno de los archivos no se convirtió correctamente",
                )

            outputpaths.append(outputpath)

        # Si es solo un archivo, devolver directamente el PDF
        if len(outputpaths) == 1:
            # Serve single PDF and clean up after response
            return FileResponse(
                outputpaths[0],
                filename=os.path.basename(outputpaths[0]),
                media_type="application/pdf",
                background=BackgroundTask(lambda: cleanuptempfiles(inputpaths + outputpaths)),
            )

        # Si son varios, comprimir en ZIP
        zipfilename = generaterandomfilename("zip")
        zippath = os.path.join(TEMPDIR, zipfilename)

        with zipfile.ZipFile(zippath, "w", zipfile.ZIP_DEFLATED) as zipf:
            for pdfpath in outputpaths:
                zipf.write(pdfpath, os.path.basename(pdfpath))

        if not os.path.exists(zippath):
            raise HTTPException(
                status_code=500,
                detail="El archivo ZIP no se generó correctamente",
            )

        # Serve zip and clean up after response
        return FileResponse(
            zippath,
            filename=zipfilename,
            media_type="application/zip",
            background=BackgroundTask(lambda: cleanuptempfiles(inputpaths + outputpaths + [zippath])),
        )

    except HTTPException:
        # Ensure temporaries removed if HTTPException was raised earlier
        cleanuptempfiles(inputpaths + outputpaths)
        raise
    except Exception as e:
        # Ensure temporaries removed on unexpected error
        cleanuptempfiles(inputpaths + outputpaths)
        raise HTTPException(
            status_code=500,
            detail=f"Error al convertir archivos: {str(e)}",
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
