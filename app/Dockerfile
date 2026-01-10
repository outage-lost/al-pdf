# Etapa 1: Build de la app React
FROM node:18-alpine AS build

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el código fuente
COPY . .

# Construir la aplicación para producción
RUN npm run build

# Etapa 2: Servir estáticos con nginx
FROM nginx:alpine

# Copiar el build al directorio por defecto de nginx
COPY --from=build /app/build /usr/share/nginx/html

# Configuración básica de nginx (single-page app)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto HTTP del contenedor
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
