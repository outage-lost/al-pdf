import os
import tempfile
from PIL import Image
import fitz  # PyMuPDF
import pikepdf
from app.utils import human_size

def get_compression_estimates(input_path: str) -> dict:
    """Obtener estimaciones de tamaño para diferentes niveles de compresión"""
    original_size = os.path.getsize(input_path)
    
    # Factores de compresión estimados basados en la calidad
    compression_factors = {
        "baja": 0.7,    # 30% de reducción
        "media": 0.5,   # 50% de reducción
        "alta": 0.3,    # 70% de reducción
        "extrema": 0.2  # 80% de reducción
    }
    
    estimates = {}
    for quality, factor in compression_factors.items():
        estimated_size = original_size * factor
        estimates[quality] = {
            "size_bytes": int(estimated_size),
            "size_human": human_size(estimated_size),
            "reduction_percent": int((1 - factor) * 100)
        }
    
    return estimates

def compress_pdf(input_path: str, output_path: str, mode: str = "media"):
    """Comprimir PDF usando rasterización con diferentes calidades"""
    
    # Configuraciones por modo
    dpi_dict = {"baja": 200, "media": 150, "alta": 100, "extrema": 72}
    quality_dict = {"baja": 90, "media": 75, "alta": 60, "extrema": 40}
    
    dpi = dpi_dict.get(mode, 150)
    quality = quality_dict.get(mode, 75)
    
    try:
        # Primero optimizar con pikepdf
        with pikepdf.open(input_path) as pdf:
            pdf.save(output_path)
    except Exception as e:
        # Si falla pikepdf, continuar con el archivo original
        import shutil
        shutil.copy2(input_path, output_path)
    
    # Rasterizar páginas
    doc = fitz.open(output_path)
    new_doc = fitz.open()
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        pix = page.get_pixmap(matrix=fitz.Matrix(dpi/72, dpi/72), alpha=False)
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp_img:
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            img.save(tmp_img.name, "JPEG", quality=quality, optimize=True)
            
            rect = fitz.Rect(0, 0, pix.width * 72/dpi, pix.height * 72/dpi)
            page_new = new_doc.new_page(width=rect.width, height=rect.height)
            page_new.insert_image(rect, filename=tmp_img.name)
        
        os.unlink(tmp_img.name)
    
    new_doc.save(output_path, garbage=4, deflate=True, clean=True)
    new_doc.close()
    doc.close()