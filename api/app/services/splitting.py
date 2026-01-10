import os
import fitz  # PyMuPDF
from app.utils import generate_random_filename

def split_pdf(input_path: str, split_type: str, custom_parts: int = None, pages_per_part: int = None) -> list:
    """Dividir PDF según diferentes métodos con validación mejorada"""
    doc = fitz.open(input_path)
    total_pages = len(doc)
    output_files = []
    
    if total_pages == 0:
        doc.close()
        raise ValueError("El PDF no contiene páginas")
    
    try:
        if split_type == "individual_pages":
            # Una página por PDF
            for page_num in range(total_pages):
                output_filename = generate_random_filename("pdf")
                output_path = os.path.join(os.path.dirname(input_path), output_filename)
                
                try:
                    new_doc = fitz.open()
                    new_doc.insert_pdf(doc, from_page=page_num, to_page=page_num)
                    new_doc.save(output_path)
                    new_doc.close()
                    
                    if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                        output_files.append(output_path)
                except Exception as e:
                    raise ValueError(f"Error creando página {page_num + 1}: {str(e)}")
        
        elif split_type == "customparts" and custom_parts:
            # Dividir en N partes iguales
            if custom_parts < 1:
                raise ValueError("custom_parts debe ser al menos 1")
            
            if custom_parts > total_pages:
                custom_parts = total_pages
            
            pages_per_part_calc = total_pages // custom_parts
            remainder = total_pages % custom_parts
            
            start_page = 0
            for part in range(custom_parts):
                # Distribuir páginas restantes entre las primeras partes
                pages_in_this_part = pages_per_part_calc + (1 if part < remainder else 0)
                end_page = start_page + pages_in_this_part - 1
                
                output_filename = generate_random_filename("pdf")
                output_path = os.path.join(os.path.dirname(input_path), output_filename)
                
                try:
                    new_doc = fitz.open()
                    new_doc.insert_pdf(doc, from_page=start_page, to_page=end_page)
                    new_doc.save(output_path)
                    new_doc.close()
                    
                    if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                        output_files.append(output_path)
                except Exception as e:
                    raise ValueError(f"Error creando parte {part + 1}: {str(e)}")
                
                start_page = end_page + 1
        
        elif split_type == "pagesperpart" and pages_per_part:
            # Dividir por número de páginas por parte
            if pages_per_part < 1:
                raise ValueError("pages_per_part debe ser al menos 1")
            
            start_page = 0
            part_num = 1
            
            while start_page < total_pages:
                end_page = min(start_page + pages_per_part - 1, total_pages - 1)
                
                output_filename = generate_random_filename("pdf")
                output_path = os.path.join(os.path.dirname(input_path), output_filename)
                
                try:
                    new_doc = fitz.open()
                    new_doc.insert_pdf(doc, from_page=start_page, to_page=end_page)
                    new_doc.save(output_path)
                    new_doc.close()
                    
                    if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                        output_files.append(output_path)
                except Exception as e:
                    raise ValueError(f"Error creando parte {part_num}: {str(e)}")
                
                start_page = end_page + 1
                part_num += 1
        
        if not output_files:
            raise ValueError("No se generaron archivos de salida")
        
        return output_files
    
    finally:
        doc.close()


# Alias para compatibilidad con main.py
def splitpdf(input_path: str, split_type: str, custom_parts: int = None, pages_per_part: int = None) -> list:
    return split_pdf(input_path, split_type, custom_parts, pages_per_part)