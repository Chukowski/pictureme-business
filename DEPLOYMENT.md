# 🚀 Guía de Deployment - AI Photobooth

## 📦 Opción 1: Docker (Recomendado)

### Prerequisitos
- Docker y Docker Compose instalados
- Archivo `.env` configurado con tus credenciales

### Pasos

#### 1. Crear archivo `.env` en la raíz del proyecto

```bash
# FAL AI
VITE_FAL_KEY=tu_fal_api_key_aqui

# PostgreSQL
VITE_POSTGRES_URL=postgresql://photouser:Mc4tnqjb.@209.126.5.246:5432/photodb

# MinIO
VITE_MINIO_ENDPOINT=storage.akitapr.com
VITE_MINIO_PORT=443
VITE_MINIO_USE_SSL=true
VITE_MINIO_ACCESS_KEY=VDVlK2645nIGwYgG6InN
VITE_MINIO_SECRET_KEY=bMvjHpmeVK3dVEO71Wlr0Ez2rALmVSThwnkdkSmb
VITE_MINIO_BUCKET=photobooth
VITE_MINIO_SERVER_URL=https://storage.akitapr.com

# App
VITE_BASE_URL=https://photo.akitapr.com
```

#### 2. Build y Run con Docker Compose

```bash
# Build la imagen
docker-compose build

# Iniciar el contenedor
docker-compose up -d

# Ver logs
docker-compose logs -f
```

#### 3. Verificar que está corriendo

```bash
# Frontend
curl http://localhost:8080

# Backend
curl http://localhost:3001/health
```

### Detener el servicio

```bash
docker-compose down
```

---

## 🌐 Opción 2: Deploy Manual

### Frontend (Vite Build)

```bash
# 1. Build del frontend
npm run build

# 2. Los archivos estarán en dist/
# Sube esta carpeta a tu servidor web (Nginx, Apache, etc.)
```

### Backend (Node.js)

```bash
# 1. En tu servidor, clona el repo
git clone <tu-repo>
cd ai-photo-booth-hub

# 2. Instala dependencias
npm install

# 3. Crea .env con las variables de producción

# 4. Inicia el backend con PM2
npm install -g pm2
pm2 start server/index.js --name photobooth-api

# 5. Guarda la configuración de PM2
pm2 save
pm2 startup
```

---

## 🔧 Configuración de Nginx (Servidor Web)

Crea el archivo `/etc/nginx/sites-available/photo.akitapr.com`:

```nginx
server {
    listen 80;
    server_name photo.akitapr.com;

    # Redirigir HTTP a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name photo.akitapr.com;

    # SSL certificates (usa Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/photo.akitapr.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/photo.akitapr.com/privkey.pem;

    # Frontend - archivos estáticos
    root /var/www/photo.akitapr.com/dist;
    index index.html;

    # Configuración para SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API - proxy a Node.js
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Camera permission
    add_header Permissions-Policy "camera=(self)" always;
}
```

Activar el sitio:

```bash
sudo ln -s /etc/nginx/sites-available/photo.akitapr.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔐 SSL Certificate (Let's Encrypt)

```bash
# Instalar certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d photo.akitapr.com

# Auto-renovación (ya configurado automáticamente)
sudo certbot renew --dry-run
```

---

## 📊 Monitoreo

### Ver logs del backend

```bash
# Con PM2
pm2 logs photobooth-api

# Con Docker
docker-compose logs -f photobooth
```

### Verificar servicios

```bash
# Frontend
curl https://photo.akitapr.com

# Backend
curl https://photo.akitapr.com/api/photos

# Health check
curl http://localhost:3001/health
```

---

## 🔄 Actualizar la App

### Con Docker

```bash
# 1. Pull los cambios
git pull

# 2. Rebuild y restart
docker-compose down
docker-compose build
docker-compose up -d
```

### Manual

```bash
# Frontend
npm run build
# Sube dist/ a tu servidor

# Backend
pm2 restart photobooth-api
```

---

## 🐛 Troubleshooting

### El frontend no carga

- Verifica que Nginx esté corriendo: `sudo systemctl status nginx`
- Revisa logs: `sudo tail -f /var/log/nginx/error.log`
- Verifica que los archivos estén en `/var/www/photo.akitapr.com/dist`

### El backend no responde

- Verifica que Node esté corriendo: `pm2 status` o `docker-compose ps`
- Revisa logs: `pm2 logs photobooth-api` o `docker-compose logs`
- Verifica puerto 3001: `netstat -tulpn | grep 3001`

### Error 403 en MinIO

```bash
npm run setup-minio
```

### PostgreSQL no conecta

- Verifica que el servidor PostgreSQL esté accesible
- Verifica la connection string en `.env`
- Prueba la conexión: `psql postgresql://photouser:Mc4tnqjb.@209.126.5.246:5432/photodb`

---

## 📈 Escalabilidad

Para producción con mucho tráfico:

1. **Load Balancer**: Usa múltiples instancias del backend
2. **CDN**: Sirve los assets estáticos vía CloudFlare
3. **Redis**: Cachea las queries frecuentes
4. **Horizontal Scaling**: Múltiples containers con Docker Swarm o Kubernetes

---

## 🔑 Variables de Entorno Importantes

Asegúrate de configurar estas variables en producción:

```bash
NODE_ENV=production
VITE_BASE_URL=https://photo.akitapr.com
VITE_FAL_KEY=<tu_key_produccion>
```

---

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs primero
2. Verifica que todos los servicios estén corriendo
3. Prueba la conectividad a PostgreSQL y MinIO
4. Verifica que el DNS apunte correctamente a tu servidor

¡Listo para producción! 🎉

