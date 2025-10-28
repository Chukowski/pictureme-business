# 🚀 Guía de Inicio Rápido

## 🔴 Errores Comunes y Soluciones

### Error: "POST /api/photos/upload 500 (Internal Server Error)"
**Causa**: El backend no está corriendo
**Solución**:
```bash
# Terminal 1: Iniciar backend
npm run server

# Terminal 2: Iniciar frontend
npm run dev
```

O usar un solo comando:
```bash
npm run dev:full
```

---

### Error: "403 Forbidden" en fal.ai
**Causa**: API key de fal.ai inválida o no configurada
**Solución**:
1. Verifica que tu `.env` tenga:
   ```bash
   VITE_FAL_KEY=tu_api_key_aqui
   VITE_BASE_URL=https://photo.akitapr.com
   ```
2. Reinicia el servidor después de cambiar `.env`

---

### Error: "403 Forbidden" en MinIO / Imágenes no se ven
**Causa**: El bucket no tiene permisos públicos de lectura
**Solución**:
```bash
npm run setup-minio
```
Esto configura automáticamente los permisos del bucket `photobooth`.

---

### Error: "QuotaExceededError: localStorage exceeded"
**Causa**: Muchas fotos guardadas localmente
**Solución**:
1. Abre Chrome DevTools (F12)
2. Ve a Console
3. Ejecuta:
   ```javascript
   localStorage.clear()
   location.reload()
   ```

---

### Warning: "button cannot appear as descendant of button"
**Causa**: Bug de React con componentes anidados
**Solución**: Ya está arreglado en el código, solo ignora el warning

---

### Error: QR codes no funcionan / "Photo not found"
**Causa**: El sistema de compartir no está configurado correctamente
**Solución**:
1. Verifica que tu `.env` tenga:
   ```bash
   VITE_BASE_URL=https://photo.akitapr.com
   ```
2. Si estás en local y quieres probar:
   ```bash
   VITE_BASE_URL=http://localhost:8080
   ```
3. Asegúrate de que el backend esté corriendo y las fotos se guarden correctamente
4. Reinicia el frontend después de cambiar `.env`

**Cómo funciona el share:**
- Al tomar una foto, se genera un código único (ej: `PWE1VA`)
- El QR code apunta a: `https://photo.akitapr.com/share/PWE1VA`
- Cualquiera que escanee el QR puede ver y descargar la foto
- Ver más en: `SHARE_SYSTEM.md`

---

## ✅ Inicio Correcto

### Setup Inicial (Solo la primera vez)

1. **Configurar MinIO bucket:**
```bash
npm run setup-minio
```
Esto configura el bucket `photobooth` con permisos públicos para que las imágenes sean visibles.

### Opción 1: Todo en un comando (Recomendado)
```bash
npm run dev:full
```
Esto inicia:
- ✅ Frontend en http://localhost:8080
- ✅ Backend en http://localhost:3001

### Opción 2: Terminales separadas
**Terminal 1 - Backend:**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

---

## 🔍 Verificar que todo funciona

### 1. Backend funcionando
```bash
curl http://localhost:3001/health
```
Debería responder: `{"status":"ok","timestamp":1234567890}`

### 2. Frontend accesible
Abre: http://localhost:8080

### 3. PostgreSQL conectado
Revisa los logs del backend, deberías ver:
```
✅ Database initialized
```

### 4. MinIO configurado
Revisa que tu `.env` tenga todas las variables:
```bash
VITE_MINIO_ENDPOINT=storage.akitapr.com
VITE_MINIO_ACCESS_KEY=VDVlK2645nIGwYgG6InN
VITE_MINIO_SECRET_KEY=bMvjHpmeVK3dVEO71Wlr0Ez2rALmVSThwnkdkSmb
VITE_MINIO_BUCKET=photobooth
```

---

## 📦 Dependencias

Si es la primera vez, instala dependencias:
```bash
npm install
```

---

## 🐛 Debug Mode

Si algo no funciona, verifica los logs:

**Frontend logs**: En la consola del navegador (F12)
**Backend logs**: En la terminal donde corriste `npm run server`

---

## 🎯 Flujo Normal de Uso

1. Iniciar servicios: `npm run dev:full`
2. Ir a http://localhost:8080
3. Seleccionar un template
4. Tomar foto
5. Esperar procesamiento AI
6. Ver resultado con branding

---

## ⚠️ Notas Importantes

- **Sin backend**: Las fotos se guardan solo en localStorage (límite 5MB)
- **Con backend**: Las fotos se guardan en MinIO + PostgreSQL (ilimitado)
- **API Key**: fal.ai necesita créditos válidos para funcionar
- **Storage lleno**: Ejecuta `localStorage.clear()` en consola

---

## 🔑 Variables de Entorno Necesarias

Asegúrate de tener todas estas en tu `.env`:

```bash
# FAL AI
VITE_FAL_KEY=tu_fal_api_key

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
```

---

## 📞 Ayuda

Si sigues teniendo problemas:
1. Verifica que el backend esté corriendo (`curl http://localhost:3001/health`)
2. Revisa los logs de la terminal
3. Limpia localStorage (`localStorage.clear()`)
4. Reinicia ambos servicios

**Recuerda**: Siempre usa `npm run dev:full` para iniciar todo correctamente.

