"""
Servicio para generar previsualizaciones (miniaturas) de PDFs
"""
import os
import base64
from typing import List, Optional
import fitz  # PyMuPDF


def get_pdf_page_count(pdf_path: str) -> int:
    """Obtener número total de páginas de un PDF"""
    doc = fitz.open(pdf_path)
    count = len(doc)
    doc.close()
    return count


def render_page_to_png(pdf_path: str, page_num: int = 0, zoom: float = 1.5) -> bytes:
    """
    Renderizar una página específica de un PDF a PNG.
    
    Args:
        pdf_path: Ruta del archivo PDF
        page_num: Número de página (0-indexed)
        zoom: Factor de zoom (1.0 = 72 DPI, 1.5 = 108 DPI, 2.0 = 144 DPI)
    
    Returns:
        Bytes de la imagen PNG
    """
    doc = fitz.open(pdf_path)
    
    if page_num < 0 or page_num >= len(doc):
        doc.close()
        raise ValueError(f"Página {page_num + 1} fuera de rango")
    
    try:
        # Renderizar página a imagen
        mat = fitz.Matrix(zoom, zoom)
        pix = doc[page_num].get_pixmap(matrix=mat, alpha=False)
        
        # Convertir a PNG en memoria
        png_bytes = pix.tobytes(output="png")
        return png_bytes
    finally:
        doc.close()


def render_all_pages_to_pngs(pdf_path: str, zoom: float = 1.5) -> List[bytes]:
    """
    Renderizar todas las páginas de un PDF a PNGs.
    
    Returns:
        Lista de bytes PNG (uno por página)
    """
    doc = fitz.open(pdf_path)
    pngs = []
    
    try:
        mat = fitz.Matrix(zoom, zoom)
        for page_num in range(len(doc)):
            pix = doc[page_num].get_pixmap(matrix=mat, alpha=False)
            png_bytes = pix.tobytes(output="png")
            pngs.append(png_bytes)
        
        return pngs
    finally:
        doc.close()


def render_page_to_base64(pdf_path: str, page_num: int = 0, zoom: float = 1.5) -> str:
    """
    Renderizar una página a base64 (para incrustar en HTML).
    
    Returns:
        String base64 con prefijo data URI
    """
    png_bytes = render_page_to_png(pdf_path, page_num, zoom)
    b64 = base64.b64encode(png_bytes).decode('utf-8')
    return f"data:image/png;base64,{b64}"


def get_pdf_info(pdf_path: str) -> dict:
    """
    Obtener información del PDF (páginas, tamaño, etc.)
    """
    doc = fitz.open(pdf_path)
    try:
        return {
            "page_count": len(doc),
            "file_size_bytes": os.path.getsize(pdf_path),
        }
    finally:
        doc.close()
