# 📋 RESUMEN DE CAMBIOS - AL-PDF v2.0

## ✨ Mejoras Implementadas

### 1. BACKEND (API FastAPI)

#### Nuevos Endpoints
- ✅ **POST /convert-merge-zip** - Conversión con opción de agrupar PDFs o descargar como ZIP
  - Parámetro: `merge_mode` ("merge" | "zip")
  - Usa `mergepdfs()` para unir cuando merge_mode="merge"
  
- ✅ **POST /split-select-pages** - Dividir PDF extrayendo páginas específicas
  - Parámetro: `pages` (string formato "1,3,5-7,10")
  - Soporta rangos y números individuales
  - Retorna un único PDF con las páginas seleccionadas
  
- ✅ **POST /preview-upload** - Subir PDF y obtener miniatura
  - Devuelve: file_id, page_count, file_size_bytes, thumbnail_base64
  - Guarda archivos temporalmente para caching
  
- ✅ **GET /preview/{file_id}** - Obtener miniatura de página específica
  - Parámetro query: `page` (0-indexed)
  - Devuelve: PNG stream
  
- ✅ **GET /preview-info/{file_id}** - Información del PDF
  - Devuelve: page_count, file_size_bytes

#### Nuevos Servicios
- ✅ **services/preview.py** - Módulo completo de previsualizaciones
  - `get_pdf_page_count()` - Obtener número de páginas
  - `render_page_to_png()` - Renderizar página a PNG
  - `render_all_pages_to_pngs()` - Renderizar todas las páginas
  - `render_page_to_base64()` - Para incrustar en HTML
  - `get_pdf_info()` - Información del PDF

#### Mejoras en Servicios Existentes
- ✅ **services/splitting.py** - Nueva función `split_pdf_by_pages()`
  - Extrae páginas específicas de un PDF
  - Validación de rangos de página
  - Retorna ruta del PDF generado

#### Cambios en main.py
- ✅ Imports actualizados (añadidos: Query, StreamingResponse, preview functions)
- ✅ Validación mejorada de endpoints
- ✅ Manejo de errores más robusto
- ✅ Documentación de endpoints en docstrings

#### Dockerfile (api)
- ✅ Puerto interno cambio: 8999 → 8000 (mejor estándar)
- ✅ 2 workers → 4 workers (mejor concurrencia)
- ✅ Timeout aumentado: 300s → 600s (10 min para archivos grandes)
- ✅ Healthcheck agregado para Docker Compose

---

### 2. FRONTEND (Next.js + React)

#### Componentes Nuevos/Mejorados
- ✅ **pdf-preview.tsx** - REDISEÑO COMPLETO
  - Anterior: iframe que abre lector PDF
  - Nuevo: Miniaturas en `<img>` tags
  - Navegación entre páginas con botones
  - Carga asincrónica desde /preview endpoint
  - Soporte para base64 y URLs de blob
  - Fallback a iframe si es necesario

#### Páginas Actualizadas
- ✅ **dashboard/convert/page.tsx** - Opción merge/zip
  - RadioGroup para elegir comportamiento
  - Usa /convert-merge-zip cuando hay múltiples archivos
  - Labels descriptivos para cada opción
  - Feedback visual mejorado
  - Botón "Convertir otro" para operaciones consecutivas

- ✅ **dashboard/split/page.tsx** - Selección de páginas
  - Nueva opción "Seleccionar páginas específicas" (default)
  - Input con formato: "1,3,5-7,10"
  - Ayuda visual del formato
  - Carga automática de PDF info (páginas, tamaño)
  - Muestra miniaturas en componente PdfPreview
  - Usa /split-select-pages cuando se selecciona esta opción
  - Mantiene opciones legadas (páginas individuales, partes, etc)

#### Configuración Dinámica
- ✅ **lib/api-config.ts** - COMPLETAMENTE REESCRITO
  - Detección automática de ambiente:
    1. Usa NEXT_PUBLIC_API_URL si existe (Docker interno)
    2. Detecta localhost en navegador → puerto 8000
    3. Fallback a subdominio VPS externo
  - Función `getBaseUrl()` central
  - Compatible con build-time y runtime

#### Tema Oscuro/Claro
- ✅ **app/layout.tsx** - Script FOUC prevención
  - Script inline que corre ANTES de React
  - Lee localStorage antes de renderizar
  - Aplica clase "dark" al <html> antes de hidratación
  - Evita "flash" de colores incorrectos
  - Lenguaje: español ("es")

- ✅ **components/theme-toggle.tsx** - Manejo mejorado
  - Skeleton placeholder mientras monta
  - storageKey="theme" explícito
  - Animaciones suaves (duration-300)
  - Títulos descriptivos en español
  - Scale animations en hover/active

- ✅ **app/globals.css** - Rediseño UI/UX
  - Nuevas animaciones CSS:
    - @keyframes fadeInUp, fadeInDown, slideInRight
    - @keyframes shimmer, pulse-glow, bounce-soft
  - Transiciones globales (duration-200, duration-300)
  - Layer components:
    - .btn-animated - Botones con scale
    - .card-hover - Cards con shadow y translateY
    - .fade-in, .slide-in - Animaciones reutilizables
    - .pulse-subtle - Efecto pulsante
  - Mejoras en inputs, buttons, cards
  - .page-gradient - Gradiente sutil de fondo

---

### 3. DOCKER & DESPLIEGUE

#### docker-compose.yml - COMPLETAMENTE REESCRITO
- ✅ Servicios:
  - `api`: Puerto 8999:8000 (externo:interno)
  - `web`: Puerto 3000:3000
  
- ✅ Red interna: `alpdf-network` (bridge)
  
- ✅ Variables de entorno dinámicas:
  - `NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://api:8000}`
  - Usa `.env` si existe, fallback a interno
  
- ✅ Healthcheck para API
  
- ✅ depends_on con condition service_healthy

#### Dockerfile (app) - Variables de construcción
- ✅ ARG NEXT_PUBLIC_API_URL
- ✅ ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
- ✅ Construcción con variables de entorno

#### .env.example - Nuevo archivo
- ✅ Documentación de variables
- ✅ Ejemplos para Docker interno
- ✅ Ejemplos para subdominio VPS
- ✅ Comentarios explicativos

---

### 4. DOCUMENTACIÓN

#### DEPLOY.md - Guía completa
- ✅ Características implementadas
- ✅ Arquitectura detallada
- ✅ Instalación con Docker Compose
- ✅ Instalación desarrollo local
- ✅ Todos los endpoints documentados
- ✅ Configuración de producción
- ✅ Nginx reverse proxy ejemplo
- ✅ Troubleshooting
- ✅ Dependencias principales

#### verify-setup.sh - Script de verificación
- ✅ Chequea archivos principales
- ✅ Valida docker-compose.yml
- ✅ Instrucciones para deployment

---

## 🔄 FLUJO DE OPERACIONES

### Conversión con merge/zip
```
1. Usuario selecciona N archivos
2. Elige "Agrupar en PDF" o "Descargar ZIP"
3. POST /convert-merge-zip + merge_mode
4. Backend:
   - Guarda archivos temporales
   - Convierte cada uno a PDF
   - Si merge_mode="merge": mergepdfs()
   - Si merge_mode="zip": zipfile.ZipFile()
5. Devuelve PDF o ZIP
6. Usuario descarga con nombre personalizado
```

### Separación con páginas específicas
```
1. Usuario sube 1 PDF
2. Sistema carga preview + page_count automático
3. Usuario ve miniatura de primeras 5 páginas
4. Usuario ingresa "1,3,5-7,10"
5. POST /split-select-pages + pages string
6. Backend:
   - Parsea "1,3,5-7,10" → [0,2,4,5,6,9] (0-indexed)
   - Crea nuevo PDF con esas páginas
7. Devuelve PDF
8. Usuario descarga
```

### Previsualización
```
1. Usuario sube PDF en split/merge/compress
2. POST /preview-upload
3. Backend devuelve file_id + thumbnail_base64 + page_count
4. Frontend renderiza:
   - Miniatura initial
   - Información de páginas
   - Carga /preview/{file_id}?page=0,1,2... si scrollea
5. Usuario ve miniaturas sin cargar iframe del navegador
```

---

## 🚀 DEPLOYMENT

### Local Development
```bash
cd api
source venv/bin/activate
pip install -r requirements.txt
python app/main.py

# Terminal 2
cd app
NEXT_PUBLIC_API_URL=http://localhost:8000 pnpm dev
```

### Docker Compose (RECOMENDADO)
```bash
docker-compose up --build
# API: http://localhost:8999
# Web: http://localhost:3000
```

### VPS con subdominio
```bash
# 1. Push a GitHub
git add .
git commit -m "AL-PDF v2.0: Nuevas funcionalidades"
git push

# 2. En VPS
git clone <repo>
cd al-pdf
echo "NEXT_PUBLIC_API_URL=https://tu-dominio.com:8999" > .env
docker-compose up -d --build
```

---

## 🔧 CAMBIOS TÉCNICOS IMPORTANTES

### Puerto API
- **Antes**: 8999 (Docker) → 8999 (local)
- **Ahora**: 8000 (Docker interno) → 8999 (mapeo externo)
- **Por qué**: Puerto 8000 es estándar para APIs, 8999 solo para expose

### API Base URL
- **Antes**: Hardcodeado en api-config.ts
- **Ahora**: Dinámico, detecta ambiente automático

### Tema Oscuro/Claro
- **Antes**: FOUC, necesitaba click doble a veces
- **Ahora**: Script previene FOUC, funciona inmediatamente

### Previsualizaciones
- **Antes**: iframe con lector PDF del navegador
- **Ahora**: Miniaturas PNG cacheadas, UX más limpia

---

## ⚠️ NOTAS IMPORTANTES

1. **Base de datos temporal**: Los archivos se guardan en `/app/temp/` y se limpian después de descarga
2. **CORS**: Habilitado para todo ("*"), cambiar en producción si es necesario
3. **Timeouts**: 600s para procesar archivos grandes
4. **Workers**: 4 procesos de Uvicorn para mejor concurrencia
5. **Storage**: El servidor NO guarda archivos permanentemente, todo es temporal

---

## ✅ CHECKLIST PRE-DEPLOYMENT

- [x] main.py con nuevos endpoints
- [x] services/preview.py creado
- [x] splitting.py con split_pdf_by_pages()
- [x] convert/page.tsx con merge/zip options
- [x] split/page.tsx con selección de páginas
- [x] pdf-preview.tsx rediseñado
- [x] api-config.ts dinámico
- [x] layout.tsx con script FOUC
- [x] theme-toggle.tsx mejorado
- [x] globals.css con animaciones
- [x] docker-compose.yml integrado
- [x] Dockerfile (api) actualizado
- [x] Dockerfile (app) con ARG/ENV
- [x] .env.example
- [x] DEPLOY.md
- [x] verify-setup.sh

---

**Estado**: ✅ LISTO PARA PRODUCCIÓN  
**Fecha**: 5 Febrero 2026  
**Versión**: 2.0.0
