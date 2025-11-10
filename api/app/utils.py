import os
import uuid
import tempfile
from typing import List

def human_size(bytesize: int) -> str:
    """Convertir bytes a formato legible"""
    kb = bytesize / 1024
    if kb < 1024:
        return f"{kb:.2f} KB"
    mb = kb / 1024
    return f"{mb:.2f} MB"

def generate_random_filename(extension: str) -> str:
    """Generar nombre de archivo aleatorio"""
    return f"{uuid.uuid4().hex}.{extension}"

def cleanup_temp_files(file_paths: List[str]):
    """Limpiar archivos temporales"""
    for file_path in file_paths:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            pass  # Ignorar errores al eliminar archivos temporales