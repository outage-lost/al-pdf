#!/bin/bash

echo "Deteniendo AL PDF Server..."

# Detener y remover contenedores
docker-compose down

echo "AL PDF Server detenido"