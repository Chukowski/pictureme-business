# 🎉 AI Photo Booth - Multiuser Platform

Plataforma multiusuario para eventos con photobooth AI, feeds en vivo y configuración dinámica.

## 🚀 Quick Start

### 1. Instalar Dependencias

```bash
# Frontend (Node.js)
npm install

# Backend (Python)
cd backend
pip install -r requirements.txt
cd ..
```

### 2. Configurar Base de Datos

```bash
# Ejecutar migraciones
npm run migrate
```

Esto creará las tablas necesarias:
- `users` - Usuarios de la plataforma
- `events` - Eventos con configuración
- `processed_photos` - Fotos procesadas por evento
- `user_sessions` - Tokens de autenticación

### 3. Iniciar Servicios

```bash
# Opción 1: Todo en un comando
npm run dev:full

# Opción 2: Servicios separados
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend Python
npm run backend
```

## 📦 Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (React)                  │
│  - Dynamic routes: /{user}/{event}                  │
│  - Event config loaded from backend API             │
│  - Live feed with polling                           │
└──────────────────┬──────────────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────────────┐
│              Backend (FastAPI/Python)                │
│  - JWT Authentication                                │
│  - Events CRUD                                       │
│  - Photo upload to MinIO                            │
│  - Feed endpoint                                     │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐   ┌────────▼─────────┐
│   PostgreSQL   │   │      MinIO       │
│   (Metadata)   │   │ (Image Storage)  │
└────────────────┘   └──────────────────┘
```

## 🔑 API Endpoints

### Authentication
```
POST /api/auth/register - Crear usuario
POST /api/auth/login    - Login (devuelve JWT token)
GET  /api/auth/me       - Info del usuario actual
```

### Events
```
POST /api/events                    - Crear evento (requiere auth)
GET  /api/events/{user}/{event}     - Get event config (público)
GET  /api/events/{id}/photos        - Feed de fotos del evento
```

### Photos
```
POST /api/photos/upload - Subir foto procesada (requiere auth)
```

## 🌐 URLs Dinámicas

### Photobooth
```
/{userSlug}/{eventSlug}
```
Ejemplo: `/demo/akita-innovate-2025`

Carga la configuración del evento desde la base de datos:
- Plantillas personalizadas
- Colores y branding
- Configuración de AI

### Feed en Vivo
```
/{userSlug}/{eventSlug}/feed
```
Ejemplo: `/demo/akita-innovate-2025/feed`

Muestra las fotos del evento en tiempo real con polling automático cada 5 segundos.

## 🎨 Configuración por Evento

Cada evento puede personalizar:

### Theme
```json
{
  "brandName": "Akitá",
  "primaryColor": "#0A3D62",
  "secondaryColor": "#F39C12",
  "tagline": "Experiencias fotográficas impulsadas por AI."
}
```

### Branding
```json
{
  "logoPath": "/src/assets/backgrounds/logo-akita.png",
  "footerPath": "/src/assets/backgrounds/Footer_DoLess_Transparent.png",
  "headerBackgroundColor": "#FFFFFF",
  "footerBackgroundColor": "#000000",
  "taglineText": "Powered by Akitá — experiencias visuales para tus eventos."
}
```

### Templates
```json
[
  {
    "id": "glares",
    "name": "Particle Field",
    "description": "Tech Innovation",
    "images": ["/path/to/background.jpg", "/path/to/prop.png"],
    "prompt": "AI prompt for this scene...",
    "active": true,
    "includeHeader": true,
    "campaignText": "Your text here"
  }
]
```

### Settings
```json
{
  "aiModel": "fal-ai/bytedance/seedream/v4/edit",
  "imageSize": {"width": 1080, "height": 1920},
  "feedEnabled": true,
  "moderationEnabled": false,
  "maxPhotosPerSession": 3
}
```

## 🔐 Autenticación

### Registrar Usuario
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "demo",
    "email": "demo@example.com",
    "password": "demo123",
    "full_name": "Demo User"
  }'
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "demo",
    "password": "demo123"
  }'
```

Devuelve:
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "demo",
    "email": "demo@example.com",
    "slug": "demo"
  }
}
```

### Usar Token
```bash
curl -X POST http://localhost:3001/api/events \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{...}'
```

## 📸 Crear Evento

```bash
curl -X POST http://localhost:3001/api/events \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "my-event-2025",
    "title": "My Amazing Event",
    "description": "Event description",
    "theme": {
      "brandName": "My Brand",
      "primaryColor": "#ff0000"
    },
    "templates": [...],
    "branding": {...},
    "settings": {"feedEnabled": true}
  }'
```

## 🐳 Docker Deployment

```bash
# Build
docker-compose build

# Start all services
docker-compose up -d

# Logs
docker-compose logs -f

# Stop
docker-compose down
```

## 📝 Scripts

```bash
npm run dev          # Frontend dev server (Vite)
npm run backend      # Backend dev server (FastAPI)
npm run dev:full     # Frontend + Backend juntos
npm run migrate      # Ejecutar migraciones SQL
npm run setup-minio  # Configurar permisos MinIO
npm run build        # Build frontend para producción
```

## 🔧 Variables de Entorno

```bash
# Frontend (.env)
VITE_FAL_KEY=your_fal_api_key
VITE_API_URL=http://localhost:3001
VITE_BASE_URL=https://photo.akitapr.com

# Backend (.env)
DATABASE_URL=postgresql://user:pass@host:5432/db
SECRET_KEY=your-secret-key
VITE_MINIO_ENDPOINT=storage.akitapr.com
VITE_MINIO_ACCESS_KEY=...
VITE_MINIO_SECRET_KEY=...
VITE_MINIO_BUCKET=photobooth
VITE_FAL_KEY=your_fal_api_key
```

## 🎯 Flujo de Trabajo

1. **Usuario registra cuenta** → POST `/api/auth/register`
2. **Usuario crea evento** → POST `/api/events`
3. **Visitante accede** → `/{user}/{event}`
4. **Config se carga desde DB** → GET `/api/events/{user}/{event}`
5. **Visitante toma foto** → AI procesa imagen
6. **Foto se sube** → POST `/api/photos/upload`
7. **Aparece en feed** → GET `/api/events/{id}/photos`

## 🆕 Cambios desde v1.0

- ✅ Multiusuario con autenticación JWT
- ✅ Múltiples eventos por usuario
- ✅ Configuración dinámica (theme, templates, branding)
- ✅ Feed en vivo con polling
- ✅ URLs dinámicas `/{user}/{event}`
- ✅ Backend FastAPI (Python) en lugar de Express
- ✅ Migración de datos existentes
- ✅ Branding por evento (logo, colores, overlays)

## 📚 Documentación

- `docs/multiuser-roadmap.md` - Plan de migración
- `AKITA_BRANDING.md` - Sistema de branding
- `SHARE_SYSTEM.md` - Sistema de compartir
- `CLOUD_STORAGE_SETUP.md` - Configuración de almacenamiento

## 🤝 Contributing

Ver `docs/multiuser-roadmap.md` para el plan de evolución y próximos pasos.

## 📄 License

Propietario - Akitá (akitapr.com)
