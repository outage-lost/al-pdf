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

# Exponer el puerto de tu API (FastAPI/Uvicorn)
EXPOSE 8999

# COMANDO DE PRODUCCIÓN MEJORADO
# - Quitamos --reload
# - Aumentamos el timeout a 5 minutos (300s) por los archivos grandes de 70MB
# - Usamos 2 workers para no saturar la RAM si LibreOffice y Ghostscript corren al tiempo
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8999", "--workers", "2", "--timeout-keep-alive", "300"]