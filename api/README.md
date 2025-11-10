# AL PDF Server - Servidor Dedicado para Procesamiento de PDFs

Servidor FastAPI containerizado con Docker que ofrece servicios de procesamiento de PDFs.

## Características

- ✅ Compresión de PDFs con 4 niveles de calidad
- ✅ Unión de múltiples PDFs
- ✅ División de PDFs por páginas o partes
- ✅ Conversión de archivos a PDF
- ✅ Nombres aleatorios para archivos de salida
- ✅ API RESTful completa

## Estructura del Proyecto

al-pdf-server/
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── app/ # Código de la aplicación
├── temp/ # Archivos temporales
├── scripts/ # Scripts de control
└── README.md
text


## Comandos de Instalación y Uso

### Prerrequisitos
- Docker
- Docker Compose

### Comandos Principales

```bash
# Iniciar el servidor (primera vez)
cd al-pdf-server
chmod +x scripts/*.sh
./scripts/start.sh

# Detener el servidor
./scripts/stop.sh

# Reiniciar el servidor
./scripts/restart.sh

# Ver logs en tiempo real
docker-compose logs -f

# Ver estado de los contenedores
docker-compose ps

# Acceder al contenedor
docker exec -it al-pdf-server bash

# Construir imagen
docker build -t al-pdf-server .

# Ejecutar contenedor
docker run -d -p 8000:8000 --name al-pdf-server al-pdf-server

# Detener contenedor
docker stop al-pdf-server

# Eliminar contenedor
docker rm al-pdf-server

# Ver logs
docker logs -f al-pdf-server


#Cambios que hubo en la configuracion de apache para que la api funcione 

  joel@intel-tower  /mnt/Disk500GB/Projects/WebProjects/al-pdf  sudo nano /etc/apache2/sites-available/al-pdf-server.conf
[sudo] contraseña para joel:
  joel@intel-tower  /mnt/Disk500GB/Projects/WebProjects/al-pdf  sudo cat /etc/apache2/sites-available/al-pdf-server.conf
<VirtualHost *:80>
    ServerName localhost
    ServerAlias 127.0.0.1 192.168.0.110

    # ------------------------
    # RUTA PARA EL FRONTEND
    # ------------------------
    Alias /al-pdf /mnt/Disk500GB/Projects/WebProjects/al-pdf/build

    <Directory /mnt/Disk500GB/Projects/WebProjects/al-pdf/build>
        Options FollowSymLinks
        AllowOverride All
        Require all granted

        RewriteEngine On

        RewriteBase /al-pdf/

        # Si no se solicita un archivo real, enviar index.html
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteRule ^ index.html [QSA,L]
    </Directory>

    # ------------------------
    # RUTA PARA EL BACKEND (API)
    # ------------------------
    ProxyPreserveHost On
    ProxyRequests Off

    # BACKEND → Docker (puerto 8000)
    ProxyPass        /al-pdf/api http://localhost:8000/
    ProxyPassReverse /al-pdf/api http://localhost:8000/

</VirtualHost>
  joel@intel-tower  /mnt/Disk500GB/Projects/WebProjects/al-pdf  sudo nano /etc/apache2/sites-available/al-pdf-server.conf
  joel@intel-tower  /mnt/Disk500GB/Projects/WebProjects/al-pdf  sudo cat /etc/apache2/sites-available/al-pdf-server.conf
<VirtualHost *:80>
    ServerName 192.168.0.110
    ServerAlias localhost 127.0.0.1

    # ------------------------
    # RUTA PARA EL FRONTEND
    # ------------------------
    DocumentRoot /mnt/Disk500GB/Projects/WebProjects/al-pdf/build
    Alias /al-pdf /mnt/Disk500GB/Projects/WebProjects/al-pdf/build

    <Directory /mnt/Disk500GB/Projects/WebProjects/al-pdf/build>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
        Order allow,deny
        Allow from all

        # Configuración para React Router
        RewriteEngine On
        RewriteBase /al-pdf/

        # Si es un archivo o directorio existente, servirlo directamente
        RewriteCond %{REQUEST_FILENAME} -f [OR]
        RewriteCond %{REQUEST_FILENAME} -d
        RewriteRule . - [L]

        # Si no existe, redirigir a index.html
        RewriteRule ^ index.html [L]
    </Directory>

    # ------------------------
    # RUTA PARA EL BACKEND (API)
    # ------------------------
    ProxyPreserveHost On
    ProxyRequests Off

    # Configuración específica para la API
    <Location /al-pdf/api>
        ProxyPass http://127.0.0.1:8000/
        ProxyPassReverse http://127.0.0.1:8000/
        ProxyPassReverse /

        # Headers para CORS
        Header always set Access-Control-Allow-Origin "*"
        Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
        Header always set Access-Control-Allow-Headers "Content-Type, Authorization"
    </Location>

    # Manejar preflight CORS
    RewriteCond %{REQUEST_METHOD} OPTIONS
    RewriteRule ^(.*)$ $1 [R=200,L]

</VirtualHost>
  joel@intel-tower  /mnt/Disk500GB/Projects/WebProjects/al-pdf  sudo nano /etc/apache2/sites-available/al-pdf-server.conf
  joel@intel-tower  /mnt/Disk500GB/Projects/WebProjects/al-pdf  sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod rewrite
sudo a2enmod headers

# 6. Reiniciar Apache nuevamente
sudo systemctl restart apache2
Module proxy already enabled
Considering dependency proxy for proxy_http:
Module proxy already enabled
Module proxy_http already enabled
Module rewrite already enabled
Module headers already enabled
  joel@intel-tower  /mnt/Disk500GB/Projects/WebProjects/al-pdf  sudo cat /etc/apache2/sites-available/al-pdf-server.conf
<VirtualHost *:80>
    ServerName 192.168.0.110
    ServerAlias localhost 127.0.0.1

    # ------------------------
    # RUTA PARA EL FRONTEND
    # ------------------------
    DocumentRoot /mnt/Disk500GB/Projects/WebProjects/al-pdf/build
    Alias /al-pdf /mnt/Disk500GB/Projects/WebProjects/al-pdf/build

    <Directory /mnt/Disk500GB/Projects/WebProjects/al-pdf/build>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
        Order allow,deny
        Allow from all

        # Configuración para React Router - MEJORADA
        RewriteEngine On

        # Excluir rutas de API del manejo de React
        RewriteCond %{REQUEST_URI} !^/al-pdf/api/

        # Si es un archivo o directorio existente, servirlo directamente
        RewriteCond %{REQUEST_FILENAME} -f [OR]
        RewriteCond %{REQUEST_FILENAME} -d
        RewriteRule . - [L]

        # Si no existe y no es API, redirigir a index.html
        RewriteRule ^ index.html [L]
    </Directory>

    # ------------------------
    # RUTA PARA EL BACKEND (API) - CORREGIDO
    # ------------------------
    ProxyPreserveHost On
    ProxyRequests Off

    # Configuración específica para la API - PATH COMPLETO
    ProxyPass /al-pdf/api/ http://127.0.0.1:8000/
    ProxyPassReverse /al-pdf/api/ http://127.0.0.1:8000/

    # Headers para CORS
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization"

    # Manejar preflight CORS
    RewriteEngine On
    RewriteCond %{REQUEST_METHOD} OPTIONS
    RewriteRule ^(.*)$ $1 [R=200,L]
</VirtualHost>
  joel@intel-tower  /mnt/Disk500GB/Projects/WebProjects/al-pdf 