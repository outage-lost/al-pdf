import os
import tempfile
import shutil
from PIL import Image
import fitz  # PyMuPDF
import pikepdf
from app.utils import human_size
import gc



def get_compression_estimates(input_path: str) -> dict:
    """Obtener estimaciones de tamaño para diferentes niveles de compresión"""
    original_size = os.path.getsize(input_path)
    
    # Factores de compresión REALISTAS basados en calidad
    compression_factors = {
        "baja": 0.6,     # 40% de reducción - alta calidad
        "media": 0.35,   # 65% de reducción - buena calidad  
        "alta": 0.25,    # 75% de reducción - calidad decente
        "extrema": 0.15  # 85% de reducción - legible pero comprimido
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

def analyze_pdf_content(input_path: str):
    """Analizar contenido del PDF para ajustar compresión inteligentemente"""
    try:
        doc = fitz.open(input_path)
        total_pages = len(doc)
        
        # Analizar primeras 5 páginas para determinar tipo
        text_pages = 0
        image_pages = 0
        
        for i in range(min(5, total_pages)):
            page = doc[i]
            text = page.get_text()
            
            if len(text.strip()) > 100:  # Tiene texto significativo
                text_pages += 1
            else:  # Probablemente imágenes/dibujos
                image_pages += 1
        
        doc.close()
        
        # Determinar tipo de documento
        if text_pages > image_pages:
            return "texto"  # Documento con mucho texto
        else:
            return "imagen"  # Documento con muchas imágenes/dibujos
            
    except:
        return "mixto"

def compress_pdf_direct(input_path: str, output_path: str, dpi: int, quality: int, doc_type: str):
    """Método directo para archivos pequeños (<10MB) - CORREGIDO"""
    
    print("🔄 Usando método directo...")
    
    # Guardar tamaño original para mostrar después
    original_size = os.path.getsize(input_path)
    
    try:
        # Primero optimizar con pikepdf
        temp_pdf = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        temp_path = temp_pdf.name
        temp_pdf.close()
        
        try:
            with pikepdf.open(input_path) as pdf:
                pdf.save(temp_path, compress_streams=True)
        except:
            shutil.copy2(input_path, temp_path)
        
        # Rasterizar con configuración específica
        doc = fitz.open(temp_path)
        total_pages = len(doc)
        new_doc = fitz.open()
        
        for page_num in range(total_pages):
            page = doc[page_num]
            
            # Escalar según DPI
            zoom = dpi / 72
            matrix = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=matrix, alpha=False)
            
            # Archivo temporal
            with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp_img:
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                
                # Para documentos con texto, usar PNG para mantener calidad
                if doc_type == "texto" and quality >= 70:
                    # PNG para texto - sin pérdida
                    img.save(tmp_img.name, "PNG", optimize=True)
                else:
                    # JPEG con calidad ajustada
                    img.save(tmp_img.name, "JPEG", quality=quality, optimize=True)
                
                # Crear página en nuevo PDF
                width = pix.width * 72 / dpi
                height = pix.height * 72 / dpi
                rect = fitz.Rect(0, 0, width, height)
                
                page_new = new_doc.new_page(width=rect.width, height=rect.height)
                page_new.insert_image(rect, filename=tmp_img.name)
                
                # Limpiar
                os.unlink(tmp_img.name)
            
            # Liberar memoria
            del pix
            
        # Guardar con compresión
        new_doc.save(
            output_path,
            garbage=4,
            deflate=True,
            clean=True
        )
        
        new_doc.close()
        doc.close()
        os.unlink(temp_path)
        
        # Resultados
        compressed_size = os.path.getsize(output_path)
        print(f"✅ COMPRESIÓN COMPLETADA")
        print(f"📊 Resultado: {original_size / 1024 / 1024:.1f} MB → {compressed_size / 1024 / 1024:.1f} MB")
        print(f"📈 Reducción: {(1 - compressed_size/original_size) * 100:.1f}%")
        
        return True
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        # Fallback
        try:
            shutil.copy2(input_path, output_path)
        except:
            pass
        raise

def compress_pdf_batch_smart(input_path: str, output_path: str, dpi: int, quality: int, doc_type: str):
    """Método por lotes inteligente para archivos grandes"""
    
    print("🔄 Usando método por lotes inteligente...")
    
    # Guardar tamaño original
    original_size = os.path.getsize(input_path)
    
    doc = fitz.open(input_path)
    total_pages = len(doc)
    
    # Crear directorio temporal
    temp_dir = tempfile.mkdtemp()
    image_paths = []
    
    try:
        # Procesar en lotes para evitar "too many open files"
        batch_size = 50  # Más pequeño para seguridad
        image_counter = 0
        
        for batch_start in range(0, total_pages, batch_size):
            batch_end = min(batch_start + batch_size, total_pages)
            print(f"📦 Lote {batch_start//batch_size + 1}: páginas {batch_start+1} a {batch_end}")
            
            # Procesar este lote
            for page_num in range(batch_start, batch_end):
                page = doc[page_num]
                
                # Analizar página individualmente
                page_text = page.get_text()
                is_text_page = len(page_text.strip()) > 50
                
                # Escalar
                zoom = dpi / 72
                matrix = fitz.Matrix(zoom, zoom)
                pix = page.get_pixmap(matrix=matrix, alpha=False)
                
                # Guardar imagen
                img_path = os.path.join(temp_dir, f"page_{image_counter:06d}")
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                
                # Decisión inteligente por página:
                if is_text_page and quality >= 60:
                    # Página con texto: PNG para mejor calidad
                    img_path += ".png"
                    img.save(img_path, "PNG", optimize=True, compress_level=9)
                else:
                    # Página con imágenes: JPEG con calidad ajustada
                    img_path += ".jpg"
                    # Asegurar calidad mínima para legibilidad
                    actual_quality = max(50, quality)  # Mínimo 50% para JPEG
                    img.save(img_path, "JPEG", quality=actual_quality, optimize=True)
                
                image_paths.append(img_path)
                image_counter += 1
                
                # Limpiar memoria
                del pix
                if page_num % 20 == 0:
                    gc.collect()
            
            # Cerrar y liberar memoria del lote
            gc.collect()
        
        # Crear PDF desde imágenes
        print(f"📄 Creando PDF desde {len(image_paths)} imágenes...")
        
        if image_paths:
            # Abrir primera imagen
            first_img = Image.open(image_paths[0])
            
            # Guardar todas como PDF
            save_kwargs = {
                "save_all": True,
                "append_images": [Image.open(img) for img in image_paths[1:]],
                "optimize": True
            }
            
            # Añadir calidad solo para JPEG
            if image_paths[0].endswith('.jpg'):
                save_kwargs["quality"] = max(50, quality)
            
            first_img.save(output_path, "PDF", **save_kwargs)
            
            print(f"✅ PDF creado exitosamente")
        
        # Limpiar archivos temporales
        for img_path in image_paths:
            if os.path.exists(img_path):
                os.unlink(img_path)
        
        if os.path.exists(temp_dir):
            try:
                os.rmdir(temp_dir)
            except:
                pass
        
        doc.close()
        
        # Resultados
        compressed_size = os.path.getsize(output_path)
        
        print(f"📊 RESULTADO FINAL:")
        print(f"   Original: {original_size / 1024 / 1024:.1f} MB")
        print(f"   Comprimido: {compressed_size / 1024 / 1024:.1f} MB")
        print(f"   Reducción: {(1 - compressed_size/original_size) * 100:.1f}%")
        print(f"   Calidad: {'BUENA' if quality >= 70 else 'ACEPTABLE' if quality >= 60 else 'COMPRIMIDA'}")
        
        return True
        
    except Exception as e:
        print(f"❌ ERROR en compresión por lotes: {e}")
        # Limpieza en caso de error
        try:
            for img_path in image_paths:
                if os.path.exists(img_path):
                    os.unlink(img_path)
            if os.path.exists(temp_dir):
                os.rmdir(temp_dir)
        except:
            pass
        doc.close()
        raise

def compress_pdf_balanced(input_path: str, output_path: str, mode: str = "media"):
    """Compresión BALANCEADA - mantiene legibilidad para notas/documentos"""
    
    print(f"🔧 COMPRESIÓN BALANCEADA: {os.path.basename(input_path)}")
    print(f"📊 Modo: {mode}")
    original_size = os.path.getsize(input_path)
    print(f"📁 Tamaño original: {original_size / 1024 / 1024:.1f} MB")
    
    # Analizar tipo de documento
    doc_type = analyze_pdf_content(input_path)
    print(f"📄 Tipo de documento detectado: {doc_type}")
    
    # CONFIGURACIONES BALANCEADAS - BASADAS EN TU CASO DE USO
    if doc_type == "texto":
        # Documentos con mucho texto: mantener DPI alto, calidad media
        dpi_dict = {
            "baja": 200,     # Excelente calidad
            "media": 150,    # Buena calidad para lectura
            "alta": 120,     # Calidad decente
            "extrema": 100   # Legible pero comprimido
        }
        quality_dict = {
            "baja": 90,      # JPEG 90%
            "media": 80,     # JPEG 80%  
            "alta": 70,      # JPEG 70%
            "extrema": 60    # JPEG 60% - legible
        }
    elif doc_type == "imagen":
        # Documentos con imágenes/dibujos: DPI medio, calidad ajustada
        dpi_dict = {
            "baja": 150,     # Buena calidad imágenes
            "media": 120,    # Calidad decente
            "alta": 100,     # Aceptable
            "extrema": 80    # Compromiso calidad/tamaño
        }
        quality_dict = {
            "baja": 85,      # JPEG 85%
            "media": 75,     # JPEG 75%
            "alta": 65,      # JPEG 65%
            "extrema": 55    # JPEG 55% - imágenes visibles
        }
    else:
        # Documento mixto: balance entre texto e imágenes
        dpi_dict = {
            "baja": 180,     # Buena calidad general
            "media": 140,    # Balanceado
            "alta": 110,     # Compromiso
            "extrema": 90    # Compresión mayor pero legible
        }
        quality_dict = {
            "baja": 88,      # JPEG 88%
            "media": 78,     # JPEG 78%
            "alta": 68,      # JPEG 68%
            "extrema": 58    # JPEG 58% - balanceado
        }
    
    dpi = dpi_dict.get(mode, 150)
    quality = quality_dict.get(mode, 75)
    
    print(f"⚙️  Configuración inteligente: DPI={dpi}, Calidad JPEG={quality}%")
    
    # Para archivos pequeños (<10MB), usar método directo
    if original_size < 10 * 1024 * 1024:
        return compress_pdf_direct(input_path, output_path, dpi, quality, doc_type)
    else:
        # Para archivos grandes, usar método por lotes
        return compress_pdf_batch_smart(input_path, output_path, dpi, quality, doc_type)

def compress_pdf(input_path: str, output_path: str, mode: str = "media"):
    """Función principal - compresión inteligente y balanceada"""
    
    # Tamaño original
    file_size = os.path.getsize(input_path)
    
    # Para archivos muy grandes con modo extrema, limitar páginas
    if mode == "extrema" and file_size > 50 * 1024 * 1024:
        print("⚠️  Archivo muy grande para compresión extrema, usando configuración especial...")
        # Usar compresión balanceada en lugar de extrema destructiva
        return compress_pdf_balanced(input_path, output_path, "alta")
    
    # Usar compresión balanceada para todos los casos
    return compress_pdf_balanced(input_path, output_path, mode)

# ALIASES - IMPORTANTE
def getcompressionestimates(input_path: str) -> dict:
    return get_compression_estimates(input_path)

def compresspdf(input_path: str, output_path: str, mode: str = "media"):
    return compress_pdf(input_path, output_path, mode)