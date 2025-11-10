import os
from PIL import Image
import fitz  # PyMuPDF

def convert_to_pdf(input_path: str, output_path: str):
    """Convertir diferentes tipos de archivos a PDF"""
    file_ext = os.path.splitext(input_path.lower())[1]
    
    if file_ext in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif']:
        # Convertir imagen a PDF
        try:
            image = Image.open(input_path)
            if image.mode != 'RGB':
                image = image.convert('RGB')
            image.save(output_path, "PDF", resolution=100.0)
            return
        except Exception as e:
            raise ValueError(f"Error al convertir imagen: {str(e)}")
    
    elif file_ext in ['.txt']:
        # Convertir texto a PDF
        doc = fitz.open()
        try:
            with open(input_path, 'r', encoding='utf-8') as f:
                text = f.read()
        except UnicodeDecodeError:
            with open(input_path, 'r', encoding='latin-1') as f:
                text = f.read()
        
        # Crear página con el texto
        page = doc.new_page()
        # Configurar márgenes
        margin = 50
        rect = fitz.Rect(margin, margin, page.rect.width - margin, page.rect.height - margin)
        page.insert_textbox(rect, text, fontsize=11, align=0)
        doc.save(output_path)
        doc.close()
        return
    
    else:
        raise ValueError(f"Formato no soportado: {file_ext}. Formatos soportados: imágenes (JPG, PNG, BMP, TIFF) y texto (TXT)")