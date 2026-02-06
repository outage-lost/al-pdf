# 🎨 Cambiar Icono y Logo de AL-PDF

## 📌 Ubicaciones de archivos

### 1. **Favicon** (pequeño icono en la pestaña del navegador)
- **Archivo actual:** `/app/public/favicon.ico`
- **Formato:** `.ico` (recomendado) o `.png`
- **Tamaño recomendado:** 32x32 px (mínimo), 64x64 px (ideal)

### 2. **Logo en la barra de navegación**
- **Ubicación:** [`app/app/layout.tsx`](app/app/layout.tsx) - línea donde aparece el logo
- **Componente a modificar:** Busca donde dice "AL-PDF" o logo en el sidebar/navbar

### 3. **Logo de la aplicación** (apple touch icon, manifest)
- **Archivo:** `/app/public/icon.png` (opcional)
- **Tamaño:** 192x192 px o 512x512 px

---

## 🔧 Pasos para cambiar el favicon

### Opción A: Reemplazar archivo existente (Más rápido)

1. **Descarga o crea tu icono**
   - Tamaño: 32x32 px a 256x256 px
   - Formato: `.ico`, `.png`, o `.svg`

2. **Reemplaza el archivo**
   ```bash
   # Desde tu PC, copia el icono a:
   app/public/favicon.ico
   ```

3. **Si usas PNG o SVG**, actualiza `app/app/layout.tsx`:
   ```tsx
   // Busca la línea del favicon y cámbiala:
   <link rel="icon" href="/favicon.png" type="image/png" />
   // o para SVG:
   <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
   ```

### Opción B: Usar una herramienta online (Sin instalación)

1. Ve a **https://convertio.co/es/ico-converter/** o **https://icoconvert.com/**
2. Sube tu imagen (JPG, PNG, etc.)
3. Descarga el archivo `.ico`
4. Reemplaza `/app/public/favicon.ico`

---

## 🎯 Cambiar logo en la UI de la aplicación

### En la barra lateral/navegación

1. Abre [`app/app/layout.tsx`](app/app/layout.tsx)
2. Busca donde aparece el texto "AL-PDF" o el logo actual
3. Reemplázalo con:

```tsx
// Si quieres usar texto personalizado:
<h1 className="text-2xl font-bold">Mi App PDF</h1>

// Si quieres usar una imagen:
<img 
  src="/logo.png" 
  alt="Logo" 
  className="h-8 w-8"
/>

// O combinar imagen + texto:
<div className="flex items-center gap-2">
  <img src="/logo.png" alt="Logo" className="h-8 w-8" />
  <span className="font-bold">Mi App PDF</span>
</div>
```

---

## 📁 Estructura de carpeta `/app/public/`

```
app/public/
├── favicon.ico          ← Tu icono aquí (reemplaza)
├── logo.png             ← Logo opcional (nueva imagen)
├── logo-dark.png        ← Logo para modo oscuro (opcional)
└── icon.png             ← Logo app (192x192 o 512x512, opcional)
```

---

## 🎨 Recomendaciones de diseño

### Para favicon:
- ✅ Usa colores sólidos o contraste alto
- ✅ Evita detalles muy pequeños (será 32x32 px)
- ✅ Mantén coherencia con tu branding
- ❌ No uses mucho texto

### Para logo:
- ✅ Usa SVG para mejor escalabilidad
- ✅ Asegúrate que sea legible en claro y oscuro
- ✅ Proporciones 1:1 (cuadrado) o 16:9

---

## 🚀 Después de cambiar

1. **Limpiar caché del navegador:**
   ```bash
   # En DevTools (F12), ir a:
   # Network → Disable cache (marcar)
   # Luego: Ctrl + Shift + R (refresh fuerte)
   ```

2. **Si estás en Docker, reconstruir:**
   ```bash
   docker-compose down
   rm -rf ./app/.next
   docker-compose up --build
   ```

3. **Verificar en tu navegador:**
   - La pestaña debe mostrar tu nuevo icono
   - El logo en la app debe reflejarse

---

## 💡 Alternativas: Generadores de favicon

- **https://favicon.io/** - Genera desde emoji, texto o imagen
- **https://www.favicon-generator.org/** - Generador online
- **https://realfavicongenerator.net/** - Más opciones (apple, android, etc.)

---

## ❓ Problemas comunes

### "El favicon no cambia después de recargar"
→ Limpia caché: `Ctrl+Shift+R` en el navegador

### "El logo se ve borroso"
→ Usa SVG en lugar de PNG, o aumenta la resolución

### "La imagen es muy grande"
→ Comprímela: **https://tinypng.com/** (PNG) o **https://imagecompressor.com/**

---

Cualquier archivo de imagen en `/app/public/` se sirve directamente en `/` de la aplicación.
Ejemplo: `/app/public/logo.png` → `http://localhost:3000/logo.png`
