#!/bin/bash

echo "Reiniciando AL PDF Server..."

# Detener servicio
docker-compose down

# Iniciar servicio
docker-compose up -d

echo "AL PDF Server reiniciado"