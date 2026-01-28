# Guía de Testing - Filtros 18+

## 🧪 Plan de Pruebas Completo

### Preparación del Ambiente

#### 1. Datos de Prueba Necesarios
```sql
-- En tu base de datos, necesitas:
-- 1. Usuarios con rol 'creator' 
-- 2. Creaciones marcadas como 18+ (is_adult = true)
-- 3. Creaciones normales (is_adult = false o null)
```

#### 2. Setup Local
```bash
# 1. Asegúrate de que el backend está corriendo
cd /Users/zerker/apps/pictureme-go
go run cmd/api/main.go

# 2. En otra terminal, corre el frontend
cd /Users/zerker/apps/ai-photo-booth-hub
npm run dev
```

---

## 📋 Test Cases

### Test Suite 1: Creator Dashboard Feed

#### TC1.1 - Filtro por Defecto
**Objetivo**: Verificar que el contenido 18+ está oculto por defecto

**Steps**:
1. Login como creator
2. Ve a `/creator/dashboard`
3. Scroll hasta la sección "Feed"

**Expected**:
- ✅ Toggle "Show 18+" está visible
- ✅ Toggle está en estado OFF (unchecked)
- ✅ Las creaciones 18+ NO son visibles en el grid
- ✅ Solo se muestran creaciones normales

**Screenshot Location**: `tests/screenshots/tc1.1-default-filter.png`

---

#### TC1.2 - Activar Filtro 18+
**Objetivo**: Verificar que activar el toggle muestra contenido con blur

**Steps**:
1. Desde TC1.1, click en el toggle "Show 18+"
2. Observa el grid de creaciones

**Expected**:
- ✅ Toggle cambia a estado ON (checked, rojo)
- ✅ Aparecen cards adicionales con contenido 18+
- ✅ Las cards 18+ tienen:
  - Badge rojo "18+" en esquina superior derecha
  - Imagen con blur muy fuerte
  - Overlay oscuro semi-transparente
  - Icono circular "18+" grande en el centro
  - Texto "ADULT CONTENT"
  - Texto "Click to view"

**Screenshot**: `tests/screenshots/tc1.2-toggle-on.png`

---

#### TC1.3 - Click to Reveal
**Objetivo**: Verificar que hacer click quita el blur de una imagen

**Steps**:
1. Desde TC1.2, click en una card con blur
2. Observa la misma card

**Expected**:
- ✅ El overlay desaparece inmediatamente
- ✅ La imagen se ve claramente (sin blur)
- ✅ El badge "18+" permanece visible
- ✅ Las otras cards 18+ siguen con blur
- ✅ Puedes hacer hover y ver la información normal

**Screenshot**: `tests/screenshots/tc1.3-revealed.png`

---

#### TC1.4 - Desactivar Filtro
**Objetivo**: Verificar que desactivar el toggle oculta el contenido 18+

**Steps**:
1. Desde TC1.3, click de nuevo en el toggle "Show 18+"
2. Observa el grid

**Expected**:
- ✅ Toggle vuelve a OFF
- ✅ Todas las cards 18+ desaparecen del grid
- ✅ Solo quedan las creaciones normales
- ✅ No hay flicker o glitches visuales

---

### Test Suite 2: Public Profile (Como Visitante)

#### TC2.1 - Vista Sin Login
**Objetivo**: Verificar el filtro funciona sin autenticación

**Steps**:
1. Abre una ventana de incógnito
2. Ve a `/profile/[username-con-contenido-18+]`
3. Scroll a la sección de creaciones

**Expected**:
- ✅ Toggle "Show 18+ Content" es visible
- ✅ Toggle está OFF por defecto
- ✅ Contenido 18+ NO es visible
- ✅ Se ve mensaje "N posts" (excluyendo 18+)

---

#### TC2.2 - Activar en Perfil Público
**Objetivo**: Verificar blur en perfil de otro usuario

**Steps**:
1. Desde TC2.1, click en toggle "Show 18+ Content"
2. Observa el grid

**Expected**:
- ✅ Toggle cambia a ON (rojo)
- ✅ Aparecen imágenes 18+ con blur
- ✅ Badge "18+" visible en cada una
- ✅ Overlay con mensaje "Adult Content"
- ✅ Count de "N posts" aumenta

---

#### TC2.3 - Reveal Individual en Perfil
**Steps**:
1. Desde TC2.2, click en una imagen con blur
2. Observa la imagen

**Expected**:
- ✅ Blur desaparece de ESA imagen
- ✅ Las demás siguen con blur
- ✅ Badge permanece
- ✅ Hover muestra likes/views normalmente

---

### Test Suite 3: Public Profile (Como Propietario)

#### TC3.1 - Vista Como Dueño
**Objetivo**: Verificar que el propietario ve todo sin filtros

**Steps**:
1. Login como creator
2. Ve a tu propio perfil `/profile/[tu-username]`
3. Scroll a creaciones

**Expected**:
- ✅ NO hay toggle "Show 18+" visible
- ✅ TODAS las creaciones son visibles
- ✅ Las 18+ tienen badge pero SIN blur
- ✅ Puedes ver/editar todo normalmente

---

#### TC3.2 - Toggle 18+ en Detalle
**Objetivo**: Verificar que puedes marcar/desmarcar como dueño

**Steps**:
1. Desde TC3.1, click en una creación
2. En el modal de detalle, busca el botón "18+"
3. Click en el botón

**Expected**:
- ✅ Botón está visible (solo para dueño)
- ✅ Estado actual es visible (rojo si es 18+)
- ✅ Click cambia el estado
- ✅ Toast de confirmación aparece
- ✅ Badge se actualiza en el grid

---

### Test Suite 4: Community Feed Block

#### TC4.1 - Feed Block con Filtro
**Objetivo**: Verificar el filtro en el componente reutilizable

**Steps**:
1. Ve a cualquier página que use `<PublicFeedBlock>`
2. Observa la sección "Community Feed"

**Expected**:
- ✅ Toggle "Show 18+" visible
- ✅ Por defecto OFF
- ✅ Contenido 18+ oculto
- ✅ Scroll horizontal funciona

---

#### TC4.2 - Props Control
**Objetivo**: Verificar el prop `showAdultFilter`

**Steps**:
1. En código, cambia `<PublicFeedBlock showAdultFilter={false} />`
2. Recarga la página

**Expected**:
- ✅ Toggle NO aparece
- ✅ Contenido 18+ permanece oculto
- ✅ No hay forma de verlo (feature flag)

---

### Test Suite 5: Edge Cases

#### TC5.1 - Todo es 18+
**Objetivo**: Verificar comportamiento cuando TODO es adulto

**Setup**:
- Usuario con SOLO contenido 18+

**Steps**:
1. Ve al perfil de ese usuario (como visitante)
2. Observa el mensaje

**Expected**:
- ✅ Grid vacío
- ✅ Mensaje: "All content is marked as 18+. Enable the filter to view."
- ✅ Toggle visible
- ✅ Al activar, todo aparece con blur

---

#### TC5.2 - Nada es 18+
**Objetivo**: Verificar cuando NO hay contenido adulto

**Steps**:
1. Usuario sin contenido 18+
2. Ve a su perfil

**Expected**:
- ✅ Toggle NO aparece (no es necesario)
- ✅ O aparece pero disabled/grayed out
- ✅ Todo el contenido visible normalmente

---

#### TC5.3 - Switch Rápido
**Objetivo**: Testing de performance

**Steps**:
1. Toggle ON/OFF rápidamente 10 veces
2. Observa el comportamiento

**Expected**:
- ✅ No hay lag
- ✅ No hay flicker
- ✅ Estado se mantiene consistente
- ✅ No se pierden imágenes

---

### Test Suite 6: Responsive & Mobile

#### TC6.1 - Mobile View
**Objetivo**: Verificar en pantalla pequeña

**Steps**:
1. DevTools > Toggle device toolbar
2. iPhone 12 Pro viewport
3. Prueba todos los casos anteriores

**Expected**:
- ✅ Toggle es touch-friendly (min 44px)
- ✅ Blur overlay es claro en mobile
- ✅ Tap para reveal funciona
- ✅ Grid se adapta correctamente

---

#### TC6.2 - Tablet View
**Steps**:
1. iPad viewport (768px)
2. Verifica comportamiento

**Expected**:
- ✅ Layout se mantiene correcto
- ✅ Toggle posicionado bien
- ✅ Cards con blur se ven bien

---

### Test Suite 7: Accessibility

#### TC7.1 - Keyboard Navigation
**Steps**:
1. Tab hasta llegar al toggle
2. Presiona Space/Enter

**Expected**:
- ✅ Toggle recibe focus visible
- ✅ Space/Enter lo activa/desactiva
- ✅ Anuncio de screen reader (si configurado)

---

#### TC7.2 - Contraste
**Objetivo**: Verificar WCAG compliance

**Expected**:
- ✅ Texto "Show 18+" tiene contraste 4.5:1 mínimo
- ✅ Toggle en OFF es distinguible
- ✅ Toggle en ON (rojo) es claro
- ✅ Overlay text tiene alto contraste

---

## 🐛 Known Issues / Expected Behaviors

### No es un bug:
1. **El blur es muy fuerte** → Intencional, debe ser obvio que hay contenido oculto
2. **Badge siempre visible** → Sí, incluso después de revelar, para recordar el tipo de contenido
3. **Un click revela solo esa imagen** → Correcto, el usuario controla qué ve

### Bugs a reportar:
- [ ] Toggle no cambia de color
- [ ] Blur no se aplica
- [ ] Click no quita el blur
- [ ] Badge no aparece
- [ ] Estado no persiste al navegar

---

## 📊 Test Results Template

```markdown
## Test Run: [FECHA]
**Tester**: [NOMBRE]
**Environment**: [dev/staging/prod]
**Browser**: [Chrome 120, Safari 17, etc]

### Results Summary
- Total Tests: 25
- Passed: ✅ __
- Failed: ❌ __
- Skipped: ⏭️ __

### Failed Tests
| TC ID | Description | Actual Result | Screenshot |
|-------|-------------|---------------|------------|
| TC1.2 | Toggle on blur | No blur applied | [link] |

### Notes
- [Cualquier observación adicional]
```

---

## 🚀 Quick Smoke Test (5 min)

Si tienes poco tiempo, corre este smoke test:

1. ✅ Login → Dashboard → Toggle OFF → No veo 18+
2. ✅ Toggle ON → Veo blur
3. ✅ Click → Blur desaparece
4. ✅ Visita perfil de otro user → Filtro aplicado
5. ✅ Ve a tu perfil → Sin filtro, todo visible

**Si estos 5 pasan, la funcionalidad básica está OK.**

---

## 📝 Checklist Final

Antes de marcar como "DONE":

- [ ] Todos los TC de Test Suite 1 pasan
- [ ] Todos los TC de Test Suite 2 pasan
- [ ] Todos los TC de Test Suite 3 pasan
- [ ] Mobile funciona correctamente
- [ ] No hay console errors
- [ ] Performance es aceptable (< 100ms para toggle)
- [ ] Screenshots documentados
- [ ] No hay regresiones en features existentes

---

## 🎯 Success Criteria

La feature está completa cuando:

1. ✅ **Functional**: Todos los test cases pasan
2. ✅ **Visual**: Blur overlay se ve profesional
3. ✅ **UX**: Toggle es intuitivo sin explicación
4. ✅ **Performance**: No lag al switch
5. ✅ **Responsive**: Funciona en mobile/tablet/desktop
6. ✅ **Accessible**: Keyboard navigation funciona
7. ✅ **No Regressions**: Features existentes intactas

---

**¡Buena suerte con el testing! 🚀**

Si encuentras algún bug, documenta:
1. TC ID
2. Steps to reproduce
3. Expected vs Actual
4. Screenshot/video
5. Browser/device info
