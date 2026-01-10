#!/bin/bash

################################################################################
#                     AL-PDF API - SCRIPT DE PRUEBAS
#
# Propósito: Validar que todas las funciones de compresión y división
#           funcionan correctamente sin necesidad de reimplementar
#
# Uso: bash test_api.sh [archivo_pdf]
#      Ejemplo: bash test_api.sh /ruta/a/miarchivo.pdf
#
# IMPORTANTE: Asegurar que Docker esté ejecutándose:
#             docker-compose up -d (en directorio /api)
################################################################################

set -e  # Salir si hay error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
API_BASE="http://localhost:8000"
TEST_PDF="${1:-}"
RESULTS_DIR="./test_results_$(date +%s)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

################################################################################
# FUNCIONES AUXILIARES
################################################################################

print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_dependency() {
    if ! command -v "$1" &> /dev/null; then
        print_error "Dependencia no encontrada: $1"
        return 1
    fi
    return 0
}

check_api_health() {
    print_info "Verificando salud del API..."
    if response=$(curl -s -X GET "$API_BASE/health" 2>/dev/null); then
        if echo "$response" | grep -q "healthy"; then
            print_success "API está funcionando"
            return 0
        fi
    fi
    print_error "API no responde o no está healthy"
    return 1
}

get_file_size() {
    if [[ -f "$1" ]]; then
        stat -f%z "$1" 2>/dev/null || stat -c%s "$1" 2>/dev/null || wc -c < "$1"
    fi
}

human_readable_size() {
    local bytes=$1
    if (( bytes < 1024 )); then
        echo "${bytes}B"
    elif (( bytes < 1048576 )); then
        echo "$((bytes / 1024))KB"
    else
        echo "$((bytes / 1048576))MB"
    fi
}

compare_sizes() {
    local original=$1
    local compressed=$2
    local original_size=$(get_file_size "$original")
    local compressed_size=$(get_file_size "$compressed")
    
    if [[ -z "$original_size" || -z "$compressed_size" ]]; then
        return
    fi
    
    local reduction=$((100 - (compressed_size * 100 / original_size)))
    
    echo -e "    Original:   $(human_readable_size $original_size)"
    echo -e "    Comprimido: $(human_readable_size $compressed_size)"
    echo -e "    Reducción:  ${reduction}%"
}

################################################################################
# VERIFICACIONES PREVIAS
################################################################################

print_header "PREPARACIÓN Y VERIFICACIONES"

# Crear directorio de resultados
mkdir -p "$RESULTS_DIR"
print_success "Directorio de resultados: $RESULTS_DIR"

# Verificar dependencias
print_info "Verificando dependencias requeridas..."
check_dependency "curl" || exit 1
check_dependency "jq" || print_warning "jq no encontrado (recomendado para mejor formato JSON)"

# Verificar archivo PDF
if [[ -z "$TEST_PDF" ]]; then
    print_error "No se especificó archivo PDF"
    echo -e "\nUso: $0 <archivo_pdf>"
    echo "Ejemplo: $0 /ruta/a/miarchivo.pdf"
    exit 1
fi

if [[ ! -f "$TEST_PDF" ]]; then
    print_error "Archivo no encontrado: $TEST_PDF"
    exit 1
fi

# Validar que es PDF
if [[ ! "$TEST_PDF" =~ \.pdf$ ]]; then
    print_warning "Archivo no tiene extensión .pdf"
fi

print_success "Archivo PDF encontrado: $TEST_PDF"
original_size=$(get_file_size "$TEST_PDF")
print_info "Tamaño original: $(human_readable_size $original_size)"

# Verificar API
check_api_health || exit 1

################################################################################
# TEST 1: HEALTH CHECK
################################################################################

print_header "TEST 1: HEALTH CHECK"

response=$(curl -s -X GET "$API_BASE/health")
if echo "$response" | grep -q "healthy"; then
    print_success "API está funcionando correctamente"
    print_info "Respuesta: $response"
else
    print_error "API no respondió como se esperaba"
    exit 1
fi

################################################################################
# TEST 2: ESTIMACIONES DE COMPRESIÓN
################################################################################

print_header "TEST 2: ESTIMACIONES DE COMPRESIÓN"

print_info "Obteniendo estimaciones de compresión..."
estimates_response=$(curl -s -X POST "$API_BASE/compress/estimates" \
    -F "file=@$TEST_PDF")

if echo "$estimates_response" | grep -q "estimates"; then
    print_success "Estimaciones obtenidas correctamente"
    
    # Extraer tempid para usar después
    TEMP_ID=$(echo "$estimates_response" | grep -o '"tempid":"[^"]*' | cut -d'"' -f4)
    print_info "Temp ID: $TEMP_ID"
    
    # Mostrar estimaciones
    echo -e "\nEstimaciones por nivel:"
    echo "$estimates_response" | jq '.estimates' 2>/dev/null || {
        # Fallback si jq no está instalado
        echo "$estimates_response"
    }
else
    print_error "No se pudieron obtener estimaciones"
    exit 1
fi

################################################################################
# TEST 3: COMPRESIÓN - NIVEL BAJO
################################################################################

print_header "TEST 3: COMPRESIÓN - NIVEL BAJO"

print_info "Comprimiendo PDF con calidad BAJA..."
output_file="$RESULTS_DIR/compressed_baja_${TIMESTAMP}.pdf"

curl -s -X POST "$API_BASE/compress" \
    -F "file=@$TEST_PDF" \
    -F "quality=baja" \
    --output "$output_file"

if [[ -f "$output_file" && $(get_file_size "$output_file") -gt 0 ]]; then
    print_success "Compresión BAJA completada"
    compare_sizes "$TEST_PDF" "$output_file"
else
    print_error "Error en compresión BAJA"
fi

################################################################################
# TEST 4: COMPRESIÓN - NIVEL MEDIO
################################################################################

print_header "TEST 4: COMPRESIÓN - NIVEL MEDIO"

print_info "Comprimiendo PDF con calidad MEDIA..."
output_file="$RESULTS_DIR/compressed_media_${TIMESTAMP}.pdf"

curl -s -X POST "$API_BASE/compress" \
    -F "file=@$TEST_PDF" \
    -F "quality=media" \
    -F "tempid=$TEMP_ID" \
    --output "$output_file"

if [[ -f "$output_file" && $(get_file_size "$output_file") -gt 0 ]]; then
    print_success "Compresión MEDIA completada"
    compare_sizes "$TEST_PDF" "$output_file"
else
    print_error "Error en compresión MEDIA"
fi

################################################################################
# TEST 5: COMPRESIÓN - NIVEL ALTO
################################################################################

print_header "TEST 5: COMPRESIÓN - NIVEL ALTO"

print_info "Comprimiendo PDF con calidad ALTA..."
output_file="$RESULTS_DIR/compressed_alta_${TIMESTAMP}.pdf"

curl -s -X POST "$API_BASE/compress" \
    -F "file=@$TEST_PDF" \
    -F "quality=alta" \
    -F "tempid=$TEMP_ID" \
    --output "$output_file"

if [[ -f "$output_file" && $(get_file_size "$output_file") -gt 0 ]]; then
    print_success "Compresión ALTA completada"
    compare_sizes "$TEST_PDF" "$output_file"
else
    print_error "Error en compresión ALTA"
fi

################################################################################
# TEST 6: COMPRESIÓN - NIVEL EXTREMO
################################################################################

print_header "TEST 6: COMPRESIÓN - NIVEL EXTREMO"

print_info "Comprimiendo PDF con calidad EXTREMA..."
output_file="$RESULTS_DIR/compressed_extrema_${TIMESTAMP}.pdf"

curl -s -X POST "$API_BASE/compress" \
    -F "file=@$TEST_PDF" \
    -F "quality=extrema" \
    -F "tempid=$TEMP_ID" \
    --output "$output_file"

if [[ -f "$output_file" && $(get_file_size "$output_file") -gt 0 ]]; then
    print_success "Compresión EXTREMA completada"
    compare_sizes "$TEST_PDF" "$output_file"
else
    print_error "Error en compresión EXTREMA"
fi

################################################################################
# TEST 7: DIVISIÓN - PÁGINAS INDIVIDUALES
################################################################################

print_header "TEST 7: DIVISIÓN - PÁGINAS INDIVIDUALES"

print_info "Dividiendo PDF en páginas individuales..."
output_file="$RESULTS_DIR/split_individual_${TIMESTAMP}.zip"

curl -s -X POST "$API_BASE/split" \
    -F "file=@$TEST_PDF" \
    -F "splittype=individual_pages" \
    --output "$output_file"

if [[ -f "$output_file" && $(get_file_size "$output_file") -gt 0 ]]; then
    print_success "División en PÁGINAS INDIVIDUALES completada"
    
    # Contar archivos en ZIP
    file_count=$(unzip -l "$output_file" | grep -c "\.pdf$" || true)
    print_info "Archivos generados: $file_count"
    print_info "Tamaño del ZIP: $(human_readable_size $(get_file_size "$output_file"))"
else
    print_error "Error en división de páginas individuales"
fi

################################################################################
# TEST 8: DIVISIÓN - PARTES IGUALES
################################################################################

print_header "TEST 8: DIVISIÓN - PARTES IGUALES (3 partes)"

print_info "Dividiendo PDF en 3 partes iguales..."
output_file="$RESULTS_DIR/split_3parts_${TIMESTAMP}.zip"

curl -s -X POST "$API_BASE/split" \
    -F "file=@$TEST_PDF" \
    -F "splittype=customparts" \
    -F "customparts=3" \
    --output "$output_file"

if [[ -f "$output_file" && $(get_file_size "$output_file") -gt 0 ]]; then
    print_success "División en 3 PARTES completada"
    
    # Contar archivos en ZIP
    file_count=$(unzip -l "$output_file" | grep -c "\.pdf$" || true)
    print_info "Archivos generados: $file_count"
    print_info "Tamaño del ZIP: $(human_readable_size $(get_file_size "$output_file"))"
else
    print_error "Error en división de 3 partes"
fi

################################################################################
# TEST 9: DIVISIÓN - POR CANTIDAD DE PÁGINAS
################################################################################

print_header "TEST 9: DIVISIÓN - POR CANTIDAD DE PÁGINAS (5 por archivo)"

print_info "Dividiendo PDF en grupos de 5 páginas..."
output_file="$RESULTS_DIR/split_5pages_${TIMESTAMP}.zip"

curl -s -X POST "$API_BASE/split" \
    -F "file=@$TEST_PDF" \
    -F "splittype=pagesperpart" \
    -F "pagesperpart=5" \
    --output "$output_file"

if [[ -f "$output_file" && $(get_file_size "$output_file") -gt 0 ]]; then
    print_success "División de 5 PÁGINAS POR ARCHIVO completada"
    
    # Contar archivos en ZIP
    file_count=$(unzip -l "$output_file" | grep -c "\.pdf$" || true)
    print_info "Archivos generados: $file_count"
    print_info "Tamaño del ZIP: $(human_readable_size $(get_file_size "$output_file"))"
else
    print_error "Error en división de 5 páginas por archivo"
fi

################################################################################
# RESUMEN
################################################################################

print_header "RESUMEN DE RESULTADOS"

print_info "Directorio de resultados: $RESULTS_DIR"
echo ""

print_info "Archivos generados:"
ls -lh "$RESULTS_DIR"/ | tail -n +2 | awk '{print "  " $9 " (" $5 ")"}'

echo ""
print_info "Comparativa de tamaños:"
for file in "$RESULTS_DIR"/compressed*.pdf; do
    if [[ -f "$file" ]]; then
        name=$(basename "$file")
        original_bytes=$(get_file_size "$TEST_PDF")
        compressed_bytes=$(get_file_size "$file")
        reduction=$((100 - (compressed_bytes * 100 / original_bytes)))
        echo "  $name: $reduction% reducción"
    fi
done

echo ""

# Validar que todas las pruebas tuvieron éxito
total_files=$(ls "$RESULTS_DIR"/ | wc -l)
if [[ $total_files -ge 9 ]]; then
    print_success "✓ TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE"
    exit 0
else
    print_warning "⚠ Algunas pruebas pueden haber fallado"
    exit 1
fi
