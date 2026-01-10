#!/usr/bin/env python3

################################################################################
#                     AL-PDF API - SCRIPT DE PRUEBAS (Python)
#
# Propósito: Validar que todas las funciones de compresión y división
#           funcionan correctamente
#
# Uso: python3 test_api.py <archivo_pdf>
#      Ejemplo: python3 test_api.py /ruta/a/miarchivo.pdf
#
# Requisitos: requests library
#             pip install requests
#
# IMPORTANTE: Asegurar que Docker esté ejecutándose:
#             docker-compose up -d (en directorio /api)
################################################################################

import os
import sys
import json
import time
import shutil
import zipfile
from pathlib import Path
from datetime import datetime

try:
    import requests
except ImportError:
    print("Error: Se requiere 'requests' library")
    print("Instalar con: pip install requests")
    sys.exit(1)

# Colores
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

# Variables globales
API_BASE = "http://localhost:8000"
RESULTS_DIR = f"test_results_{int(time.time())}"
TIMESTAMP = datetime.now().strftime("%Y%m%d_%H%M%S")

def print_header(text):
    print(f"\n{Colors.BLUE}{'═' * 60}{Colors.ENDC}")
    print(f"{Colors.BLUE}  {text}{Colors.ENDC}")
    print(f"{Colors.BLUE}{'═' * 60}{Colors.ENDC}\n")

def print_success(text):
    print(f"{Colors.GREEN}✓ {text}{Colors.ENDC}")

def print_error(text):
    print(f"{Colors.RED}✗ {text}{Colors.ENDC}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠ {text}{Colors.ENDC}")

def print_info(text):
    print(f"{Colors.CYAN}ℹ {text}{Colors.ENDC}")

def human_readable_size(bytes_size):
    """Convertir bytes a formato legible"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes_size < 1024.0:
            return f"{bytes_size:.2f}{unit}"
        bytes_size /= 1024.0
    return f"{bytes_size:.2f}TB"

def get_file_size(filepath):
    """Obtener tamaño de archivo"""
    try:
        return os.path.getsize(filepath)
    except:
        return 0

def compare_sizes(original, compressed):
    """Comparar tamaños de archivo"""
    orig_size = get_file_size(original)
    comp_size = get_file_size(compressed)
    
    if orig_size == 0 or comp_size == 0:
        return
    
    reduction = 100 - (comp_size * 100 // orig_size)
    
    print(f"    Original:   {human_readable_size(orig_size)}")
    print(f"    Comprimido: {human_readable_size(comp_size)}")
    print(f"    Reducción:  {reduction}%")

def check_api_health():
    """Verificar salud del API"""
    print_info("Verificando salud del API...")
    try:
        response = requests.get(f"{API_BASE}/health", timeout=5)
        if response.status_code == 200 and "healthy" in response.text:
            print_success("API está funcionando")
            return True
    except Exception as e:
        pass
    
    print_error("API no responde o no está healthy")
    return False

def test_health_check():
    """TEST 1: Health Check"""
    print_header("TEST 1: HEALTH CHECK")
    
    try:
        response = requests.get(f"{API_BASE}/health", timeout=5)
        if response.status_code == 200:
            print_success("API está funcionando correctamente")
            data = response.json()
            print_info(f"Respuesta: {json.dumps(data, indent=2)}")
            return True
    except Exception as e:
        print_error(f"Error: {str(e)}")
    
    return False

def test_compression_estimates(pdf_file):
    """TEST 2: Estimaciones de compresión"""
    print_header("TEST 2: ESTIMACIONES DE COMPRESIÓN")
    
    print_info("Obteniendo estimaciones de compresión...")
    
    try:
        with open(pdf_file, 'rb') as f:
            files = {'file': f}
            response = requests.post(f"{API_BASE}/compress/estimates", files=files, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            print_success("Estimaciones obtenidas correctamente")
            
            # Guardar tempid
            temp_id = data.get('tempid')
            print_info(f"Temp ID: {temp_id}")
            
            # Mostrar estimaciones
            print("\nEstimaciones por nivel:")
            for quality, info in data['estimates'].items():
                print(f"  {quality.upper()}:")
                print(f"    Tamaño: {info['size_human']}")
                print(f"    Reducción: {info['reduction_percent']}%")
            
            return True, temp_id
        else:
            print_error(f"Error: Status {response.status_code}")
            return False, None
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False, None

def test_compression(pdf_file, quality, temp_id=None):
    """Prueba de compresión con calidad específica"""
    print_header(f"COMPRESIÓN - NIVEL {quality.upper()}")
    
    print_info(f"Comprimiendo PDF con calidad {quality}...")
    
    output_file = f"{RESULTS_DIR}/compressed_{quality}_{TIMESTAMP}.pdf"
    
    try:
        with open(pdf_file, 'rb') as f:
            files = {'file': f}
            data = {'quality': quality}
            if temp_id:
                data['tempid'] = temp_id
            
            response = requests.post(f"{API_BASE}/compress", files=files, data=data, timeout=60)
        
        if response.status_code == 200:
            with open(output_file, 'wb') as f:
                f.write(response.content)
            
            if get_file_size(output_file) > 0:
                print_success(f"Compresión {quality.upper()} completada")
                compare_sizes(pdf_file, output_file)
                return True
            else:
                print_error("Archivo comprimido vacío")
                return False
        else:
            print_error(f"Error: Status {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def test_split(pdf_file, split_type, custom_parts=None, pages_per_part=None):
    """Prueba de división de PDF"""
    print_header(f"DIVISIÓN - {split_type.upper()}")
    
    print_info(f"Dividiendo PDF...")
    
    output_file = f"{RESULTS_DIR}/split_{split_type}_{TIMESTAMP}.zip"
    
    try:
        with open(pdf_file, 'rb') as f:
            files = {'file': f}
            data = {'splittype': split_type}
            
            if custom_parts:
                data['customparts'] = custom_parts
            if pages_per_part:
                data['pagesperpart'] = pages_per_part
            
            response = requests.post(f"{API_BASE}/split", files=files, data=data, timeout=60)
        
        if response.status_code == 200:
            with open(output_file, 'wb') as f:
                f.write(response.content)
            
            if get_file_size(output_file) > 0:
                print_success(f"División completada")
                
                # Contar archivos en ZIP
                try:
                    with zipfile.ZipFile(output_file, 'r') as zip_ref:
                        file_list = zip_ref.namelist()
                        pdf_count = len([f for f in file_list if f.endswith('.pdf')])
                        print_info(f"Archivos generados: {pdf_count}")
                        print_info(f"Tamaño del ZIP: {human_readable_size(get_file_size(output_file))}")
                except Exception as e:
                    print_warning(f"No se pudo inspeccionar ZIP: {str(e)}")
                
                return True
            else:
                print_error("Archivo ZIP vacío")
                return False
        else:
            print_error(f"Error: Status {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def print_summary(pdf_file, results):
    """Imprimir resumen de resultados"""
    print_header("RESUMEN DE RESULTADOS")
    
    print_info(f"Directorio de resultados: {RESULTS_DIR}")
    print()
    
    print_info("Archivos generados:")
    try:
        for file in os.listdir(RESULTS_DIR):
            filepath = os.path.join(RESULTS_DIR, file)
            size = get_file_size(filepath)
            print(f"  {file} ({human_readable_size(size)})")
    except:
        pass
    
    print()
    print_info("Comparativa de tamaños:")
    orig_size = get_file_size(pdf_file)
    for file in os.listdir(RESULTS_DIR):
        if file.startswith("compressed"):
            filepath = os.path.join(RESULTS_DIR, file)
            comp_size = get_file_size(filepath)
            if orig_size > 0:
                reduction = 100 - (comp_size * 100 // orig_size)
                print(f"  {file}: {reduction}% reducción")
    
    print()

def main():
    """Función principal"""
    
    # Validar argumentos
    if len(sys.argv) < 2:
        print("Uso: python3 test_api.py <archivo_pdf>")
        print("Ejemplo: python3 test_api.py /ruta/a/miarchivo.pdf")
        sys.exit(1)
    
    pdf_file = sys.argv[1]
    
    # Crear directorio de resultados
    os.makedirs(RESULTS_DIR, exist_ok=True)
    print_success(f"Directorio de resultados: {RESULTS_DIR}")
    
    # Validar archivo PDF
    if not os.path.isfile(pdf_file):
        print_error(f"Archivo no encontrado: {pdf_file}")
        sys.exit(1)
    
    if not pdf_file.lower().endswith('.pdf'):
        print_warning(f"Archivo no tiene extensión .pdf")
    
    print_success(f"Archivo PDF encontrado: {pdf_file}")
    orig_size = get_file_size(pdf_file)
    print_info(f"Tamaño original: {human_readable_size(orig_size)}")
    
    # Verificar API
    if not check_api_health():
        sys.exit(1)
    
    # Ejecutar tests
    results = {}
    
    # Test 1: Health check
    results['health'] = test_health_check()
    
    # Test 2: Estimaciones
    success, temp_id = test_compression_estimates(pdf_file)
    results['estimates'] = success
    
    # Tests 3-6: Compresión
    results['compress_baja'] = test_compression(pdf_file, 'baja', temp_id)
    results['compress_media'] = test_compression(pdf_file, 'media', temp_id)
    results['compress_alta'] = test_compression(pdf_file, 'alta', temp_id)
    results['compress_extrema'] = test_compression(pdf_file, 'extrema', temp_id)
    
    # Tests 7-9: División
    results['split_individual'] = test_split(pdf_file, 'individual_pages')
    results['split_3parts'] = test_split(pdf_file, 'customparts', custom_parts=3)
    results['split_5pages'] = test_split(pdf_file, 'pagesperpart', pages_per_part=5)
    
    # Resumen
    print_summary(pdf_file, results)
    
    # Contar resultados exitosos
    successful = sum(1 for v in results.values() if v)
    total = len(results)
    
    if successful == total:
        print_success(f"✓ TODOS LOS TESTS COMPLETADOS EXITOSAMENTE ({successful}/{total})")
        return 0
    else:
        print_warning(f"⚠ {successful}/{total} tests exitosos")
        return 1

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\nInterrupción del usuario")
        sys.exit(130)
    except Exception as e:
        print_error(f"Error inesperado: {str(e)}")
        sys.exit(1)
