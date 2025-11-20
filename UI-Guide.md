# PictureMe.now – UI Spec 

> Objetivo: Definir la interfaz completa del SaaS para que el agente de desarrollo pueda implementar **rutas, layouts y componentes** sin inventar reglas de negocio.

Roles principales:
- `individual` (Spark, Vibe, Studio)
- `business_pending` (aplicó a Event Pro / Masters, pero aún sin aprobar)
- `business_eventpro`
- `business_masters`
- `superadmin`

---

## 1. Landing pública

Ruta: `/`

### Estado actual
Ya existe una landing con:
- Hero principal
- Sección de features
- Showcase
- Tabla de planes (Individual / Business toggle)

### Reglas de negocio

1. **Toggle Individual / Business**
   - Tabs: `Individual` | `Business`
   - Individual muestra 3 planes: Spark, Vibe, Studio.
   - Business muestra 2 planes: Event Pro, Masters.

2. **CTAs**
   - Individual tiers:
     - Botón: `Get Started` → redirige a `/register?plan={spark|vibe|studio}`
   - Business tiers (Event Pro, Masters):
     - Botón: `Apply Now` o `Contact Sales`
     - NUNCA abre registro directo.
     - Debe redirigir a `/apply` con query `?tier=event-pro` o `?tier=masters`.

3. **Módulo de explicación de créditos**
   - Texto corto tipo: “Cada plan incluye X créditos. Usamos tokens internos, nunca mostramos precio por imagen.”
   - No poner el costo real por imagen.

---

## 2. Auth – Login / Register / Trial

### 2.1. Login

Ruta: `/login`

- UI ya existe (`Welcome back`).
- Acciones:
  - `Sign in` → llama a API login.
  - Link `Forgot password?` → `/forgot-password`.
  - Link `Start free trial` → `/pricing` (sección Individual).

### 2.2. Register

Ruta: `/register`

- UI ya existe (`Create Account`).
- Registro sólo crea **usuarios Individual** (no Business).
- Permitir pasar `plan` por query string:
  - `/register?plan=spark|vibe|studio`.
- Al completar registro:
  - Crear usuario con rol `individual`.
  - Plan se setea luego en el flujo de billing / upgrade (no se forza desde el registro).

### 2.3. Restricción Business

- No existe `/register?plan=event-pro|masters`.
- Si por error llega esa query:
  - Mostrar mensaje: “Business tiers requieren aplicación” + botón `Apply as reseller` → `/apply`.

---

## 3. Página de Aplicación Business (Resellers)

Ruta: `/apply`

### UI

Sección tipo card centrado:

Campos:
- Full Name
- Company / Brand
- Email
- País / Ciudad
- Tipo de eventos:
  - checkboxes: `Corporate`, `Mall`, `Weddings`, `Private Parties`, `Festivals`, `Other`
- ¿Cuántos eventos al mes? (input numérico o select)
- ¿Tienes hardware propio? (Yes/No + descripción)
- ¿Qué tier te interesa? (Event Pro / Masters)

### Comportamiento

- Enviar a endpoint `POST /api/enterprise/applications`.
- Crear usuario si no existe (o asociar al existente).
- Setear rol `business_pending`.
- Redirigir a `/dashboard` con vista “Pending approval”.

---

## 4. Dashboard – Individual tiers

Ruta: `/dashboard` cuando `role = individual`

### Layout general

- Top bar:
  - Logo + “PictureMe.now”
  - Texto: `Plan: Spark/Vibe/Studio`
  - Token counter mini: `Tokens: 120 / 200`
  - Avatar + menú (Profile, Billing, Logout)

- Tabs laterales o superiores:
  - `Overview`
  - `My Booth`
  - `Templates`
  - `Billing`
  - `Support`

### 4.1. Overview (Individual)

Contenido:

1. **Cards de estado**
   - `Tokens disponibles`
   - `Fotos generadas este mes`
   - `Top template usado`
   - CTA: `Buy more tokens`

2. **Últimas fotos**
   - Grid simple de las últimas 8–12 fotos generadas (con hard watermark si corresponde).

3. **Atajos**
   - `Open My Booth` (abre el modo photobooth individual).
   - `Manage Templates` (lleva a la sección de templates personales).

### 4.2. My Booth (Individual)

- Permite al usuario:
  - Ver su “booth personal” con 2–3 escenas por defecto.
  - Subir sus fondos (según plan).
  - Activar/desactivar templates.
- No existe concepto de “eventos” aquí, solo “mi booth”.

### 4.3. Templates (Individual)

- Lista de templates personales:
  - Thumbnail + nombre.
  - Switch `Active`.
  - Botón `Edit` / `Delete`.

- Acceso al **Marketplace Consumer**:
  - Pestaña `Marketplace`.
  - Filtros: `Free / Paid`, `Seasonal`, `Popular`.

### 4.4. Billing (Individual)

- Mostrar plan actual (Spark, Vibe o Studio).
- Botones:
  - `Upgrade plan`
  - `Manage subscription` (Stripe Portal).
  - `Buy tokens` (packs extra).
- Historial de facturas (tabla simple: fecha, descripción, monto).

### 4.5. Support

- Link a `/support`.
- FAQ corta.
- Botón `Contact support` (email o form).

---

## 5. Dashboard – Business / Reseller

Ruta: `/dashboard` cuando `role = business_pending|business_eventpro|business_masters`

### 5.1. Estados

1. `business_pending`
   - Mostrar pantalla de “Application received”:
     - Mensaje: “Tu aplicación está en revisión”.
     - Card con resumen de lo que contestó.
     - Estado: `Pending AI review / Pending manual review`.
   - NO mostrar Event Management ni tokens.

2. `business_eventpro` / `business_masters`
   - Mostrar **Admin Dashboard actual** como base.
   - Tabs:
     - `Events`
     - `Analytics`
     - `Tokens`
     - `Billing`
     - `Marketplace`
     - (futuro) `Hardware`

### 5.2. Events Tab (ya existe)

- Reusar las cards de eventos que ya tienes:
  - Nombre del evento
  - Estado (Active/Inactive)
  - URLs: Event URL, Feed URL
  - Botones: `Edit`, `More`, `Duplicate`
- Añadir:
  - Chips con:
    - `Tokens usados`
    - `Tokens restantes (del pool general)`
  - Si plan = Masters:
    - Mostrar contador de “Active events: X / Unlimited o X / 2” según lo que definiste.
  - Botón global `Create New Event` (ya existe).

### 5.3. Analytics Tab (ya existe)

- Mantener estructura:
  - Total photos
  - Total views
  - Active events
  - Performance por evento.
- Futuro: añadir filtro por rango de fechas.

### 5.4. Tokens Tab (nuevo)

Contenido:

- Card principal:
  - `Tokens actuales (pool)`.
  - `Estimado de fotos restantes`.
- Gráfico simple: consumo por día / evento.
- Botón `Buy tokens` → flujo Stripe.
- Tabla de `token_transactions` resumida.

### 5.5. Billing Tab (Business)

- Mostrar plan (Event Pro / Masters).
- Límites clave:
  - Tokens incluidos / mes.
  - Cantidad de eventos activos incluidos.
  - Costo por extra evento (texto informativo, no cálculo).
- Botones:
  - `Request plan change` (ej. Event Pro → Masters).
  - `Manage subscription` (Stripe Portal).
- Tabla de facturas.

---

## 6. Super Admin Panel

Ruta: `/admin`  
Visible solo si `role = superadmin`.

### Layout

- Sidebar con secciones:
  - `Overview`
  - `Users`
  - `Plans`
  - `Token Packs`
  - `AI Models`
  - `Enterprise Applications`
  - `Marketplace`
  - `System Metrics`

### 6.1. Overview

- Cards:
  - Total users
  - Total tokens vendidos / mes
  - Costo aproximado de IA / mes
  - Revenue estimado / mes
- Mini gráfico: tokens consumidos vs tokens vendidos.

### 6.2. Users

- Tabla:
  - Email, nombre, rol, plan, tokens actuales, estado (active/suspended).
- Acciones:
  - `View`
  - `Change role`
  - `Adjust tokens` (+/-)
  - `Suspend user`

### 6.3. Plans

- Listado de planes:
  - Spark, Vibe, Studio, Event Pro, Masters.
- Cada plan editable:
  - Nombre, slug.
  - Tipo (`individual` | `business`).
  - `monthly_price`.
  - `included_tokens`.
  - `max_active_events` (para business).
  - Flags: `allow_video`, `allow_faceswap`, `allow_marketplace_sell`, etc.
- Botón `Create Plan` (aunque en MVP casi no lo usarás, es bueno tenerlo).

> **Nota para implementación:**  
> No hardcodear límites en el frontend; leerlos desde la API de `plans`.

### 6.4. Token Packs

- Tabla:
  - Nombre, tokens, precio, visible para (`individual`, `business`, `all`).
- CRUD completo.
- Toggle `is_active`.

### 6.5. AI Models

- Tabla:
  - `id`, `fal_id`, `name`, `type` (`photo`, `video`, `faceswap`, etc.), `tokens_cost_base`, `tiers_enabled`.
- Acciones:
  - Activar/desactivar modelos.
  - Ajustar costo en tokens.
- Nota visual: “Esto solo afecta el costo interno en tokens, no mostrar info técnica al usuario final.”

### 6.6. Enterprise Applications

- Tabla:
  - Usuario, tier solicitado, país, eventos/mes, hardware, status, `ai_score`.
- Detalle de cada aplicación:
  - Ver JSON de respuestas.
  - Ver “AI reasoning”.
- Acciones:
  - `Approve` → asignar rol `business_eventpro` o `business_masters`.
  - `Reject` → mantener usuario como `individual` (si aplica) o desactivar.

### 6.7. Marketplace

- Lista de items:
  - Template name, creator, type (`consumer`, `enterprise`), price_tokens, status.
- Acciones:
  - `Approve`, `Reject`, `Feature`.
- Logs de ventas en tokens.

### 6.8. System Metrics

- Gráficos:
  - Tokens consumidos vs tokens incluidos.
  - Revenue vs costo IA (aprox).
- Alertas:
  - Usuarios que más tokens consumen.
  - Eventos con consumos atípicos.

---

## 7. Photo Booth & Result UI (Notas rápidas)

Aunque ya existen las pantallas, el agente debe asegurar:

1. **Photo Booth UI**
   - Respeta reglas de plan (botones de video/faceswap visibles solo si plan lo permite).
   - Muestra token counter pequeño.
   - Maneja error `NO_TOKENS` con modal de “Contacta a tu operador” o “Buy tokens” según rol.

2. **Result Screen**
   - Módulos:
     - Preview final.
     - QR (si `event.qr_enabled`).
     - Email send.
     - WhatsApp send.
     - Botón `Download`.
     - Si el evento es pay-per-photo:
       - Mostrar CTA de pago / ya pagado.

3. **Feed**
   - Respetar `feed_enabled`.
   - Mostrar solo fotos aprobadas si existe `safe_mode`.

---



