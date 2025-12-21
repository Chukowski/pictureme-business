# 🚀 PictureMe.now - Cloudflare Optimization

Configuración completa de Terraform para optimizar el rendimiento de PictureMe.now con Cloudflare.

## ✅ Qué hace esta configuración

### 🎯 Cache Rules
- **Imágenes públicas**: Cache completo por 1 mes en edge, 1 día en browser
- **APIs**: Bypass completo de cache 
- **Endpoints autenticados**: Bypass para requests con tokens/cookies
- **Admin/Dashboard**: Bypass para endpoints sensibles

### 🔧 Transform Rules  
- **Strip cookies**: Remueve cookies de /imgproxy/* para permitir cache
- **Normalize queries**: Optimiza query strings para mejor cache hit ratio

### ⚡ Zone Settings
- **Brotli compression**: ON
- **Polish image optimization**: Lossless
- **WebP/AVIF**: Auto conversion
- **Minification**: CSS, HTML, JS
- **Browser integrity**: ON
- **HTTPS**: Always forced

## 🛠️ Setup

### 1. Obtén tu API Token
```bash
# Ve a: https://dash.cloudflare.com/profile/api-tokens
# Crea un token con permisos: Zone:Edit para tu zona
```

### 2. Obtén tu Zone ID
```bash
# Ve a tu dominio en el dashboard
# Copia el Zone ID del sidebar derecho
```

### 3. Configura las variables
```bash
cp terraform.tfvars.example terraform.tfvars
# Edita terraform.tfvars con tus datos reales
```

### 4. Aplica la configuración
```bash
# Inicializa Terraform
terraform init

# Revisa el plan
terraform plan

# Aplica los cambios
terraform apply
```

## 🧪 Verificación

Después de aplicar, verifica que funcione:

```bash
# Test cache de imágenes (debería cachear)
curl -I https://pictureme.now/imgproxy/test.jpg

# Test API (no debería cachear)
curl -I https://pictureme.now/api/test

# Test con auth (no debería cachear)
curl -I https://pictureme.now/imgproxy/test.jpg?token=abc
```

## 📊 Resultado esperado

- ✅ Imágenes servidas desde edge → carga casi instantánea
- ✅ APIs sin afectarse por cache
- ✅ Protección básica sin romper UX  
- ✅ Caching persistente y deduplicado
- ✅ Compatible con S3/imgproxy multi-region

## 🔄 Comandos útiles

```bash
# Ver estado actual
terraform show

# Destruir configuración (si necesitas resetear)
terraform destroy

# Actualizar provider
terraform init -upgrade
```

## 📋 Troubleshooting

**Error de autenticación**: Verifica que tu API token tenga permisos Zone:Edit

**Zone ID incorrecto**: Verifica que el Zone ID corresponda a tu dominio

**Rules duplicadas**: Si ya tienes rules, podrían conflictar. Revisa en el dashboard.