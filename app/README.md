# ALPDF Frontend

Aplicación frontend desarrollada con Next.js 16 y React 19.

## 🚀 Tecnologías

- **Framework**: Next.js 16
- **UI**: React 19
- **Estilos**: Tailwind CSS 4
- **Componentes**: Radix UI
- **Gestor de paquetes**: pnpm
- **TypeScript**: 5.x

## 📋 Requisitos Previos

### Desarrollo Local
- Node.js 20.x o superior
- pnpm (se instalará automáticamente con corepack)

### Despliegue con Docker
- Docker 20.x o superior
- Docker Compose 2.x o superior

## 🛠️ Instalación y Desarrollo Local

1. **Instalar dependencias**:
```bash
pnpm install
```

2. **Ejecutar en modo desarrollo**:
```bash
pnpm dev
```

3. **Acceder a la aplicación**:
```
# Abrir navegador en http://localhost:3000
```

## 🐳 Docker

### Construcción y Ejecución Local

1. **Construir la imagen**:
```bash
docker-compose build
```

2. **Iniciar el contenedor**:
```bash
docker-compose up -d
```

3. **Ver logs**:
```bash
docker-compose logs -f frontend
```

4. **Detener el contenedor**:
```bash
docker-compose down
```

### Variables de Entorno

Si tu aplicación necesita variables de entorno, agrégalas en el archivo `docker-compose.yml` en la sección `environment`:

```yaml
environment:
  - NODE_ENV=production
  - NEXT_PUBLIC_API_URL=http://tu-backend-url
  - NEXT_PUBLIC_APP_NAME=ALPDF
```

## 🚢 Despliegue en VPS

### 1. Preparar el VPS

Asegúrate de tener Docker y Docker Compose instalados en tu VPS:

```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

### 2. Clonar el Repositorio

```bash
git clone <tu-repositorio>
cd <directorio-del-proyecto>
```

### 3. Configurar Variables de Entorno

Edita el archivo `docker-compose.yml` y agrega las variables de entorno necesarias.

### 4. Desplegar

```bash
# Construir e iniciar
docker-compose up -d --build

# Verificar que está corriendo
docker-compose ps

# Ver logs
docker-compose logs -f frontend
```

### 5. Configurar Reverse Proxy (Opcional)

Si tienes múltiples aplicaciones en el mismo VPS, configura un reverse proxy con Nginx o Traefik para manejar el tráfico.

**Ejemplo con Nginx**:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:9001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔧 Scripts Disponibles

- `pnpm dev` - Inicia el servidor de desarrollo
- `pnpm build` - Construye la aplicación para producción
- `pnpm start` - Inicia el servidor de producción
- `pnpm lint` - Ejecuta el linter

## 📦 Estructura del Proyecto

```
.
├── app/                # Páginas y rutas de Next.js
├── components/         # Componentes reutilizables
├── hooks/             # Custom hooks
├── lib/               # Utilidades y helpers
├── public/            # Archivos estáticos
├── styles/            # Estilos globales
├── Dockerfile         # Configuración de Docker
├── docker-compose.yml # Orquestación de contenedores
└── package.json       # Dependencias y scripts
```

## 🔒 Seguridad

- El contenedor corre con un usuario no-root (`nextjs`) para mayor seguridad
- Las imágenes están basadas en Alpine Linux para minimizar la superficie de ataque
- Se recomienda usar HTTPS en producción con certificados SSL/TLS

## 📝 Notas

- El puerto por defecto es **9001** (mapea al puerto 3000 interno del contenedor). Puedes cambiarlo en el `docker-compose.yml`
- La aplicación usa una red Docker personalizada (`alpdf-network`) para facilitar la comunicación con otros servicios
- El healthcheck verifica cada 30 segundos que la aplicación esté respondiendo

## 🤝 Soporte

Para problemas o preguntas, por favor abre un issue en el repositorio.
