#!/bin/bash

echo "Iniciando AL PDF Server..."

# Verificar si Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "Docker no está instalado. Por favor instala Docker primero."
    exit 1
fi

# Verificar si docker-compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo "docker-compose no está instalado. Por favor instálalo primero."
    exit 1
fi

# Construir y levantar los contenedores
echo "Construyendo y levantando contenedores..."
docker-compose up -d --build

echo "AL PDF Server iniciado en http://localhost:8000"
echo "Para ver los logs: docker-compose logs -f"