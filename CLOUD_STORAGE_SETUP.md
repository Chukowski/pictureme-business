# Cloud Storage Setup (PostgreSQL + MinIO)

Este proyecto ahora soporta almacenamiento en la nube usando PostgreSQL para metadatos y MinIO para las imágenes.

## 🚀 Configuración Rápida

### 1. Variables de Entorno

Añade estas variables a tu archivo `.env`:

```bash
# PostgreSQL Database
VITE_POSTGRES_URL=postgresql://photouser:Mc4tnqjb.@209.126.5.246:5432/photodb

# MinIO Object Storage
VITE_MINIO_ENDPOINT=storage.akitapr.com
VITE_MINIO_PORT=443
VITE_MINIO_USE_SSL=true
VITE_MINIO_ACCESS_KEY=VDVlK2645nIGwYgG6InN
VITE_MINIO_SECRET_KEY=bMvjHpmeVK3dVEO71Wlr0Ez2rALmVSThwnkdkSmb
VITE_MINIO_BUCKET=photobooth
VITE_MINIO_SERVER_URL=https://storage.akitapr.com
```

### 2. Instalar Dependencias

```bash
npm install
```

Esto instalará:
- `pg` - Cliente de PostgreSQL
- `minio` - Cliente de MinIO (S3-compatible)
- `express` - Servidor backend para API
- `cors` - Middleware de CORS
- `dotenv` - Carga de variables de entorno

### 3. Iniciar el Proyecto

**Opción A: Desarrollo completo (Frontend + Backend)**
```bash
npm run dev:full
```

Esto inicia:
- Frontend en `http://localhost:8080`
- Backend API en `http://localhost:3001`

**Opción B: Solo Frontend (con fallback a localStorage)**
```bash
npm run dev
```

**Opción C: Solo Backend**
```bash
npm run server
```

## 📁 Arquitectura

### Backend API (`server/index.js`)

Endpoints disponibles:

- `GET /health` - Health check
- `GET /api/photos` - Obtener todas las fotos
- `GET /api/photos/:shareCode` - Obtener foto por código de compartir
- `POST /api/photos` - Crear nueva foto
- `DELETE /api/photos/:id` - Eliminar foto

### Frontend Service (`src/services/cloudStorage.ts`)

Funciones principales:

- `savePhotoToCloud()` - Sube imágenes a MinIO y guarda metadata en PostgreSQL
- `getPhotoByShareCode()` - Obtiene foto desde la nube
- `getAllPhotosFromCloud()` - Lista todas las fotos
- `deletePhotoFromCloud()` - Elimina foto de la nube

### Storage Strategy (`src/services/localStorage.ts`)

El servicio ahora implementa una estrategia de **cloud-first con fallback**:

1. **Intenta cloud storage** (PostgreSQL + MinIO)
2. **Si falla**, cae a localStorage (comprimido)
3. **Sin interrupción** del flujo del usuario

## 🗄️ Base de Datos

### Tabla: `photos`

```sql
CREATE TABLE photos (
  id VARCHAR(255) PRIMARY KEY,
  original_image_url TEXT NOT NULL,
  processed_image_url TEXT NOT NULL,
  background_id VARCHAR(255) NOT NULL,
  background_name VARCHAR(255) NOT NULL,
  share_code VARCHAR(6) UNIQUE NOT NULL,
  created_at BIGINT NOT NULL,
  prompt TEXT NOT NULL
);

CREATE INDEX idx_share_code ON photos(share_code);
CREATE INDEX idx_created_at ON photos(created_at DESC);
```

La tabla se crea automáticamente cuando inicias el backend.

## 📦 MinIO (Object Storage)

### Bucket: `photobooth`

Las imágenes se guardan con la siguiente estructura:

```
photobooth/
  ├── photo_123456_abc123_original.jpg
  ├── photo_123456_abc123_processed.jpg
  ├── photo_789012_def456_original.jpg
  └── photo_789012_def456_processed.jpg
```

### URLs Públicas

Las imágenes están disponibles en:
```
https://storage.akitapr.com/photobooth/{filename}
```

## 🔄 Flujo de Guardado

```mermaid
graph TD
    A[Usuario toma foto] --> B[AI procesa imagen]
    B --> C[Intenta cloud storage]
    C -->|Éxito| D[Sube a MinIO]
    D --> E[Guarda metadata en PostgreSQL]
    E --> F[Retorna URLs]
    C -->|Falla| G[Comprime imagen]
    G --> H[Guarda en localStorage]
    H --> F
```

## 🛡️ Ventajas sobre localStorage

1. **Sin límite de 5MB** - MinIO puede almacenar gigabytes
2. **Persistencia real** - No se borra al limpiar caché
3. **Compartible** - URLs permanentes para compartir
4. **Escalable** - Soporta miles de fotos
5. **Backup** - Datos seguros en servidor
6. **Multi-dispositivo** - Acceso desde cualquier lugar

## 🔧 Troubleshooting

### Error: "Cannot connect to PostgreSQL"

Verifica:
- El servidor PostgreSQL está corriendo en `209.126.5.246:5432`
- Las credenciales son correctas
- El firewall permite la conexión

### Error: "MinIO upload failed"

Verifica:
- MinIO está accesible en `https://storage.akitapr.com`
- El bucket `photobooth` existe
- Las credenciales de acceso son correctas
- El bucket tiene permisos de escritura

### Fallback a localStorage

Si el cloud storage falla, la app automáticamente usa localStorage comprimido. Verás warnings en la consola:

```
⚠️ Cloud storage failed, falling back to localStorage
💾 Photo saved to localStorage (compressed)
```

## 📊 Monitoreo

### Verificar estado del backend

```bash
curl http://localhost:3001/health
```

Respuesta esperada:
```json
{
  "status": "ok",
  "timestamp": 1234567890
}
```

### Ver fotos almacenadas

```bash
curl http://localhost:3001/api/photos
```

## 🚀 Producción

Para producción, necesitas:

1. **Desplegar el backend** en un servidor (Railway, Render, etc.)
2. **Actualizar VITE_BASE_URL** para apuntar al backend en producción
3. **Configurar CORS** en el backend para tu dominio
4. **Usar SSL** para todas las conexiones (PostgreSQL, MinIO, API)

### Ejemplo de configuración de producción:

```bash
# .env.production
VITE_POSTGRES_URL=postgresql://user:pass@prod-db.com:5432/photodb
VITE_MINIO_SERVER_URL=https://cdn.miapp.com
VITE_BASE_URL=https://api.miapp.com
```

## 🔐 Seguridad

**⚠️ IMPORTANTE**: Las credenciales actuales son de ejemplo. En producción:

1. **Rotar las credenciales** de MinIO y PostgreSQL
2. **Usar variables de entorno** en el servidor (no .env committeado)
3. **Habilitar SSL** en PostgreSQL si es necesario
4. **Configurar bucket policies** en MinIO para acceso público limitado
5. **Implementar autenticación** en los endpoints de API
6. **Rate limiting** para prevenir abuso

---

**¿Preguntas?** Revisa los logs del servidor con `npm run server` para debugging detallado.

