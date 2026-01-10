FROM python:3.9-slim

WORKDIR /app

# Instalar dependencias del sistema + LibreOffice + Ghostscript
RUN apt-get update && apt-get install -y \
    build-essential \
    libjpeg-dev \
    zlib1g-dev \
    libmagic1 \
    curl \
    libreoffice \
    ghostscript \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copiar requirements e instalar dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Crear directorio temporal
RUN mkdir -p /app/temp

# Copiar la aplicación
COPY app/ /app/app/

# Exponer puerto
EXPOSE 8000

# Usar --reload para hot-reload en desarrollo
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
