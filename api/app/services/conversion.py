import os
import subprocess
from typing import List

from PIL import Image
import fitz  # PyMuPDF


def _convert_office_to_pdf(input_path: str, output_dir: str) -> str:
    """
    Convierte archivos de Office (Word, Excel, PowerPoint) a PDF usando LibreOffice.
    Retorna la ruta del PDF generado.
    """
    # LibreOffice generará el PDF en output_dir con el mismo nombre base
    cmd = [
        "soffice",
        "--headless",
        "--convert-to",
        "pdf",
        "--outdir",
        output_dir,
        input_path,
    ]

    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except subprocess.CalledProcessError as e:
        raise ValueError(f"Error al convertir archivo de Office a PDF: {e}")  # noqa: E501

    base_name = os.path.splitext(os.path.basename(input_path))[0]
    pdf_path = os.path.join(output_dir, f"{base_name}.pdf")

    if not os.path.exists(pdf_path):
        raise ValueError("No se generó el PDF a partir del archivo de Office.")

    return pdf_path


def converttopdf(input_path: str, output_path: str) -> None:
    """
    Convertir diferentes tipos de archivos a PDF.
    Soporta:
      - Imágenes: JPG, JPEG, PNG, BMP, TIFF, TIF
      - Texto: TXT
      - Office: DOC, DOCX, XLS, XLSX, PPT, PPTX
    """
    fileext = os.path.splitext(input_path)[1].lower()

    image_exts = [".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif"]
    text_exts = [".txt"]
    office_exts = [".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"]

    # Imágenes -> PDF
    if fileext in image_exts:
        try:
            image = Image.open(input_path)
            if image.mode != "RGB":
                image = image.convert("RGB")
            image.save(output_path, "PDF", resolution=100.0)
            return
        except Exception as e:
            raise ValueError(f"Error al convertir imagen: {str(e)}")

    # TXT -> PDF (usando PyMuPDF)
    if fileext in text_exts:
        doc = fitz.open()
        try:
            try:
                with open(input_path, "r", encoding="utf-8") as f:
                    text = f.read()
            except UnicodeDecodeError:
                with open(input_path, "r", encoding="latin-1") as f:
                    text = f.read()

            page = doc.new_page()
            margin = 50
            rect = fitz.Rect(
                margin,
                margin,
                page.rect.width - margin,
                page.rect.height - margin,
            )
            page.insert_textbox(rect, text, fontsize=11, align=0)
            doc.save(output_path)
            return
        except Exception as e:
            raise ValueError(f"Error al convertir texto a PDF: {str(e)}")
        finally:
            doc.close()

    # Office -> PDF (usando LibreOffice)
    if fileext in office_exts:
        output_dir = os.path.dirname(output_path) or "."
        pdf_temp = _convert_office_to_pdf(input_path, output_dir)

        # Renombrar/mover al output_path esperado
        os.replace(pdf_temp, output_path)
        return

    # Si no está en ninguno de los grupos
    raise ValueError(
        f"Formato no soportado {fileext}. "
        "Formatos soportados: imágenes (JPG, PNG, BMP, TIFF), "
        "texto (TXT) y Office (DOC, DOCX, XLS, XLSX, PPT, PPTX)."
    )
