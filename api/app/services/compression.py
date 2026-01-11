import os
import shutil
import subprocess
import fitz  # PyMuPDF
import pikepdf
from PIL import Image
import io
import math

# ============================================================
# CONFIGURACIÓN Y EXCEPCIONES
# ============================================================

class CompressionError(Exception):
    """Excepción unificada para errores de compresión controlados"""
    pass

# Mapeo de configuraciones según el modo solicitado
# DPI: Resolución de imágenes
# JPEG_QUALITY: Calidad de compresión visual
# GS_SETTING: Configuración de Ghostscript (si está disponible)
COMPRESSION_SETTINGS = {
    "baja":    {"dpi": 150, "jpeg_quality": 85, "gs_setting": "/prepress"}, # Alta calidad, poca compresión
    "media":   {"dpi": 120, "jpeg_quality": 75, "gs_setting": "/ebook"},    # Balanceado (Recomendado)
    "alta":    {"dpi": 96,  "jpeg_quality": 60, "gs_setting": "/screen"},   # Archivos web
    "extrema": {"dpi": 72,  "jpeg_quality": 50, "gs_setting": "/screen"}    # Máxima compresión posible
}

def human_size(size_bytes):
    """Formatea bytes a leíble por humanos"""
    if size_bytes == 0: return "0B"
    size_name = ("B", "KB", "MB", "GB")
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return "%s %s" % (s, size_name[i])

# ============================================================
# MOTORES DE COMPRESIÓN
# ============================================================

def engine_pikepdf_lossless(input_path, output_path):
    """
    MOTOR 1: Limpieza de metadatos y estructura (Sin pérdida).
    Rápido y seguro. Elimina basura del PDF.
    """
    try:
        with pikepdf.open(input_path) as pdf:
            pdf.remove_unreferenced_resources()
            pdf.save(output_path, compress_streams=True, object_stream_mode=pikepdf.ObjectStreamMode.generate)
        return True
    except Exception as e:
        print(f"[Engine PikePDF] Error: {e}")
        return False

def engine_ghostscript(input_path, output_path, mode="media"):
    """
    MOTOR 2: Ghostscript (Estándar industrial).
    Requiere tener 'gs' instalado en el servidor (sudo apt install ghostscript).
    """
    setting = COMPRESSION_SETTINGS[mode]["gs_setting"]
    
    # Comandos para Ghostscript
    gs_command = [
        "gs",
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        f"-dPDFSETTINGS={setting}",
        "-dNOPAUSE", 
        "-dQUIET", 
        "-dBATCH",
        "-dDetectDuplicateImages=true",
        "-dDownsampleColorImages=true",
        f"-dColorImageResolution={COMPRESSION_SETTINGS[mode]['dpi']}",
        "-sOutputFile=" + output_path,
        input_path
    ]

    try:
        result = subprocess.run(gs_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
        if result.returncode == 0 and os.path.exists(output_path):
            return True
        return False
    except FileNotFoundError:
        # Ghostscript no instalado
        return False
    except Exception as e:
        print(f"[Engine Ghostscript] Error: {e}")
        return False

def engine_pymupdf_images(input_path, output_path, mode="media"):
    """
    MOTOR 3: PyMuPDF Avanzado (Python puro).
    Recorre el PDF, busca imágenes, las reduce de tamaño y las reemplaza.
    NO toca el texto (mantiene la calidad vectorial).
    """
    try:
        doc = fitz.open(input_path)
        settings = COMPRESSION_SETTINGS[mode]
        target_dpi = settings["dpi"]
        quality = settings["jpeg_quality"]
        
        # Optimización: Solo procesar si el archivo es grande o tiene muchas imágenes
        processed_something = False

        for page_num in range(len(doc)):
            page = doc[page_num]
            images = page.get_images(full=True)

            # Si hay muchas imágenes en una página, iteramos
            for img_info in images:
                xref = img_info[0]
                
                # Obtener imagen original
                base_image = doc.extract_image(xref)
                if not base_image: continue
                
                image_bytes = base_image["image"]
                
                # Abrir con PIL para verificar tamaño
                try:
                    img = Image.open(io.BytesIO(image_bytes))
                    w, h = img.size
                    
                    # Calcular DPI actual aproximado (asumiendo tamaño estándar)
                    # Si la imagen es muy pequeña, no vale la pena comprimirla
                    if w < 500 and h < 500:
                        continue

                    # Redimensionar si es necesario
                    # La lógica es: si reducirla ahorra espacio, hazlo.
                    
                    img_format = "JPEG"
                    if img.mode in ("P", "RGBA"):
                        img = img.convert("RGB")
                    
                    buffer = io.BytesIO()
                    img.save(buffer, format=img_format, quality=quality, optimize=True)
                    new_bytes = buffer.getvalue()
                    
                    # Solo reemplazar si el nuevo tamaño es menor
                    if len(new_bytes) < len(image_bytes):
                        doc.update_stream(xref, new_bytes)
                        processed_something = True
                        
                except Exception as e:
                    # Si falla una imagen, saltarla y seguir
                    continue

        if processed_something:
            doc.save(output_path, garbage=4, deflate=True)
        else:
            # Si no hicimos nada, guardamos con limpieza básica
            doc.save(output_path, garbage=3, deflate=True)
            
        doc.close()
        return True
    except Exception as e:
        print(f"[Engine PyMuPDF] Error: {e}")
        return False

# ============================================================
# LÓGICA PRINCIPAL DE NEGOCIO
# ============================================================

def compress_pdf(input_path: str, output_path: str, mode: str = "media"):
    """
    Función principal lista para producción.
    Estrategia en cascada: intenta el mejor método, si falla o no comprime, baja al siguiente.
    """
    # 1. Validación básica de entrada
    if not os.path.exists(input_path):
        raise ValueError("El archivo de entrada no existe.")
    
    if mode not in COMPRESSION_SETTINGS:
        mode = "media" # Fallback a media

    original_size = os.path.getsize(input_path)
    temp_output = output_path + ".tmp"
    
    print(f"🚀 Iniciando compresión: {os.path.basename(input_path)} ({human_size(original_size)}) | Modo: {mode}")

    # --- ESTRATEGIA 1: Ghostscript (Mejor balance Calidad/Peso) ---
    success = engine_ghostscript(input_path, temp_output, mode)
    
    # Verificación Estrategia 1
    if success and os.path.exists(temp_output):
        new_size = os.path.getsize(temp_output)
        # Si GS funcionó y redujo el tamaño, usamos ese
        if new_size < original_size:
            shutil.move(temp_output, output_path)
            print(f"✅ Éxito con Ghostscript. Reducción: {100 - (new_size/original_size*100):.1f}%")
            return True
        else:
            print("⚠️ Ghostscript no logró reducir el tamaño.")
            os.remove(temp_output) # Limpiar
    
    # --- ESTRATEGIA 2: PyMuPDF (Optimización de imágenes interna) ---
    # Si GS falló o no redujo, intentamos procesar imágenes una por una con Python
    print("🔄 Intentando motor PyMuPDF (Python nativo)...")
    success = engine_pymupdf_images(input_path, temp_output, mode)

    if success and os.path.exists(temp_output):
        new_size = os.path.getsize(temp_output)
        if new_size < original_size:
            shutil.move(temp_output, output_path)
            print(f"✅ Éxito con PyMuPDF. Reducción: {100 - (new_size/original_size*100):.1f}%")
            return True
        else:
            print("⚠️ PyMuPDF tampoco logró reducir el tamaño significativamente.")
            os.remove(temp_output)

    # --- ESTRATEGIA 3: PikePDF (Último recurso, limpieza sin pérdida) ---
    # Si todo lo anterior falló o aumentó el tamaño, intentamos solo limpiar metadatos
    print("🧹 Intentando limpieza sin pérdida (PikePDF)...")
    success = engine_pikepdf_lossless(input_path, temp_output)
    
    if success and os.path.exists(temp_output):
        new_size = os.path.getsize(temp_output)
        if new_size < original_size:
            shutil.move(temp_output, output_path)
            print("✅ Limpieza completada.")
            return True
        os.remove(temp_output)

    # --- FALLBACK FINAL: Devolver original ---
    # Si NADA funcionó para reducir el tamaño, copiamos el original.
    # Esto evita el error de "archivo corrupto" o "no procesado".
    print("⚠️ No se pudo comprimir más el archivo. Devolviendo original.")
    shutil.copy2(input_path, output_path)
    return True

def get_compression_estimates(input_path: str) -> dict:
    """
    Genera estimaciones basadas en estadística, no en procesamiento real (para velocidad).
    """
    if not os.path.exists(input_path):
        return {}
        
    size = os.path.getsize(input_path)
    
    # Factores conservadores para no prometer de más
    factors = {
        "baja": 0.90,    # ~10% reducción
        "media": 0.75,   # ~25% reducción
        "alta": 0.50,    # ~50% reducción
        "extrema": 0.35  # ~65% reducción
    }
    
    estimates = {}
    for mode, factor in factors.items():
        est_size = int(size * factor)
        estimates[mode] = {
            "size_bytes": est_size,
            "size_human": human_size(est_size),
            "reduction_percent": int((1 - factor) * 100)
        }
    
    return estimates

# ALIASES PARA COMPATIBILIDAD CON TU API EXISTENTE
def getcompressionestimates(input_path: str) -> dict:
    return get_compression_estimates(input_path)

def compresspdf(input_path: str, output_path: str, mode: str = "media"):
    return compress_pdf(input_path, output_path, mode)

# Bloque de prueba simple si ejecutas el script directamente
if __name__ == "__main__":
    # Crea un archivo dummy para probar si no existe
    test_file = "test_doc.pdf"
    if not os.path.exists(test_file):
        print(f"Crea un archivo {test_file} para probar.")
    else:
        try:
            compress_pdf(test_file, "resultado_comprimido.pdf", "media")
        except Exception as e:
            print(f"Error fatal: {e}")