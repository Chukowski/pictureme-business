# Event Editor UI - Checklist de Funcionalidades

## 📊 Resumen de Secciones

| Sección | Estado | Notas |
|---------|--------|-------|
| 1. Setup | ✅ Completo | Básico funcional |
| 2. Design | ✅ Completo | Themes, Branding, Watermark |
| 3. Experience (Templates) | ⚠️ Parcial | Falta funcionalidad upload real |
| 4. Workflow (Album Tracking) | ✅ Completo | Stations, Badges |
| 5. Settings | ⚠️ Parcial | Algunas opciones redundantes |

---

## 1. SETUP (EventSetup.tsx)

### ✅ Funcionalidades Presentes
- [x] Event Slug (con copy URL helper)
- [x] Event Title
- [x] Description
- [x] Start/End Date (datetime-local)
- [x] Experience Mode selector (4 modos)
  - Free Experience
  - Lead Capture
  - Pay Per Photo
  - Pay Per Album

### ❌ Funcionalidades Faltantes
- [ ] **Event Thumbnail/Cover Image** - No hay opción para subir imagen de portada
- [ ] **Time Zone selector** - Solo datetime-local sin zona horaria
- [ ] **Location/Venue** - No hay campo para ubicación del evento
- [ ] **Expected Guests count** - Estimado de invitados

### ⚠️ Redundancias/Confusiones
- El "Experience Mode" auto-configura `rules` pero después en Settings también se pueden cambiar manualmente → **Potencial conflicto**

---

## 2. DESIGN (EventDesign.tsx)

### ✅ Funcionalidades Presentes
- [x] Theme Presets (6 presets)
- [x] Brand Colors (Primary, Secondary, Accent)
- [x] Tagline
- [x] Card Radius selector
- [x] Button Style selector
- [x] Event Logo upload placeholder
- [x] Footer Logo upload placeholder
- [x] Brand Name
- [x] Show in Booth/Feed/Prints toggles
- [x] Watermark configuration completa
  - Enable/Disable
  - Type (Image/Text)
  - Pattern (Corner/Strip/Step&Repeat)
  - Position, Size, Opacity

### ❌ Funcionalidades Faltantes
- [ ] **Subida real de logos** - Los placeholders no tienen `onClick` para abrir file picker
- [ ] **Background Image/Pattern** - Para el photo booth
- [ ] **Custom Font selector** - Solo se usan fonts por defecto
- [ ] **Sponsor Logos array** - Definido en types pero no hay UI para agregar múltiples
- [ ] **Dark/Light mode toggle manual** - Se infiere del preset pero no hay selector explícito

### ⚠️ Redundancias/Confusiones
- `theme.brandName` vs header en branding → ¿Cuál se usa dónde?
- `theme.tagline` vs `branding.taglineText` → Dos campos para lo mismo

---

## 3. EXPERIENCE / TEMPLATES (EventTemplates.tsx)

### ✅ Funcionalidades Presentes
- [x] Agregar/Eliminar/Duplicar templates
- [x] Template Name y Description
- [x] AI Pipeline Settings
  - Image Model selector
  - Group Model selector
  - Force Instructions toggle
  - Face Swap toggle
  - Video generation toggle
- [x] Positive Prompt con PromptHelper
- [x] Group Prompt override
- [x] Reference Images grid
- [x] Access Overrides per-template
  - Require Payment
  - Lead Capture Required
  - Hard Watermark
- [x] Station Assignment (cuando album tracking está activo)

### ❌ Funcionalidades Faltantes
- [ ] **Negative Prompt** - Solo hay positive, falta negative prompt
- [ ] **Tokens cost preview** - No muestra cuántos tokens cuesta cada modelo
- [ ] **Template preview/test** - No se puede probar el template antes de publicar
- [ ] **Template categories/tags** - Para organizar muchos templates
- [ ] **Import from Marketplace** - No hay conexión con el marketplace
- [ ] **Aspect Ratio per template** - Usar diferentes ratios por template
- [ ] **LoRA model selector** - Opción para usar modelos LoRA personalizados

### ⚠️ Redundancias/Confusiones
- "Force Instructions" - No está claro qué hace exactamente
- Video generation disponible pero puede no estar habilitado en el plan del usuario

---

## 4. WORKFLOW / ALBUM TRACKING (EventWorkflow.tsx)

### ✅ Funcionalidades Presentes
- [x] Enable/Disable Album Tracking master toggle
- [x] Album Type (Individual/Group)
- [x] Max Photos Per Album
- [x] Require Staff Approval
- [x] Allow Re-Entry
- [x] Print Ready Mode
- [x] Badge Integration completo
  - Auto-Generate Badge toggle
  - Layout Orientation (Portrait/Landscape/Square)
  - Include QR/Name/DateTime toggles
- [x] Stations configuration
  - Add/Remove stations
  - Station name y type (Registration/Booth/Playground/Viewer)
  - QR Scanner required toggle

### ❌ Funcionalidades Faltantes
- [ ] **Badge Template Editor avanzado** - Solo opciones básicas, falta editor visual
- [ ] **Station QR code generator** - No genera los QR para cada station
- [ ] **Station URL copy** - No muestra URL de cada station para compartir
- [ ] **Registration fields configuration** - Qué campos pedir en registro
- [ ] **Station order drag & drop** - Solo se pueden reordenar por number
- [ ] **Station-specific templates** - Asignar templates específicos por station (parcialmente en Templates)

### ⚠️ Redundancias/Confusiones
- Badge Integration aquí vs Legacy Badge Creator en Settings → ¿Cuál usar?
- `badgeIntegration` vs `badgeCreator` vs `badgeTemplate` → 3 sistemas diferentes

---

## 5. SETTINGS (EventSettings.tsx)

### ✅ Funcionalidades Presentes
- [x] Staff Only Mode con PIN
- [x] Allow Free Previews
- [x] Lead Capture toggle
- [x] Require Payment toggle
  - QR to Payment
  - Stripe Code option
- [x] AI Runtime Configuration
  - Default AI Model
  - Max Photos per Session
  - Content Moderation
- [x] Advanced Features
  - Timeline Split View
  - Legacy Badge Creator (¿redundante?)
- [x] Sharing Options
  - Email/WhatsApp toggles
  - Public Feed toggle
- [x] Hardware Integration
  - Print Station toggle

### ❌ Funcionalidades Faltantes
- [ ] **Price configuration** - Si es pay-per-photo/album, ¿dónde se configura el precio?
- [ ] **Email templates** - `sharing.emailTemplate` existe pero no hay editor
- [ ] **SMS sharing** - Definido en types pero no hay toggle
- [ ] **Email after buy** - `sharing.emailAfterBuy` existe pero no hay toggle
- [ ] **Stripe Connect configuration** - Para revenue sharing
- [ ] **Album price** - Precio del álbum si es pay_per_album

### ⚠️ Redundancias/Confusiones
- **Lead Capture** aparece en:
  1. Setup → Al seleccionar mode
  2. Settings → Como toggle separado
  3. Templates → Access Overrides
  → Cuál tiene prioridad?

- **Require Payment** aparece en:
  1. Setup → Al seleccionar mode
  2. Settings → Como toggle separado
  3. Templates → Access Overrides
  → Cuál tiene prioridad?

- **Feed Enabled** aparece en:
  1. Settings → Sharing section
  2. Formdata.settings.feedEnabled
  3. Formdata.rules.feedEnabled
  → ¿Son el mismo?

- **Legacy Badge Creator** en Advanced Features → Si hay badge integration nuevo, ¿por qué mantener el legacy?

---

## 📋 Prioridades de Corrección

### 🔴 Alta Prioridad (Afecta funcionalidad)
1. **Logo upload no funciona** - Placeholder sin funcionalidad
2. **Price configuration missing** - Crítico para modos de pago
3. **Negative prompt faltante** - Importante para control de AI
4. **Station URLs/QR generation** - Necesario para multi-station events

### 🟡 Media Prioridad (UX/Claridad)
1. Consolidar Lead Capture/Payment en un solo lugar
2. Remover "Legacy Badge Creator" si ya no se usa
3. Agregar token cost preview en templates
4. Clarificar cuál branding/theme field se usa dónde

### 🟢 Baja Prioridad (Nice to have)
1. Template categories/tags
2. Import from Marketplace
3. Drag & drop station order
4. Custom font selector

---

## 💡 Sugerencias de Mejora

### 1. Simplificar Modos de Pago
En lugar de tener toggles en 3 lugares, el "Experience Mode" debería controlar todo y solo mostrar opciones de "override" si el usuario quiere algo diferente.

### 2. Consolidar Badge Systems
Elegir UNO:
- `badgeIntegration` (en albumTracking) 
- `badgeCreator` (legacy)
- `badgeTemplate` (nuevo)

Remover los otros dos.

### 3. Agregar Validaciones
- Mostrar warning si pay_per_photo pero no hay price configurado
- Mostrar warning si staff_only pero no hay PIN
- Mostrar warning si album tracking ON pero no hay stations

### 4. Preview Real-time
El LivePreview debería mostrar:
- Cómo se ve el booth con el theme actual
- Preview del badge si está habilitado
- Preview del watermark en una imagen sample

---

## 📝 Campos Definidos pero Sin UI

Revisando `types.ts` y el formulario:

```typescript
// Estos campos existen pero no tienen UI:
- sharing.smsEnabled         // No hay toggle
- sharing.emailTemplate      // No hay editor
- sharing.emailAfterBuy      // No hay toggle
- sharingOverrides.*         // Sección completa sin UI
- badgeCreator.*             // Legacy, debería removerse
- settings.imageSize         // No hay selector de tamaño
```

---

*Documento generado: Diciembre 2024*
*Última revisión del código: EventEditor components*

