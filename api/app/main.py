import os
import uuid
import zipfile
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from starlette.background import BackgroundTask
from fastapi.middleware.cors import CORSMiddleware
import aiofiles

from app.services.compression import compresspdf, getcompressionestimates
from app.services.merging import mergepdfs
from app.services.splitting import splitpdf, split_pdf_by_pages
from app.services.conversion import converttopdf
from app.services.preview import render_page_to_png, get_pdf_page_count, get_pdf_info
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


# ---------------------------------------------------------
# Servicio de Conversión Mejorado - Merge o ZIP
# ---------------------------------------------------------
@app.post("/convert-merge-zip")
async def convertwithmergeorzipendpoint(
    files: List[UploadFile] = File(...),
    merge_mode: str = Form("zip"),  # "merge" o "zip"
):
    """
    Convertir uno o varios archivos a PDF con opción de unir o descargar como ZIP.
    - merge_mode="merge": Si hay múltiples PDFs, unirlos en uno solo
    - merge_mode="zip": Devolver todos en un ZIP (comportamiento por defecto)
    """
    if not files:
        raise HTTPException(status_code=400, detail="No se recibieron archivos")

    if merge_mode not in ["merge", "zip"]:
        raise HTTPException(
            status_code=400,
            detail="merge_mode debe ser 'merge' o 'zip'",
        )

    allowedextensions = {
        ".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif",
        ".txt", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    }

    inputpaths: List[str] = []
    outputpaths: List[str] = []

    try:
        # Guardar y convertir todos los archivos
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
            return FileResponse(
                outputpaths[0],
                filename=os.path.basename(outputpaths[0]),
                media_type="application/pdf",
                background=BackgroundTask(lambda: cleanuptempfiles(inputpaths + outputpaths)),
            )

        # Si son varios y merge_mode="merge", unir en un solo PDF
        if merge_mode == "merge" and len(outputpaths) > 1:
            mergedfilename = generaterandomfilename("pdf")
            mergedpath = os.path.join(TEMPDIR, mergedfilename)
            mergepdfs(outputpaths, mergedpath)

            if not os.path.exists(mergedpath):
                raise HTTPException(
                    status_code=500,
                    detail="No se pudo unir los PDFs",
                )

            return FileResponse(
                mergedpath,
                filename=mergedfilename,
                media_type="application/pdf",
                background=BackgroundTask(lambda: cleanuptempfiles(inputpaths + outputpaths + [mergedpath])),
            )

        # Si son varios y merge_mode="zip", devolver en ZIP
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

        return FileResponse(
            zippath,
            filename=zipfilename,
            media_type="application/zip",
            background=BackgroundTask(lambda: cleanuptempfiles(inputpaths + outputpaths + [zippath])),
        )

    except HTTPException:
        cleanuptempfiles(inputpaths + outputpaths)
        raise
    except Exception as e:
        cleanuptempfiles(inputpaths + outputpaths)
        raise HTTPException(
            status_code=500,
            detail=f"Error al convertir archivos: {str(e)}",
        )


# ---------------------------------------------------------
# Servicio de División Mejorado - Seleccionar páginas específicas
# ---------------------------------------------------------
@app.post("/split-select-pages")
async def splitbyselectpagesendpoint(
    file: UploadFile = File(...),
    pages: str = Form(...),  # "1,3,5-7,10" (índices 1-based)
):
    """
    Dividir PDF extrayendo solo las páginas seleccionadas.
    pages: string con formato "1,3,5-7,10" (números de página comienzan en 1)
    Devuelve: un PDF con las páginas seleccionadas
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")

    if not pages.strip():
        raise HTTPException(status_code=400, detail="Debes especificar al menos una página")

    tempid = str(uuid.uuid4())
    inputpath = os.path.join(TEMPDIR, f"{tempid}_input.pdf")

    async with aiofiles.open(inputpath, "wb") as outfile:
        content = await file.read()
        await outfile.write(content)

    try:
        # Parsear string de páginas: "1,3,5-7,10"
        pages_list = []
        for part in pages.split(","):
            part = part.strip()
            if "-" in part:
                # Rango: "5-7" → [5, 6, 7]
                start, end = part.split("-")
                start, end = int(start.strip()), int(end.strip())
                pages_list.extend(range(start, end + 1))
            else:
                # Página individual
                pages_list.append(int(part))

        # Convertir a índices 0-based y remover duplicados, mantener orden
        pages_0based = sorted(set([p - 1 for p in pages_list]))

        # Validar que todas las páginas estén en rango
        total_pages = get_pdf_page_count(inputpath)
        for page_idx in pages_0based:
            if page_idx < 0 or page_idx >= total_pages:
                raise ValueError(f"Página {page_idx + 1} está fuera del rango (1-{total_pages})")

        # Extraer páginas
        outputfilename = generaterandomfilename("pdf")
        outputpath = os.path.join(TEMPDIR, outputfilename)
        outputpath = split_pdf_by_pages(inputpath, pages_0based)

        if not os.path.exists(outputpath):
            raise HTTPException(
                status_code=500,
                detail="No se generó el PDF con las páginas seleccionadas",
            )

        return FileResponse(
            outputpath,
            filename=outputfilename,
            media_type="application/pdf",
            background=BackgroundTask(lambda: cleanuptempfiles([inputpath, outputpath])),
        )

    except ValueError as ve:
        cleanuptempfiles([inputpath])
        raise HTTPException(status_code=400, detail=f"Error en formato de páginas: {str(ve)}")
    except Exception as e:
        cleanuptempfiles([inputpath])
        raise HTTPException(
            status_code=500,
            detail=f"Error al dividir PDF: {str(e)}",
        )


# ---------------------------------------------------------
# Servicio de Previsualizaciones - Miniaturas de PDF
# ---------------------------------------------------------
@app.post("/preview-upload")
async def previewuploadendpoint(file: UploadFile = File(...)):
    """
    Subir un PDF y obtener información sobre él e imagen de primera página.
    Devuelve: JSON con page_count, file_size y PNG base64 de primera página
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")

    tempid = str(uuid.uuid4())
    inputpath = os.path.join(TEMPDIR, f"{tempid}_preview.pdf")

    async with aiofiles.open(inputpath, "wb") as outfile:
        content = await file.read()
        await outfile.write(content)

    try:
        # Obtener información del PDF
        info = get_pdf_info(inputpath)

        # Generar miniatura de la primera página
        png_bytes = render_page_to_png(inputpath, page_num=0, zoom=1.5)

        # Convertir a base64
        import base64
        b64 = base64.b64encode(png_bytes).decode("utf-8")

        response = {
            "file_id": tempid,
            "page_count": info["page_count"],
            "file_size_bytes": info["file_size_bytes"],
            "thumbnail_base64": f"data:image/png;base64,{b64}",
        }

        # Limpiar archivo temporal después de enviar respuesta
        return response

    except Exception as e:
        cleanuptempfiles([inputpath])
        raise HTTPException(
            status_code=500,
            detail=f"Error al procesar PDF: {str(e)}",
        )


@app.get("/preview/{file_id}")
async def getpreviewendpoint(
    file_id: str,
    page: int = Query(0, ge=0),
):
    """
    Obtener miniatura PNG de una página específica de un PDF precargado.
    file_id: ID temporal retornado por /preview-upload
    page: número de página (0-indexed)
    """
    inputpath = os.path.join(TEMPDIR, f"{file_id}_preview.pdf")

    if not os.path.exists(inputpath):
        raise HTTPException(status_code=404, detail="Archivo no encontrado o expiró")

    try:
        png_bytes = render_page_to_png(inputpath, page_num=page, zoom=1.5)
        return StreamingResponse(iter([png_bytes]), media_type="image/png")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar miniatura: {str(e)}",
        )


@app.get("/preview-info/{file_id}")
async def getpreviewinfoendpoint(file_id: str):
    """
    Obtener información del PDF (número de páginas, tamaño).
    """
    inputpath = os.path.join(TEMPDIR, f"{file_id}_preview.pdf")

    if not os.path.exists(inputpath):
        raise HTTPException(status_code=404, detail="Archivo no encontrado o expiró")

    try:
        info = get_pdf_info(inputpath)
        return {"file_id": file_id, **info}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener información: {str(e)}",
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
