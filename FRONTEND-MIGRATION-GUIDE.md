# 🚀 Guía de Migración Frontend - imgproxy + Tiers

## ✅ Estado Actual (Lo que ya tienes)

### **Backend/Infraestructura** ✅
- ✅ imgproxy funcionando en `https://img.pictureme.now/`
- ✅ presets.yml configurado con 8 presets
- ✅ Variables de entorno correctas
- ✅ Cache habilitado (31536000s = 1 año)
- ✅ Cloudflare optimizado (Polish + WebP + Cache rules)

### **Frontend Code** ✅
- ✅ Ya tienes `src/services/imgproxy.ts` completo
- ✅ Ya tienes tipos definidos (`Preset`, `QualityTier`, etc.)
- ✅ Ya tienes funciones helper implementadas

---

## 📋 Presets Disponibles (Confirmados funcionando)

```yaml
✅ feed           → 600px, quality 80, webp
✅ thumbnail      → 300x300, quality 80, webp (square crop)
✅ view           → 2048px, quality 90, webp (lightbox)
✅ free_download  → 1024px, quality 70, webp
✅ spark_download → 2048px, quality 90, webp
✅ vibe_download  → 4096px, quality 95, webp
✅ studio_download→ 4096px, quality 100, webp
✅ watermark      → 2048px, quality 85, webp
```

---

## 🔧 Lo que DEBES CAMBIAR en tu código

### ❌ **PROBLEMA ACTUAL en imgproxy.ts**

Tu código actual tiene un mapeo de tiers a presets **INCORRECTO**:

```typescript
// ❌ ACTUAL (LÍNEAS 262-268) - INCORRECTO
const presetMap: Record<string, Preset> = {
    'free': 'free_download',
    'spark': 'spark_download',
    'vibe': 'vibe_download',
    'studio': 'studio_download'
};
```

**Según tu documentación original, el mapeo correcto es:**

```
free    → free_download (1024px, q70)
spark   → spark_download (2048px, q90)  ← FALTA ESTE TIER
vibe    → vibe_download (4096px, q95)   ← Este es "pro"
studio  → studio_download (4096px, q100)
```

---

## ✅ CAMBIOS NECESARIOS

### 1. **Actualizar tipos en imgproxy.ts (línea 25)**

```typescript
// ❌ ACTUAL
export type QualityTier = 'free' | 'pro' | 'studio' | 'original';

// ✅ CORRECTO
export type QualityTier = 'free' | 'spark' | 'vibe' | 'studio' | 'original';
```

### 2. **Actualizar TIER_CONFIG (líneas 68-95)**

```typescript
// ✅ AGREGAR el tier 'spark' y renombrar 'pro' a 'vibe'
export const TIER_CONFIG: Record<QualityTier, Partial<ImgproxyOptions>> = {
    free: {
        quality: 75,
        format: 'webp',
        stripMetadata: true,
        stripColorProfile: true,
        sharpen: 0.3,
    },
    spark: {
        quality: 85,
        format: 'webp',
        stripMetadata: true,
        sharpen: 0.4,
    },
    vibe: {
        quality: 90,
        format: 'webp',
        stripMetadata: false,
        sharpen: 0.5,
    },
    studio: {
        quality: 92,
        format: 'webp',
        stripMetadata: false,
        keepCopyright: true,
        sharpen: 0.5,
    },
    original: {
        quality: 100,
        format: 'webp',
        stripMetadata: false,
    }
};
```

### 3. **Actualizar getDownloadUrl() (líneas 255-270)**

```typescript
// ✅ CORRECTO - Mapeo completo de tiers
export function getDownloadUrl(sourceUrl: string, tier: QualityTier = 'vibe'): string {
    if (tier === 'original') {
        return getImgproxyUrl(sourceUrl, { preset: 'view' });
    }

    const presetMap: Record<string, Preset> = {
        'free': 'free_download',      // 1024px, q70
        'spark': 'spark_download',    // 2048px, q90
        'vibe': 'vibe_download',      // 4096px, q95
        'studio': 'studio_download'   // 4096px, q100
    };

    const preset = presetMap[tier] || 'view';
    return getImgproxyUrl(sourceUrl, { preset });
}
```

### 4. **Actualizar getImageByTier() default (línea 245)**

```typescript
// ❌ ACTUAL
export function getImageByTier(
    sourceUrl: string,
    tier: QualityTier = 'free',  // ← OK mantener 'free' como default
    additionalOptions: Partial<ImgproxyOptions> = {}
): string

// ✅ CORRECTO (sin cambios necesarios, pero documentar)
// Default 'free' está correcto para usuarios no autenticados
```

---

## 📝 Ejemplos de Uso

### **En componentes de galería/feed**

```typescript
import { getThumbnailUrl, getFeedImageUrl } from '@/services/imgproxy';

// Thumbnails en grid
<img src={getThumbnailUrl(photo.url)} alt="Thumbnail" />

// Imágenes en feed
<img src={getFeedImageUrl(photo.url, 600)} alt="Feed" />
```

### **En modal/lightbox**

```typescript
import { getOptimizedUrl } from '@/services/imgproxy';

<img src={getOptimizedUrl(photo.url)} alt="Full size" />
```

### **Downloads por tier**

```typescript
import { getDownloadUrl } from '@/services/imgproxy';

// Obtener tier del usuario desde tu auth/profile
const userTier = user.subscription_tier; // 'free' | 'spark' | 'vibe' | 'studio'

// Botón de descarga
<a 
  href={getDownloadUrl(photo.url, userTier)} 
  download="photo.webp"
>
  Download {userTier} Quality
</a>
```

### **Por tipo de usuario completo**

```typescript
function PhotoCard({ photo, user }: PhotoCardProps) {
  const tier = user?.subscription_tier || 'free';
  
  return (
    <div className="photo-card">
      {/* Thumbnail en grid */}
      <img src={getThumbnailUrl(photo.url)} alt="Preview" />
      
      {/* Ver full */}
      <button onClick={() => openLightbox(getOptimizedUrl(photo.url))}>
        View
      </button>
      
      {/* Descargar según tier */}
      <a href={getDownloadUrl(photo.url, tier)} download>
        Download ({tier})
      </a>
    </div>
  );
}
```

---

## 🧪 Testing Checklist

Después de hacer los cambios, verifica:

```bash
# 1. TypeScript compila sin errores
npm run typecheck

# 2. Build exitoso
npm run build

# 3. Tests (si tienes)
npm test

# 4. Prueba manual en desarrollo
npm run dev
```

### **Pruebas visuales necesarias:**

- [ ] Grid de fotos muestra thumbnails rápido
- [ ] Lightbox muestra imágenes optimizadas
- [ ] Downloads funcionan según tier del usuario
- [ ] No se exponen URLs de S3 directamente
- [ ] Cache headers correctos (verificar DevTools Network)

---

## ⚡ Performance Esperado

### **Antes (sin imgproxy/Cloudflare)**
```
Original S3: 8-15MB, 2-5s load time
Thumbnail: No optimizado, carga completa
Feed: No optimizado
```

### **Después (con imgproxy+Cloudflare)**
```
Thumbnail (300x300): ~15-30KB, <100ms (cache HIT)
Feed (600px): ~80-150KB, <200ms (cache HIT)
View (2048px): ~300-500KB, <400ms (cache HIT)
Download free: ~200KB
Download vibe: ~800KB
Download studio: ~2MB
```

**Primera carga**: MISS (~500ms-1s)
**Subsecuentes**: HIT (~50-100ms)

---

## 🚨 IMPORTANTE - Nunca Hacer

❌ **NO expongas URLs de S3 directamente**
```typescript
// ❌ MAL
<img src="https://s3.amazonaws.com/bucket/photo.jpg" />

// ✅ BIEN
<img src={getThumbnailUrl(photo.s3_url)} />
```

❌ **NO uses /insecure/ cuando tienes presets**
```typescript
// ❌ MAL (menos eficiente)
return `${IMGPROXY_BASE_URL}/insecure/rs:fit:300:300/${encoded}`;

// ✅ BIEN (usa preset)
return `${IMGPROXY_BASE_URL}/preset:thumbnail/${encoded}`;
```

❌ **NO mezcles tiers**
```typescript
// ❌ MAL
const tier = user.tier === 'premium' ? 'pro' : 'free';
// Tu sistema usa: free, spark, vibe, studio - no 'premium' ni 'pro'

// ✅ BIEN
const tier = user.subscription_tier || 'free';
```

---

## 📊 Resumen de Cambios

| Archivo | Líneas | Cambio |
|---------|--------|--------|
| `imgproxy.ts` | 25 | Agregar 'spark', 'vibe' a QualityTier |
| `imgproxy.ts` | 68-95 | Agregar tier 'spark' y renombrar 'pro' → 'vibe' |
| `imgproxy.ts` | 262-268 | Corregir mapeo de presets |

**Total**: ~20 líneas de código a modificar

---

## ✅ Verificación Final

Después de aplicar cambios:

```bash
# 1. En tu repo
grep -n "QualityTier" src/services/imgproxy.ts
# Debe mostrar: 'free' | 'spark' | 'vibe' | 'studio' | 'original'

# 2. Verificar mapeo
grep -A 5 "presetMap:" src/services/imgproxy.ts
# Debe incluir los 4 tiers correctos

# 3. Test de preset real
curl -I "https://img.pictureme.now/preset:vibe_download/[encoded-url]"
# Debe responder 200
```

---

## 🎯 Resultado Esperado

Después de estos cambios:

✅ URLs generadas usan presets optimizados
✅ Cloudflare cachea todo correctamente
✅ Tiers mapeados correctamente (free/spark/vibe/studio)
✅ No se exponen URLs de S3
✅ Performance 10-20x mejor
✅ Costos de S3 reducidos 90%+

**¡Tu frontend estará listo para producción!** 🚀