#!/bin/bash
# Script de verificación de proyecto

echo "🔍 Verificando estructura del proyecto AL-PDF..."
echo ""

# Verificar archivos principales
files_to_check=(
  "api/app/main.py"
  "api/app/services/preview.py"
  "api/app/services/splitting.py"
  "app/app/dashboard/convert/page.tsx"
  "app/app/dashboard/split/page.tsx"
  "app/components/pdf-preview.tsx"
  "app/lib/api-config.ts"
  "docker-compose.yml"
)

all_exist=true
for file in "${files_to_check[@]}"; do
  if [ -f "$file" ]; then
    echo "✓ $file"
  else
    echo "✗ $file (NO ENCONTRADO)"
    all_exist=false
  fi
done

echo ""
echo "🐳 Docker Compose sintaxis:"
if command -v docker-compose &> /dev/null; then
  docker-compose config > /dev/null && echo "✓ docker-compose.yml válido" || echo "✗ Error en docker-compose.yml"
else
  echo "⚠ docker-compose no disponible"
fi

echo ""
if [ "$all_exist" = true ]; then
  echo "✅ Todos los archivos principales están presentes"
  echo ""
  echo "📋 Próximos pasos:"
  echo "1. git add ."
  echo "2. git commit -m 'feat: Implementación completa AL-PDF v2.0'"
  echo "3. git push origin main"
  echo "4. En tu VPS: docker-compose up --build"
else
  echo "❌ Faltan algunos archivos. Verifica la implementación."
fi
