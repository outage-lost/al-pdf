# ⚡ INICIO RÁPIDO - AL-PDF v2.0

## 🚀 Ejecutar en tu máquina (5 minutos)

```bash
# 1. Clonar/actualizar código
cd /mnt/NVMeDisk/Projects/WebProjects/al-pdf
git status

# 2. Verificar archivos
bash verify-setup.sh

# 3. Ejecutar Docker Compose
docker-compose up --build

# 4. Esperar a que esté listo (~2 minutos)
# Verás: "alpdf-api" y "alpdf-web" en ejecución

# 5. Acceder
# Web: http://localhost:9001
# API: http://localhost:8999
# API Health: curl http://localhost:8999/health
```

## 📤 Subir a GitHub

```bash
cd /mnt/NVMeDisk/Projects/WebProjects/al-pdf

# 1. Ver cambios
git status

# 2. Agregar todos
git add .

# 3. Crear commit
git commit -m "feat: AL-PDF v2.0 - Nueva UI, endpoints mejorados, Docker integrado"

# 4. Hacer push
git push origin main

# Verificar en GitHub: https://github.com/tu-usuario/al-pdf
```

## 🌍 Desplegar en VPS

### Opción A: Docker Interno (RECOMENDADO - Rápido)
```bash
# En tu VPS
cd /home/usuario/apps
git clone https://github.com/tu-usuario/al-pdf.git
cd al-pdf

# Ejecutar (API y Web en misma red)
docker-compose up -d --build

# Ver logs
docker-compose logs -f

# Acceder a través de Nginx (configurar reverse proxy)
```

### Opción B: Usar Subdominio Externo
```bash
# En tu VPS, crear .env
echo "NEXT_PUBLIC_API_URL=https://api.tu-dominio.com:8999" > .env

# Ejecutar
docker-compose up -d --build

# Configurar Nginx para apuntar a puerto 3000 y 8999
```

## ✨ Nuevas Funcionalidades

### Conversión
- **Antes**: Múltiples archivos → ZIP automático
- **Ahora**: Elige "Agrupar en PDF" o "ZIP"

### División
- **Antes**: Solo "páginas individuales", "partes iguales", "páginas por parte"
- **Ahora**: NUEVA "Seleccionar páginas específicas" (ej: 1,3,5-7)

### Previsualizaciones
- **Antes**: iframe con lector PDF del navegador
- **Ahora**: Miniaturas PNG limpias sin iframe

### Tema
- **Antes**: A veces fallaba al cambiar tema
- **Ahora**: Funciona inmediatamente sin flashes

## 📊 Verificar que funciona

```bash
# 1. Test API health
curl http://localhost:8999/health
# Respuesta: {"status":"healthy"}

# 2. Visitar web
open http://localhost:9001

# 3. Probar funciones
# - Subir imagen → convertir a PDF
# - Subir 2 imágenes → elegir "agrupar" o "ZIP"
# - Subir PDF → elegir "páginas específicas" (ej: 1,3,5-7)
# - Ver miniaturas en lugar de iframe

# 4. Cambiar tema oscuro/claro
# - Debe funcionar inmediatamente sin flickering
```

## 🔧 Parar/Reiniciar Servicios

```bash
# Ver servicios
docker-compose ps

# Parar todo
docker-compose down

# Reiniciar
docker-compose up -d

# Ver logs
docker-compose logs api -f
docker-compose logs web -f

# Limpiar volúmenes
docker-compose down -v
docker-compose up -d --build
```

## 📁 Estructura de cambios

```
Archivos MODIFICADOS:
✓ api/app/main.py (+150 líneas nuevos endpoints)
✓ api/app/services/splitting.py (+ split_pdf_by_pages)
✓ api/Dockerfile (puerto 8000, 4 workers)
✓ app/lib/api-config.ts (ahora dinámico)
✓ app/components/pdf-preview.tsx (miniaturas, sin iframe)
✓ app/components/theme-toggle.tsx (mejorado)
✓ app/app/layout.tsx (script FOUC)
✓ app/app/globals.css (animaciones nuevas)
✓ app/app/dashboard/convert/page.tsx (merge/zip options)
✓ app/app/dashboard/split/page.tsx (seleccionar páginas)
✓ docker-compose.yml (red interna, env dinámicas)
✓ app/Dockerfile (ARG NEXT_PUBLIC_API_URL)

Archivos NUEVOS:
✓ api/app/services/preview.py (miniaturas)
✓ .env.example
✓ DEPLOY.md (guía completa)
✓ CAMBIOS.md (resumen técnico)
✓ verify-setup.sh
```

## ⚠️ Posibles Issues y Soluciones

### Issue: "Cannot GET /" en http://localhost:3000
**Solución**: Esperar a que Next.js termine de compilar (~2 min)
```bash
docker-compose logs web
# Esperar "ready - started server on 0.0.0.0:3000"
```

### Issue: API responde 404
**Solución**: Verificar que API esté en puerto correcto
```bash
docker-compose logs api
curl http://localhost:8999/health
```

### Issue: No se ve cambio de tema
**Solución**: Limpiar localStorage
- Abrir DevTools (F12)
- Application → localStorage → borrar "theme"
- Refrescar página

### Issue: Previsualizaciones no cargan
**Solución**: Verificar que `/preview` endpoint esté disponible
```bash
curl http://localhost:8999/preview-info/test
# Debe dar 404 (archivo no existe) pero no error de endpoint
```

## 📞 Próximos Pasos

1. ✅ Implementado todo localmente
2. ✅ Testear en http://localhost:3000
3. → Git push a GitHub
4. → Clonar en VPS
5. → docker-compose up -d
6. → Configurar Nginx reverse proxy
7. → Usar en subdominio

## 💡 Mejores Prácticas

- **Mantener `.env.example`** sincronizado con variables nuevas
- **Hacer commits pequeños** para cada feature
- **Testear en Docker** antes de producción
- **Ver logs regularmente**: `docker-compose logs -f`
- **Backup de base de datos/uploads** si los agregas después

---

**¿Necesitas ayuda?**
- Ver DEPLOY.md para guía completa
- Ver CAMBIOS.md para detalles técnicos
- Verificar logs: `docker-compose logs -f`

**¡Listo para producción! 🎉**
