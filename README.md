# PictureMe Business

Aplicacion frontend enfocada en operaciones business y super-admin.

## Requisitos
- Node.js 18+
- npm 9+

## Desarrollo
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Docker
```bash
docker build -t pictureme-business .
docker run --rm -p 8081:8080 --env-file .env pictureme-business
```

## Variables de entorno
Usa `/Users/zerker/apps/pictureme-business/.env.example` como base.

## Alcance de rutas
- Root: `/` (redirige segun sesion)
- Auth: `/auth`, `/register`
- Business: `/business/*`
- Super Admin: `/super-admin/*`
