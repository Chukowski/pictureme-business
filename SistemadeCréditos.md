# Sistema de Créditos (Tokens) – PictureMe.now

## 1. Objetivo

Implementar un sistema de **tokens** que:

- Oculte el costo real por imagen/video al usuario final.
- Permita definir planes (tiers) con una cantidad de tokens incluida.
- Permita vender **paquetes extra** de tokens.
- Soporte **Enterprise con un pool compartido por cuenta** (varios eventos).
- Soporte lógica de **rollover** opcional (tokens que pasan al siguiente mes).
- Sea configurable desde un **Admin Panel** por el super admin.

> Nota: El costo real aproximado es **$0.04 / imagen**. El “precio mental” para el usuario se expresará en *tokens incluidos por plan* y *estimado de imágenes*, nunca en costo real por imagen.

---

## 2. Conceptos básicos

### 2.1. Token

- 1 **token** := unidad de consumo interno.
- Cada operación de IA descuenta un número de tokens:
  - Foto estándar (nano-banana edit): **1 token**.
  - Faceswap mejorado: **2 tokens**.
  - Foto HD / upscale extra: **+1 token**.
  - Video corto (ej. 5s): **10 tokens**.
  - Video más largo (8–10s): **15 tokens**.
  - Avatar animado: **15–20 tokens**.

> Estos valores deben ser configurables en el Admin Panel (tabla `ai_models` o `feature_costs`).

### 2.2. Wallets / Pools

- **Wallet de usuario (`user_tokens`)**:
  - Representa el saldo global del usuario (consumer o enterprise).
- **Pool enterprise por cuenta**:
  - Para tiers Enterprise, Tokens incluidos = **pool mensual**.
  - Ese pool se usa en **todos los eventos** bajo esa cuenta.
- Rollover: se decidirá por plan si los tokens no usados pasan al siguiente mes.

---

## 3. Modelo de datos (Postgres)

### 3.1. Tabla `plans`

Define los planes (consumer y enterprise).

```sql
CREATE TABLE plans (
  id               SERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,  -- p.ej. "spark", "event_pro"
  type             TEXT NOT NULL CHECK (type IN ('consumer','enterprise')),
  monthly_price_cents INTEGER NOT NULL,
  included_tokens  INTEGER NOT NULL,      -- tokens incluidos al mes
  max_events       INTEGER,               -- para enterprise (NULL = ilimitado)
  max_active_events INTEGER,
  rollover_enabled BOOLEAN DEFAULT FALSE,
  rollover_cap_ratio NUMERIC(4,2),        -- p.ej. 0.5 = se puede trasladar hasta 50% del plan
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

3.2. Tabla user_subscriptions

CREATE TABLE user_subscriptions (
  id                   SERIAL PRIMARY KEY,
  user_id              INTEGER NOT NULL REFERENCES users(id),
  plan_id              INTEGER NOT NULL REFERENCES plans(id),
  status               TEXT NOT NULL CHECK (status IN ('trial','active','past_due','canceled')),
  stripe_customer_id   TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMP,
  current_period_end   TIMESTAMP,
  created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

3.3. Tabla user_tokens (wallet principal)

CREATE TABLE user_tokens (
  user_id        INTEGER PRIMARY KEY REFERENCES users(id),
  current_tokens INTEGER NOT NULL DEFAULT 0,
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

3.4. Tabla token_transactions (ledger)

CREATE TABLE token_transactions (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  delta       INTEGER NOT NULL,   -- +tokens o -tokens
  reason      TEXT NOT NULL,      -- p.ej. "plan_included", "usage_photo", "purchase_package"
  metadata    JSONB,              -- { "event_id":123, "model_id":"nano-banana-edit" }
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

3.5. Tabla token_packages (paquetes extras)

CREATE TABLE token_packages (
  id                   SERIAL PRIMARY KEY,
  name                 TEXT NOT NULL,
  slug                 TEXT UNIQUE NOT NULL,
  tokens               INTEGER NOT NULL,
  price_cents          INTEGER NOT NULL,
  visible_to           TEXT NOT NULL CHECK (visible_to IN ('consumer','enterprise','all')),
  created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

Ejemplo: paquete de 5k fotos a $1k → tokens=5000, price_cents=100000.

⸻

4. Lógica de negocio

4.1. Renovación de plan (Stripe → webhooks)
	1.	Stripe envía invoice.paid / checkout.session.completed.
	2.	Backend:
• Determina user_id y plan_id.
• Calcula tokens_to_add = plans.included_tokens.
• Aplica rollover si corresponde:
• Leer user_tokens.current_tokens y plans.rollover_enabled.
• Si rollover_enabled:
• max_rollover = included_tokens * rollover_cap_ratio.
• rollover_tokens = MIN(current_tokens, max_rollover).
• new_tokens = rollover_tokens + included_tokens.
• Si NO:
• new_tokens = included_tokens.
• Actualiza user_tokens.current_tokens = new_tokens.
• Inserta token_transactions con reason = 'plan_included'.

4.2. Consumo de tokens (uso de IA)

Se usa en endpoints como:
	•	POST /api/media/generate-photo
	•	POST /api/media/generate-video
	•	POST /api/media/faceswap

Flujo:
1.	Resolver user_id (por sesión).
2.	Resolver event_id y su dueño (para auditar).
3.	Determinar feature_type:
• photo_standard, faceswap, video_5s, etc.
4.	Consultar tabla de costos:
• Puede estar en ai_models o feature_costs, p.ej.:
• tokens_needed = feature_costs.tokens.
5.	Verificar saldo:

wallet = get_user_tokens(user_id)
if wallet.current_tokens < tokens_needed:
    return 402 Payment Required


6.Si hay saldo:
• wallet.current_tokens -= tokens_needed.
• Guardar token_transactions con reason = 'usage_<feature>'.
• Llamar a FAL.ai y procesar la operación.
• Enviar respuesta al cliente.

4.3. Compra de tokens (paquetes extra)

Endpoint: POST /api/billing/checkout/tokens
• Recibe package_slug.
• Busca token_packages → tokens, price_cents.
• Crea Checkout Session en Stripe.
• Webhook de Stripe:
• Cuando se paga, sumar tokens al user_tokens.current_tokens.
• Registrar token_transactions con reason = 'purchase_package'.

⸻

5. Reglas específicas por tier (ejemplo, ajustable en Admin Panel)

Consumer (uso individual, no para revender)

• Spark:
• included_tokens = 50
• monthly_price_cents (ej. 1000 = $10)
• Vibe:
• included_tokens = 100
• Studio:
• included_tokens = 200

Enterprise – Event Pro / Masters

• EventPro:
• included_tokens = 5000 (o 10k si decides).
• Uso en varios eventos pequeños.
• Masters:
• included_tokens = 10000 pool común.
• Puede usar esos 10k tokens en uno o varios eventos.
• Máx. 2 eventos activos incluidos.
• Cada evento extra dentro del mismo mes:
• Cobra un fee fijo (ej. $500) + usa el mismo pool.
• Paquetes extra:
• Bloque de 5k tokens por $1k (como ya definiste).

Los valores concretos serán configurables en el Admin Panel.
El sistema de créditos NO expone costo por imagen; solo dice “Este plan incluye ~10,000 imágenes estimadas”.

⸻

6. Endpoints de API (resumen)

6.1. Uso interno (backend)
• GET /api/me/tokens
• Devuelve:

{
  "current_tokens": 1234,
  "plan": {...},
  "estimated_photos_remaining": 1234
}


• GET /api/admin/users/:id/tokens (solo super admin).
• POST /api/admin/users/:id/tokens/adjust
• delta, reason, metadata → para ajustes manuales.

6.2. Billing
• POST /api/billing/create-checkout-session
• Para suscripciones (plan).
• POST /api/billing/checkout/tokens
• Para paquetes de tokens.
• POST /api/billing/webhook
• Manejo de eventos de Stripe.

⸻

7. Admin Panel – Controles de Créditos

7.1. Sección “Planes & Tokens”
• Lista de planes:
• Nombre, tipo, precio, tokens incluidos.
• Form de edición:
• Cambiar monthly_price, included_tokens.
• Toggle rollover_enabled, rollover_cap_ratio.
• Crear nuevos planes si necesitas variantes especiales.

7.2. Sección “Paquetes de Tokens”
• CRUD de token_packages.
• Campos:
• Nombre, tokens, precio, visible_to (consumer, enterprise, all).

7.3. Sección “Costos por Feature / Modelo AI”
• Tabla de ai_models o feature_costs:
• feature_type, tokens_cost, tier_min.
• UI para ajustar tokens por feature sin tocar código.

7.4. Sección “Usuarios & Uso”
• Ver current_tokens de cada usuario.
• Lista de token_transactions filtrable.
• Botón “añadir/quitar tokens” (bonos, compensaciones, pruebas).

⸻

8. Rollover (detalles)
• Configurable por plan:
• rollover_enabled: TRUE/FALSE.
• rollover_cap_ratio: p.ej. 0.5 → solo se puede arrastrar hasta el 50% de los tokens del plan.
• Se aplica solo al renovar:
• En cada periodo:
• Se calcula rollover_tokens y se limpia el excedente, evitando acumulaciones infinitas.
• Para Enterprise es útil:
• Puedes permitir algo de rollover para contratos largos (malls varios meses), sin que acumulen infinito.

⸻

9. Notas para specify-cli / desarrollo asistido por IA
• Crear un spec YAML specs/credits.yml con:
• Modelos: plans, user_subscriptions, user_tokens, token_transactions, token_packages.
• Endpoints:
• GET /me/tokens
• POST /billing/checkout/tokens
• POST /billing/webhook
• POST /admin/users/:id/tokens/adjust
• Reglas de negocio:
• “Antes de cualquier operación de IA, llamar a checkAndConsumeTokens(user_id, feature_type)”.
• Indicar en el spec:
• Errores estándar: 402 NO_TOKENS, 403 FEATURE_NOT_AVAILABLE_FOR_PLAN, etc.
• Tests esperados: consumo correcto, no consumo en caso de error de FAL.ai (si falla el modelo, revertir tokens o no descontarlos).

⸻


