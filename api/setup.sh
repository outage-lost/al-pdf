#!/bin/bash

################################################################################
#                    SETUP INICIAL DEL CONTENEDOR
#
# Este script realiza la configuración inicial necesaria para habilitar
# hot-reload y verificar que todo funcione correctamente.
#
# Uso: bash setup.sh
#
################################################################################

set -e

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

################################################################################
# VALIDACIONES PREVIAS
################################################################################

print_header "VALIDACIONES PREVIAS"

# Verificar que estamos en el directorio correcto
if [[ ! -f "docker-compose.yml" ]]; then
    print_error "docker-compose.yml no encontrado"
    print_info "Ejecutar este script desde el directorio /api"
    exit 1
fi
print_success "Estamos en el directorio /api"

# Verificar Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker no está instalado"
    exit 1
fi
print_success "Docker está instalado"

# Verificar docker-compose
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose no está instalado"
    exit 1
fi
print_success "docker-compose está instalado"

################################################################################
# DETENER CONTENEDOR ANTERIOR
################################################################################

print_header "DETENER CONTENEDOR ANTERIOR"

if docker ps | grep -q "al-pdf-server"; then
    print_info "Deteniendo contenedor anterior..."
    docker-compose down
    print_success "Contenedor detenido"
    sleep 2
else
    print_info "No hay contenedor anterior corriendo"
fi

################################################################################
# RECONSTRUIR IMAGEN
################################################################################

print_header "RECONSTRUIR IMAGEN DOCKER"

print_info "Esto puede tardar 3-5 minutos..."
print_info "Instalando dependencias Python, LibreOffice y herramientas PDF..."

docker-compose up -d --build

if [[ $? -ne 0 ]]; then
    print_error "Error al construir imagen"
    exit 1
fi

print_success "Imagen construida correctamente"

################################################################################
# ESPERAR A QUE INICIE
################################################################################

print_header "ESPERANDO A QUE EL SERVICIO INICIE"

print_info "Esperando 5 segundos para que el contenedor se estabilice..."
sleep 5

# Intentar health check
max_attempts=30
attempt=1

while [[ $attempt -le $max_attempts ]]; do
    print_info "Intento $attempt de $max_attempts..."
    
    if curl -s http://localhost:8000/health | grep -q "healthy" 2>/dev/null; then
        print_success "API respondiendo correctamente"
        break
    fi
    
    sleep 2
    ((attempt++))
done

if [[ $attempt -gt $max_attempts ]]; then
    print_warning "El API puede no estar completamente listo"
    print_info "Esperar unos momentos más y verificar con:"
    print_info "  curl http://localhost:8000/health"
fi

################################################################################
# VERIFICACIONES FINALES
################################################################################

print_header "VERIFICACIONES FINALES"

# Verificar que el contenedor está corriendo
if docker ps | grep -q "al-pdf-server"; then
    print_success "Contenedor está corriendo"
else
    print_error "Contenedor no está corriendo"
    print_info "Ver logs con: docker logs al-pdf-server"
    exit 1
fi

# Verificar health
print_info "Verificando API..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    print_success "API está respondiendo"
else
    print_warning "API no responde aún, puede necesitar más tiempo"
fi

# Verificar volúmenes
print_info "Verificando volúmenes..."
if docker inspect al-pdf-server | grep -q "/app/app"; then
    print_success "Hot-reload habilitado (volúmenes montados)"
else
    print_warning "Volúmenes pueden no estar configurados correctamente"
fi

################################################################################
# INSTRUCCIONES FINALES
################################################################################

print_header "SETUP COMPLETADO ✓"

echo -e "${GREEN}¡Setup inicial completado exitosamente!${NC}\n"

echo -e "${BLUE}PRÓXIMOS PASOS:${NC}"
echo "  1. El contenedor está corriendo y listo para usar"
echo "  2. Hot-reload está habilitado"
echo "  3. Los cambios en código se reflejarán en segundos"
echo ""

echo -e "${BLUE}PRUEBAS RÁPIDAS:${NC}"
echo "  # Health check"
echo "  curl http://localhost:8000/health"
echo ""
echo "  # Ejecutar pruebas (necesita un PDF)"
echo "  ./test_api.sh /ruta/a/archivo.pdf"
echo ""

echo -e "${BLUE}COMANDOS ÚTILES:${NC}"
echo "  # Ver logs en tiempo real"
echo "  docker logs -f al-pdf-server"
echo ""
echo "  # Ver estado del contenedor"
echo "  docker ps | grep al-pdf-server"
echo ""
echo "  # Detener contenedor"
echo "  docker-compose down"
echo ""
echo "  # Reiniciar contenedor"
echo "  docker-compose restart"
echo ""

echo -e "${BLUE}DOCUMENTACIÓN:${NC}"
echo "  - QUICK_START.txt: Guía rápida de inicio"
echo "  - PDF_COMPRESSION_AND_SPLITTING.txt: Documentación completa"
echo ""

echo -e "${YELLOW}NOTA IMPORTANTE:${NC}"
echo "  Para cambios futuros en el código:"
echo "  1. Edita los archivos en /api/app/**"
echo "  2. Guarda (Ctrl+S)"
echo "  3. Espera 2-3 segundos"
echo "  4. ¡Listo! Se actualiza automáticamente"
echo ""

print_info "Setup completado. ¡Listo para usar!"
