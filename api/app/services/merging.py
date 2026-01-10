import fitz  # PyMuPDF
from app.utils import generate_random_filename

def merge_pdfs(input_paths: list, output_path: str):
    """Unir múltiples PDFs en uno solo"""
    merged_doc = fitz.open()
    
    for input_path in input_paths:
        doc = fitz.open(input_path)
        merged_doc.insert_pdf(doc)
        doc.close()
    
    merged_doc.save(output_path, garbage=4, deflate=True, clean=True)
    merged_doc.close()


# Alias para compatibilidad con main.py
def mergepdfs(input_paths: list, output_path: str):
    return merge_pdfs(input_paths, output_path)