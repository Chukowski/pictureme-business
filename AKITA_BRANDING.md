# Akitá Branding Configuration

Guía para aplicar la identidad visual de **Akitá** (akitapr.com) sobre las imágenes generadas por el Photo Booth AI.

## 1. Overview

- Las plantillas de escena generan una imagen 9:16 (1080×1920) con el fondo AI.
- El servicio `imageOverlay.ts` añade las capas de branding sobre la imagen final.
- Sólo las escenas que establecen `includeHeader: true` añaden la franja superior con el logo.
- El resto de plantillas mantienen la imagen AI limpia, pero se puede habilitar el branding si el evento lo requiere.

## 2. Composición Default

```
┌─────────────────┐
│    Logo Akitá    │ ← Banda superior (blanco)
├─────────────────┤
│                 │
│   Foto AI 9:16  │ ← Imagen generada por fal.ai
│                 │
├─────────────────┤
│  Tagline Akitá  │ ← Texto sobre banda oscura
├─────────────────┤
│  Footer Visual  │ ← Arte transparente (PNG)
└─────────────────┘
```

- **Tagline por defecto**: `Powered by Akitá — experiencias visuales para tus eventos.`
- **Colores sugeridos**:
  - Fondo de header: `#FFFFFF`
  - Fondo de tagline/footer: `#000000`
  - Color de texto: `#FFFFFF`

## 3. Escenarios de Campaña

| Plantilla        | Mensaje clave                                   | Texto de campaña sugerido        |
|------------------|--------------------------------------------------|----------------------------------|
| Particle Field   | Innovación tecnológica y energía                 | “Experiencias impulsadas por AI” |
| Ocean Depths     | Colaboración y adaptabilidad                     | “¿Necesitas manos extra?”        |
| Jungle Explorer  | Agilidad y respuesta rápida                      | “Corre ligero. Llega primero.”   |
| Rain Magic       | Sostenibilidad e impacto positivo                | “Simplemente sostenible.”        |
| Mystical Leaves  | Cuidado al detalle y soporte continuo            | “Aligera tu carga.”              |

Puedes ajustar cada mensaje en las plantillas (`campaignText`) desde el panel de administración.

## 4. Recursos de Branding

- Logo principal: `/src/assets/backgrounds/logo-akita.png`
- Footer visual: `/src/assets/backgrounds/Footer_DoLess_Transparent.png` (personalizable)
- Colores recomendados:
  - Primario: `#0A3D62`
  - Secundario: `#F39C12`

> ⚠️ Reemplaza los archivos PNG por tus propios assets si deseas actualizar la identidad visual.

## 5. Configuración en Código

### `src/services/imageOverlay.ts`

```ts
const LOGO_PATH = '/src/assets/backgrounds/logo-akita.png';
const taglineText = 'Powered by Akitá — experiencias visuales para tus eventos.';
```

Propiedades clave:
- `includeHeader`: controla si se dibuja la franja blanca con el logo.
- `campaignText`: texto opcional sobre la imagen AI (se renderiza al inicio).
- `headerBackgroundColor` y `backgroundColor`: ajustan los colores de bandas.

### `src/services/aiProcessor.ts`

```ts
const brandedImageUrl = await applyBrandingOverlay(processedUrl, {
  backgroundColor: '#000000',
  headerBackgroundColor: '#FFFFFF',
  taglineText: 'Powered by Akitá — experiencias visuales para tus eventos.',
  includeHeader,
  campaignText,
});
```

## 6. Recomendaciones

1. **Plantillas con props extra** (Particle Field) deben listar todas las imágenes en `backgroundImageUrls`.
2. Ajusta el `taglineText` por evento para resaltar la marca del cliente si es necesario.
3. Previsualiza cada template en el Admin para validar que el branding no tapa elementos clave.
4. Si reemplazas el footer PNG, usa un archivo con transparencia para conservar la capa negra del overlay.
5. Para feeds públicos, combina el branding con mensajes cortos que refuercen la activación o campaña.

## 7. Próximos Pasos

- Crear un footer específico de Akitá (quita las referencias a “Do less” del asset actual).
- Añadir la opción de logos por evento en la API.
- Permitir overlays dinámicos por template (logos de sponsors, fechas, etc.).
- Documentar presets de colores para distintos clientes dentro del panel administrativo.

