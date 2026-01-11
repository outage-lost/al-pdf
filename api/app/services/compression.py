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
    """
    Se lanza cuando ocurre un error técnico (librerías faltantes, corrupción).
    """
    pass

class OptimizationFailure(Exception):
    """
    Se lanza cuando el archivo NO se pudo reducir (ya estaba optimizado)
    o el resultado es mayor que el original.
    La API debe capturar esto y devolver un 422 o 400 con mensaje:
    "El archivo ya está optimizado y no se puede comprimir más."
    """
    pass

# CONFIGURACIONES AJUSTADAS
COMPRESSION_SETTINGS = {
    "baja": {
        "dpi": 150, 
        "jpeg_quality": 85, 
        "gs_setting": "/prepress"
    },
    "media": {
        "dpi": 110, 
        "jpeg_quality": 70, 
        "gs_setting": "/ebook"
    },
    "alta": {
        "dpi": 96,  
        "jpeg_quality": 55, 
        "gs_setting": "/screen"
    },
    "extrema": {
        # MODO AGRESIVO REAL
        "dpi": 72,         # Límite legible en pantalla
        "jpeg_quality": 35, # Calidad visual baja, alto ahorro
        "gs_setting": "/screen" # Base de GS
    }
}

def human_size(size_bytes):
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
    """MOTOR 1: Limpieza de metadatos (Sin pérdida)."""
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
    MOTOR 2: Ghostscript.
    Se ha aumentado el TIMEOUT y ajustado parámetros para modo extremo.
    """
    setting = COMPRESSION_SETTINGS[mode]["gs_setting"]
    dpi = COMPRESSION_SETTINGS[mode]["dpi"]
    
    # Flags base
    gs_command = [
        "gs",
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        f"-dPDFSETTINGS={setting}",
        "-dNOPAUSE", "-dQUIET", "-dBATCH",
        "-dDetectDuplicateImages=true",
        "-dDownsampleColorImages=true",
        f"-dColorImageResolution={dpi}",
        "-dDownsampleGrayImages=true",     # Agregado: Comprimir imágenes en escala de grises también
        f"-dGrayImageResolution={dpi}",
        "-dDownsampleMonoImages=true",
        f"-dMonoImageResolution={dpi}",
        "-sOutputFile=" + output_path,
        input_path
    ]

    # Timeout aumentado a 300 segundos (5 minutos) para archivos grandes
    try:
        result = subprocess.run(gs_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=300)
        if result.returncode == 0 and os.path.exists(output_path):
            return True
        print(f"[Engine Ghostscript] Falló con código {result.returncode}")
        return False
    except subprocess.TimeoutExpired:
        print("[Engine Ghostscript] ⏳ Timeout (se excedió el tiempo límite de 300s)")
        return False
    except FileNotFoundError:
        return False
    except Exception as e:
        print(f"[Engine Ghostscript] Error: {e}")
        return False

def engine_pymupdf_images(input_path, output_path, mode="media"):
    """
    MOTOR 3: PyMuPDF Avanzado.
    Re-comprime imágenes una por una.
    """
    try:
        doc = fitz.open(input_path)
        settings = COMPRESSION_SETTINGS[mode]
        target_dpi = settings["dpi"]
        quality = settings["jpeg_quality"]
        
        processed_something = False

        for page_num in range(len(doc)):
            page = doc[page_num]
            images = page.get_images(full=True)

            for img_info in images:
                xref = img_info[0]
                base_image = doc.extract_image(xref)
                if not base_image: continue
                
                image_bytes = base_image["image"]
                
                try:
                    img = Image.open(io.BytesIO(image_bytes))
                    
                    # Si es modo EXTREMA, convertir a RGB siempre para quitar canales extra innecesarios (CMYK)
                    if mode == "extrema" and img.mode == "CMYK":
                        img = img.convert("RGB")
                    
                    # Verificar dimensiones para no procesar íconos pequeños
                    w, h = img.size
                    if w < 100 or h < 100: continue

                    # Guardar buffer comprimido
                    buffer = io.BytesIO()
                    img_format = "JPEG"
                    
                    # En modo extremo forzamos JPEG incluso si era PNG para ahorrar,
                    # a menos que tenga transparencia
                    if img.mode == "RGBA" or img.mode == "P":
                         # Mantener PNG si hay transparencia pero optimizando
                        img.save(buffer, format="PNG", optimize=True)
                    else:
                        img = img.convert("RGB")
                        img.save(buffer, format="JPEG", quality=quality, optimize=True)
                    
                    new_bytes = buffer.getvalue()
                    
                    # Solo reemplazar si mejora
                    if len(new_bytes) < len(image_bytes):
                        doc.update_stream(xref, new_bytes)
                        processed_something = True
                        
                except Exception:
                    continue

        # Garbage=4 es la limpieza más agresiva de PyMuPDF
        doc.save(output_path, garbage=4, deflate=True)
        doc.close()
        return True
    except Exception as e:
        print(f"[Engine PyMuPDF] Error: {e}")
        return False

# ============================================================
# LÓGICA PRINCIPAL
# ============================================================

def compress_pdf(input_path: str, output_path: str, mode: str = "media"):
    """
    Proceso principal. 
    NO devuelve el archivo original si falla la reducción.
    Lanza OptimizationFailure si no se logró reducir.
    """
    
    # 1. Validación inicial
    if not os.path.exists(input_path):
        raise CompressionError("El archivo de entrada no existe.")
    
    if mode not in COMPRESSION_SETTINGS:
        mode = "media"

    original_size = os.path.getsize(input_path)
    temp_output = output_path + ".tmp"
    
    print(f"🚀 Iniciando compresión: {os.path.basename(input_path)} ({human_size(original_size)}) | Modo: {mode}")

    final_success = False

    # --- ESTRATEGIA 1: Ghostscript (Preferido) ---
    # Intenta GS primero. Si falla (timeout o error) pasa al siguiente.
    if engine_ghostscript(input_path, temp_output, mode):
        new_size = os.path.getsize(temp_output)
        
        # Validación de "No Aumento"
        if new_size < original_size:
            reduction = (1 - new_size/original_size) * 100
            print(f"✅ Éxito con Ghostscript. Reducción: {reduction:.1f}%")
            shutil.move(temp_output, output_path)
            return True
        else:
            print(f"⚠️ Ghostscript generó un archivo más grande (+{human_size(new_size - original_size)}). Descartando.")
            os.remove(temp_output)
    
    # --- ESTRATEGIA 2: PyMuPDF (Fallback Robusto) ---
    print("🔄 Intentando motor PyMuPDF (Python nativo)...")
    if engine_pymupdf_images(input_path, temp_output, mode):
        new_size = os.path.getsize(temp_output)
        
        if new_size < original_size:
            reduction = (1 - new_size/original_size) * 100
            print(f"✅ Éxito con PyMuPDF. Reducción: {reduction:.1f}%")
            shutil.move(temp_output, output_path)
            return True
        else:
            print("⚠️ PyMuPDF tampoco logró reducir el tamaño.")
            if os.path.exists(temp_output):
                os.remove(temp_output)

    # --- ESTRATEGIA 3: Limpieza Metadata (Último intento) ---
    # Solo si los anteriores fallaron, intentamos quitar basura sin tocar imágenes
    print("🧹 Intentando limpieza de metadatos...")
    if engine_pikepdf_lossless(input_path, temp_output):
        new_size = os.path.getsize(temp_output)
        # Aquí somos estrictos: debe haber bajado al menos un 1% para valer la pena
        if new_size < original_size * 0.99:
            shutil.move(temp_output, output_path)
            print("✅ Limpieza completada (pequeña reducción).")
            return True
        else:
            if os.path.exists(temp_output):
                os.remove(temp_output)

    # --- FALLO TOTAL ---
    # Si llegamos aquí, ningún método logró reducir el archivo.
    # NO devolvemos el original. Lanzamos excepción para que la API notifique.
    print("❌ No se pudo optimizar el archivo (ya estaba comprimido o protegido).")
    raise OptimizationFailure(
        f"No se pudo reducir el tamaño del archivo. Es posible que ya esté optimizado al máximo para el nivel '{mode}'."
    )

def get_compression_estimates(input_path: str) -> dict:
    if not os.path.exists(input_path):
        return {}
    
    size = os.path.getsize(input_path)
    
    # Estimaciones ajustadas a la nueva realidad agresiva
    factors = {
        "baja": 0.90, 
        "media": 0.70, 
        "alta": 0.45, 
        "extrema": 0.25  # Prometemos una reducción fuerte
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

# ALIASES
def getcompressionestimates(input_path: str) -> dict:
    return get_compression_estimates(input_path)

def compresspdf(input_path: str, output_path: str, mode: str = "media"):
    return compress_pdf(input_path, output_path, mode)