import os
import fitz  # PyMuPDF
from app.utils import generate_random_filename

def split_pdf(input_path: str, split_type: str, custom_parts: int = None, pages_per_part: int = None) -> list:
    """Dividir PDF según diferentes métodos"""
    doc = fitz.open(input_path)
    total_pages = len(doc)
    output_files = []
    
    try:
        if split_type == "individual_pages":
            # Una página por PDF
            for page_num in range(total_pages):
                output_filename = generate_random_filename("pdf")
                output_path = os.path.join(os.path.dirname(input_path), output_filename)
                
                new_doc = fitz.open()
                new_doc.insert_pdf(doc, from_page=page_num, to_page=page_num)
                new_doc.save(output_path)
                new_doc.close()
                
                output_files.append(output_path)
        
        elif split_type == "custom_parts" and custom_parts:
            # Dividir en N partes iguales
            if custom_parts > total_pages:
                custom_parts = total_pages
            
            pages_per_part = total_pages // custom_parts
            remainder = total_pages % custom_parts
            
            start_page = 0
            for part in range(custom_parts):
                end_page = start_page + pages_per_part - 1
                if part < remainder:
                    end_page += 1
                
                # Asegurarse de no exceder el total de páginas
                if end_page >= total_pages:
                    end_page = total_pages - 1
                if start_page >= total_pages:
                    break
                
                output_filename = generate_random_filename("pdf")
                output_path = os.path.join(os.path.dirname(input_path), output_filename)
                
                new_doc = fitz.open()
                new_doc.insert_pdf(doc, from_page=start_page, to_page=end_page)
                new_doc.save(output_path)
                new_doc.close()
                
                output_files.append(output_path)
                start_page = end_page + 1
        
        elif split_type == "pages_per_part" and pages_per_part:
            # Dividir por número de páginas por parte
            start_page = 0
            part_num = 1
            
            while start_page < total_pages:
                end_page = min(start_page + pages_per_part - 1, total_pages - 1)
                
                output_filename = generate_random_filename("pdf")
                output_path = os.path.join(os.path.dirname(input_path), output_filename)
                
                new_doc = fitz.open()
                new_doc.insert_pdf(doc, from_page=start_page, to_page=end_page)
                new_doc.save(output_path)
                new_doc.close()
                
                output_files.append(output_path)
                start_page = end_page + 1
                part_num += 1
        
        return output_files
    
    finally:
        doc.close()