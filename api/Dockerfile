# Etapa 1: Base
FROM python:3.9-slim

# Evitar archivos .pyc y forzar logs en tiempo real
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Instalar dependencias del sistema
# Mantenemos libreoffice para tus otras funciones de conversión
RUN apt-get update && apt-get install -y \
    build-essential \
    libjpeg-dev \
    zlib1g-dev \
    libmagic1 \
    ghostscript \
    libreoffice \
    libffi-dev \
    qpdf \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Actualizar pip e instalar dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Crear directorio temporal con permisos totales
# Esto es crítico para que Ghostscript y LibreOffice escriban archivos temporales
RUN mkdir -p /app/temp && chmod 777 /app/temp

# Copiar todo el proyecto
COPY . .

# Exponer el puerto 8999 (puerto interno del contenedor)
EXPOSE 8999

# COMANDO DE PRODUCCIÓN MEJORADO
# - 4 workers para mejor concurrencia
# - Timeout 600s (10 minutos) para archivos grandes
# - Escucha en 0.0.0.0:8999
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8999", "--workers", "4", "--timeout-keep-alive", "600"]