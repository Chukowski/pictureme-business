# Changelog - Sistema Multi-Usuario Akitá

## ✅ Problemas Solucionados

### 1. Error 401 Unauthorized
**Problema**: `POST http://localhost:3001/api/events 401 (Unauthorized)`

**Causa**: El frontend estaba intentando conectarse directamente a `localhost:3001` en lugar de usar el proxy de Vite.

**Solución**:
- Cambié `API_URL` en `eventsApi.ts` de `'http://localhost:3001'` a `''` (string vacío)
- Ahora usa el proxy de Vite configurado en `vite.config.ts` que redirige `/api/*` → `http://localhost:3001/api/*`

### 2. Base de Datos No Existía
**Problema**: `relation "users" does not exist`

**Solución**:
- Creé `backend/migrate.py` para ejecutar migraciones con las mismas variables de entorno que `main.py`
- Ejecuté `python backend/migrate.py` para crear todas las tablas
- Creé `backend/create_legacy_user.py` para crear usuario y evento legacy

### 3. Upload de Imágenes de Templates
**Problema**: No había forma de subir imágenes de templates a cloud storage

**Solución**:
- Creé `src/services/templateStorage.ts` con funciones para:
  - `uploadTemplateImage()` - Subir imagen individual
  - `uploadTemplateImages()` - Subir múltiples imágenes
  - `exportTemplates()` - Exportar templates a JSON
  - `importTemplates()` - Importar templates desde JSON
- Agregué endpoint en backend: `POST /api/templates/upload-image`
- Agregué botones en el formulario:
  - **Upload Images** - Por cada template
  - **Import JSON** - Importar templates
  - **Export JSON** - Exportar templates

## 🎨 Cambios de Branding

### De Siemens a Akitá
- ✅ Logo: `logo-akita.png`
- ✅ Colores: `#0A3D62` (azul), `#F39C12` (naranja)
- ✅ Tagline: "Experiencias fotográficas impulsadas por AI"
- ✅ Footer: "Powered by Akitá AI"
- ✅ Removido todo rastro de Siemens Healthineers

## 🔄 Cambios en el Flujo de la Aplicación

### Antes
```
/ → Index.tsx (photo booth directo)
```

### Ahora
```
/ → /admin/auth (Login/Register) ← PÁGINA PRINCIPAL
    ↓
/admin/events (Dashboard de eventos)
    ↓
/admin/events/create (Crear evento con templates)
    ↓
/{username}/{event-slug} (Evento público para asistentes)
```

## 📝 Nuevas Funcionalidades

### 1. Upload de Imágenes a Cloud Storage (MinIO)

**Cómo usar:**
1. En el formulario de evento, expande un template
2. Click en **"Upload Images"**
3. Selecciona una o más imágenes
4. Las imágenes se suben a MinIO automáticamente
5. Las URLs se agregan al campo "Background Images"

**Ejemplo de URL generada:**
```
https://storage.akitapr.com/photobooth/templates/template_1730000000000_a1b2c3d.jpg
```

### 2. Export/Import de Templates

**Export (Descargar templates como JSON):**
1. En el formulario de evento, click **"Export JSON"**
2. Se descarga un archivo: `templates-event-name-timestamp.json`
3. Contiene todos los templates con sus prompts, imágenes, configuración

**Import (Cargar templates desde JSON):**
1. En el formulario de evento, click **"Import JSON"**
2. Selecciona un archivo `.json` previamente exportado
3. Los templates se agregan a los existentes (no reemplaza)

**Formato del JSON:**
```json
{
  "version": "1.0",
  "exportDate": "2025-11-02T12:00:00.000Z",
  "eventName": "Miami Conference 2025",
  "templates": [
    {
      "id": "uuid-here",
      "name": "Ocean Scene",
      "description": "Underwater exploration",
      "images": [
        "https://storage.akitapr.com/photobooth/templates/ocean.jpg"
      ],
      "prompt": "Create a professional underwater scene...",
      "active": true,
      "includeHeader": false,
      "campaignText": "Dive into innovation"
    }
  ]
}
```

### 3. Templates Sin Valores Por Defecto

**Antes**: Al crear un evento, se cargaban automáticamente 5 templates de Siemens

**Ahora**: Al crear un evento, inicias con **0 templates**
- Debes agregar templates manualmente
- Puedes usar "Load Defaults" si quieres los templates de ejemplo
- Puedes importar templates desde JSON
- Puedes crear templates desde cero

## 🗂️ Archivos Nuevos Creados

### Backend
- `/backend/migrate.py` - Script de migración de base de datos
- `/backend/create_legacy_user.py` - Crear usuario legacy
- Endpoint agregado en `/backend/main.py`: `POST /api/templates/upload-image`

### Frontend
- `/src/services/templateStorage.ts` - Servicio de upload/export/import
- `/src/pages/AdminAuth.tsx` - Página de login/registro
- `/src/pages/AdminEvents.tsx` - Dashboard de eventos
- `/src/pages/AdminEventForm.tsx` - Formulario de crear/editar eventos

### Documentación
- `/README_AKITA.md` - Guía de inicio rápido
- `/CHANGELOG_FINAL.md` - Este archivo

## 🚀 Cómo Usar el Sistema Completo

### 1. Iniciar Sistema
```bash
# Terminal 1: Backend
npm run backend

# Terminal 2: Frontend
npm run dev
```

### 2. Registrar Usuario
1. Ir a `http://localhost:8080` (redirige a `/admin/auth`)
2. Click en "Register"
3. Llenar formulario y crear cuenta

### 3. Crear Evento
1. Dashboard → "Create New Event"
2. Llenar información básica
3. Click "Add Template"
4. **Subir imágenes**:
   - Click "Upload Images"
   - Seleccionar imágenes de tu computadora
   - Se suben a MinIO automáticamente
5. Escribir prompt de AI
6. Configurar campaign text, header, etc.
7. Click "Create Event"

### 4. Reutilizar Templates
1. En un evento existente, click "Export JSON"
2. En otro evento, click "Import JSON"
3. Seleccionar el archivo exportado
4. Los templates se importan con sus imágenes en MinIO

### 5. Compartir Evento
Tu evento está en: `http://localhost:8080/{username}/{event-slug}`

## 🔧 Configuración Técnica

### Variables de Entorno Necesarias
```bash
# PostgreSQL
VITE_POSTGRES_URL=postgresql://user:pass@host:5432/db

# MinIO
VITE_MINIO_ENDPOINT=storage.akitapr.com
VITE_MINIO_ACCESS_KEY=your-key
VITE_MINIO_SECRET_KEY=your-secret
VITE_MINIO_BUCKET=photobooth
VITE_MINIO_SERVER_URL=https://storage.akitapr.com

# AI
VITE_FAL_KEY=your-fal-key
VITE_FAL_MODEL=fal-ai/bytedance/seedream/v4/edit

# JWT
SECRET_KEY=your-secret-key
```

### Estructura de MinIO
```
photobooth/
├── templates/          ← Imágenes de templates
│   ├── template_xxx.jpg
│   └── template_yyy.png
├── photo_xxx_original.jpg
└── photo_xxx_processed.jpg
```

## 📊 Flujo de Datos

### Upload de Imagen de Template
```
Usuario selecciona imagen
    ↓
Frontend: uploadTemplateImage(file)
    ↓
POST /api/templates/upload-image
    ↓
Backend: Sube a MinIO
    ↓
Retorna URL pública
    ↓
Frontend: Agrega URL al template
```

### Export de Templates
```
Usuario click "Export JSON"
    ↓
Frontend: exportTemplates(templates, eventName)
    ↓
Genera JSON con metadata
    ↓
Descarga archivo .json
```

### Import de Templates
```
Usuario selecciona archivo .json
    ↓
Frontend: importTemplates(file)
    ↓
Lee y valida JSON
    ↓
Genera nuevos IDs para templates
    ↓
Agrega templates al evento actual
```

## 🎯 Casos de Uso

### Caso 1: Crear Evento con Imágenes Propias
1. Crear evento nuevo
2. Agregar template
3. Upload imágenes desde tu computadora
4. Escribir prompt personalizado
5. Guardar evento

### Caso 2: Reutilizar Templates en Múltiples Eventos
1. Evento A: Crear templates y exportar JSON
2. Evento B: Importar JSON
3. Los templates (con URLs de MinIO) se copian
4. Personalizar prompts si es necesario

### Caso 3: Compartir Templates Entre Usuarios
1. Usuario A: Exporta templates como JSON
2. Usuario A: Comparte archivo JSON
3. Usuario B: Importa JSON en su evento
4. Las imágenes en MinIO son públicas, funcionan para todos

## 🐛 Troubleshooting

### Error: "Not authenticated"
**Solución**: 
- Logout y login nuevamente
- Verifica que el backend esté corriendo
- Revisa que `API_URL` esté vacío en `eventsApi.ts`

### Error: "Upload failed"
**Solución**:
- Verifica credenciales de MinIO en `.env`
- Ejecuta `npm run setup-minio` para configurar permisos
- Revisa que el bucket `photobooth` exista

### Templates importados no tienen imágenes
**Solución**:
- Las URLs de MinIO deben ser públicamente accesibles
- Verifica que las URLs en el JSON sean correctas
- Asegúrate de que el bucket tenga permisos de lectura pública

## 📈 Próximos Pasos Sugeridos

1. **Galería de Templates**: Crear una galería visual de templates para seleccionar
2. **Preview de Imágenes**: Mostrar thumbnails de las imágenes subidas
3. **Template Marketplace**: Compartir templates entre usuarios en la plataforma
4. **Bulk Operations**: Editar múltiples templates a la vez
5. **Template Versioning**: Historial de cambios en templates

## 🎉 Resumen

✅ **Sistema multi-usuario completo**
✅ **Upload de imágenes a cloud storage**
✅ **Export/Import de templates como JSON**
✅ **Branding Akitá en toda la app**
✅ **Flujo reorganizado: Login → Dashboard → Eventos**
✅ **Base de datos PostgreSQL migrada**
✅ **Autenticación JWT funcional**
✅ **Templates sin valores por defecto**

---

**Powered by Akitá AI** | [akitapr.com](https://akitapr.com)

