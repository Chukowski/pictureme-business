# Akitá AI Photo Booth - Quick Start

## 🚀 Inicio Rápido

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Iniciar el Sistema

```bash
# Terminal 1: Backend
npm run backend

# Terminal 2: Frontend
npm run dev
```

### 3. Acceder a la Aplicación

Abre tu navegador en: **`http://localhost:8080`**

Serás redirigido automáticamente a `/admin/auth`

## 📋 Flujo de Uso

### Paso 1: Registrar Usuario

1. En la página de login, haz clic en la pestaña **"Register"**
2. Llena el formulario:
   - **Full Name**: Tu nombre completo
   - **Username**: Tu username (será parte de la URL: `/username/evento`)
   - **Email**: Tu correo
   - **Password**: Tu contraseña (mínimo 6 caracteres)
3. Click **"Create account"**

✅ Serás redirigido automáticamente al **Dashboard de Eventos**

### Paso 2: Crear Evento

1. En el Dashboard, click **"Create New Event"**
2. Llena la información básica:
   ```
   Slug: miami-2025
   Title: Miami Conference 2025
   Description: AI Photo Booth para conferencia
   Event Active: ✅ ON
   ```

3. **Agregar Templates (Prompts de AI)**:
   - Click **"Add Template"**
   - Configura cada template:
     - **Name**: Nombre del template (ej: "Ocean Scene")
     - **Description**: Descripción breve
     - **AI Prompt**: El prompt para el AI (ver ejemplo abajo)
     - **Background Images**: Rutas separadas por comas
     - **Campaign Text**: Texto que aparece en la imagen
     - **Active**: ✅ ON
     - **Include Header Logo**: Solo si quieres logo en este template

4. Click **"Create Event"**

### Paso 3: Compartir el Evento

Tu evento está ahora en vivo en:
```
http://localhost:8080/tu-username/tu-evento-slug
```

Ejemplo:
```
http://localhost:8080/juan/miami-2025
```

Comparte esta URL con los asistentes a tu evento.

### Paso 4: Editar Evento

Desde el Dashboard, puedes:
- ✏️ **Edit**: Modificar templates, prompts, configuración
- 👁️ **View**: Ver el evento en vivo
- 🗑️ **Delete**: Eliminar evento (con confirmación)

## 🎨 Ejemplo de Prompt de AI

```
Create a professional underwater scene by compositing these images:
- Preserve the exact person (face, body, pose) from the first image
- Add the majestic octopus with tentacles, turquoise underwater lighting, 
  and bubbles from the second image around the person
- Dress the person in a professional black diving suit
- Position the person in the lower center with octopus tentacles in background
- Blend everything naturally so the person appears to be underwater
- Dramatic turquoise professional underwater photography
```

**Key Points:**
- ✅ Usa "Create by compositing" (no "place into")
- ✅ "Preserve the person from first image"
- ✅ "Add elements from second image around the person"
- ✅ "Blend naturally"

## 🗄️ Base de Datos

El sistema usa **PostgreSQL remoto** con las siguientes tablas:
- `users` - Usuarios registrados
- `events` - Eventos creados
- `processed_photos` - Fotos generadas
- `user_sessions` - Sesiones de usuario

### Resetear Base de Datos (si es necesario)

```bash
python backend/migrate.py
python backend/create_legacy_user.py
```

## 📁 Estructura del Proyecto

```
/admin/auth          → Login/Register (página principal)
/admin/events        → Dashboard de eventos
/admin/events/create → Crear nuevo evento
/admin/events/edit/:id → Editar evento

/:username/:event-slug → Evento público (para asistentes)
/:username/:event-slug/feed → Feed de fotos del evento
```

## 🔧 Configuración

Las variables de entorno están en `.env`:

```bash
# Base de datos PostgreSQL
VITE_POSTGRES_URL=postgresql://user:password@host:5432/db

# MinIO Storage
VITE_MINIO_ENDPOINT=storage.akitapr.com
VITE_MINIO_ACCESS_KEY=your-access-key
VITE_MINIO_SECRET_KEY=your-secret-key
VITE_MINIO_BUCKET=photobooth

# AI (fal.ai)
VITE_FAL_KEY=your-fal-key
VITE_FAL_MODEL=fal-ai/bytedance/seedream/v4/edit

# JWT Secret
SECRET_KEY=your-secret-key
```

## 🐛 Troubleshooting

### "relation users does not exist"
```bash
python backend/migrate.py
python backend/create_legacy_user.py
```

### "Not authenticated"
- Verifica que el backend esté corriendo
- Logout y login nuevamente

### Error de MinIO
```bash
npm run setup-minio
```

## 📚 Documentación Adicional

- `MULTIUSER_ADMIN_GUIDE.md` - Guía completa del sistema multi-usuario
- `AI_PROMPT_OPTIMIZATION.md` - Guía para optimizar prompts de AI
- `AKITA_BRANDING.md` - Configuración de branding Akitá

## 🎯 Características

✅ **Multi-usuario**: Cada usuario tiene sus propios eventos
✅ **Multi-evento**: Crea múltiples eventos por usuario
✅ **Templates personalizables**: Prompts de AI por evento
✅ **Branding dinámico**: Logo y footer por evento
✅ **Cloud storage**: PostgreSQL + MinIO
✅ **Autenticación JWT**: Seguro y escalable
✅ **9:16 Portrait**: Fotos optimizadas para móvil
✅ **QR Codes**: Compartir fotos fácilmente

---

**Powered by Akitá AI** | [akitapr.com](https://akitapr.com)

