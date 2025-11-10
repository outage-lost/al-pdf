#!/bin/bash

echo "=== Verificación del AL PDF Server ==="

# Esperar a que el contenedor esté listo
echo "Esperando 5 segundos para que el servidor esté listo..."
sleep 5

# Verificar salud del servidor
echo "1. Probando endpoint de salud..."
curl -f http://localhost:8000/health
HEALTH_STATUS=$?

if [ $HEALTH_STATUS -eq 0 ]; then
    echo "✅ Servidor respondiendo correctamente"
else
    echo "❌ El servidor no responde"
    exit 1
fi

# Verificar endpoint raíz
echo ""
echo "2. Probando endpoint raíz..."
curl http://localhost:8000/

# Verificar logs recientes
echo ""
echo "3. Mostrando logs recientes..."
docker-compose logs --tail=10 pdf-server

# Verificar que los módulos se importan correctamente
echo ""
echo "4. Verificando importaciones de Python..."
docker exec al-pdf-server python -c "
try:
    from app.main import app
    from app.services.compression import compress_pdf, get_compression_estimates
    from app.services.merging import merge_pdfs
    from app.services.splitting import split_pdf
    from app.services.conversion import convert_to_pdf
    print('✅ Todos los módulos importados correctamente')
except Exception as e:
    print(f'❌ Error importando módulos: {e}')
    import traceback
    traceback.print_exc()
"

echo ""
echo "=== Verificación completada ==="
echo "El servidor está listo en: http://localhost:8000"