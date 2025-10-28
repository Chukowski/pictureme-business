# 🐳 Docker Quick Start

## 🚀 Deploy en 3 Pasos

### 1. Configurar Variables de Entorno

Asegúrate de tener un archivo `.env` en la raíz con tus credenciales:

```bash
VITE_FAL_KEY=tu_fal_api_key_aqui
```

(Las demás variables ya tienen valores por defecto en `docker-compose.yml`)

### 2. Build y Run

```bash
# Opción A: Usar el script helper
npm run docker:build
npm run docker:up

# Opción B: Comandos directos
docker-compose build
docker-compose up -d
```

### 3. Verificar

```bash
# Ver logs en tiempo real
npm run docker:logs

# O usar Docker Compose directamente
docker-compose logs -f
```

**Accede a la app:**
- 🌐 Frontend: http://localhost:8080
- 🔌 Backend API: http://localhost:3001/health

---

## 📋 Comandos Útiles

```bash
# Build la imagen
npm run docker:build

# Iniciar contenedores
npm run docker:up

# Ver logs
npm run docker:logs

# Detener contenedores
npm run docker:down

# Rebuild completo
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## 🌐 Deploy a Producción

### Opción 1: Docker en VPS/Cloud Server

```bash
# 1. SSH a tu servidor
ssh user@photo.akitapr.com

# 2. Clonar el repo
git clone <tu-repo>
cd ai-photo-booth-hub

# 3. Crear .env con tus credenciales de producción
nano .env

# 4. Build y run
docker-compose up -d

# 5. Configurar Nginx como reverse proxy
# Ver DEPLOYMENT.md para configuración de Nginx
```

### Opción 2: Railway / Render / Fly.io

Estos servicios soportan deployment automático desde Git:

1. Conecta tu repositorio
2. Configura las variables de entorno
3. Railway/Render detectarán automáticamente el `Dockerfile`
4. Deploy automático

---

## 🔧 Troubleshooting

### Contenedor no inicia

```bash
# Ver logs detallados
docker-compose logs photobooth

# Verificar que el contenedor esté corriendo
docker ps

# Reiniciar contenedor
docker-compose restart
```

### Puerto ya en uso

Si los puertos 8080 o 3001 están ocupados, edita `docker-compose.yml`:

```yaml
ports:
  - "9090:8080"  # Cambiar puerto externo
  - "4001:3001"
```

### Cambiar variables de entorno

1. Edita `.env`
2. Reconstruye el contenedor:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

---

## 📦 Estructura del Container

```
/app
├── dist/           # Frontend build (Vite)
├── server/         # Backend Node.js
├── node_modules/   # Dependencies
└── start.sh        # Startup script
```

**El container corre:**
- Frontend en puerto 8080 (servido con `serve`)
- Backend en puerto 3001 (Node.js Express)

---

## 🎯 Variables de Entorno

Mínimas requeridas en `.env`:

```bash
VITE_FAL_KEY=tu_key_aqui
```

Todas las demás tienen defaults en `docker-compose.yml`.

Para **producción**, también configura:

```bash
VITE_BASE_URL=https://photo.akitapr.com
```

---

## ✅ Checklist de Deployment

- [ ] Archivo `.env` creado con `VITE_FAL_KEY`
- [ ] Docker y Docker Compose instalados
- [ ] Puertos 8080 y 3001 disponibles
- [ ] MinIO bucket configurado (`npm run setup-minio`)
- [ ] PostgreSQL accesible
- [ ] DNS apuntando a tu servidor (si es producción)
- [ ] SSL certificate configurado (Let's Encrypt)

---

¡Listo para desplegar! 🚀

