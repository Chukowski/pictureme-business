Super Admin Dashboard – PictureMe.now SaaS

Este documento define la estructura completa del Super Admin Dashboard, el panel al que solo tú (owner) o usuarios marcados como super_admin pueden acceder. Es la herramienta central para controlar todo el ecosistema del SaaS: usuarios, planes, tokens, AI models, costos, eventos globales y marketplace.

⸻

🎛️ 1. Home Overview (Global System Summary)

Panel con KPIs de alto nivel.

Cards principales:
	•	Total Users (Individual / Business / Pending / Banned)
	•	Total Active Events (global)
	•	Photos Generated Today
	•	Tokens Spent Today
	•	AI Compute Cost Today (costo real basado en tu costo .04/img)
	•	Revenue Today / MTD / YTD
	•	System Profitability (Revenue - Compute Cost)
	•	Top Resellers (por tokens consumidos)
	•	Top Templates (global)
	•	Model Load (cuántas requests por modelo en el día)

Extra (muy importante):
	•	System Alerts: Créditos de un usuario agotándose, uso anormal, eventos sin actividad, errores de FAL.ai.

⸻

👥 2. Users Management

Gestión completa de usuarios del SaaS.

Listado de usuarios:

Columnas:
	•	Name
	•	Email
	•	Username
	•	Tier (Spark, Vibe, Studio, EventPro, Masters)
	•	Status (Active, Trial, Pending, Suspended)
	•	Tokens disponibles
	•	Eventos activos (si aplica)
	•	Fecha de creación
	•	Último login

Acciones por usuario:
	•	Ver detalle completo
	•	Editar plan manualmente
	•	Ajustar tokens (+ / -)
	•	Suspender cuenta
	•	Reset password
	•	Borrar cuenta
	•	Ver facturación

User Details Panel:
	•	Información general
	•	Tokens ledger (todas las transacciones)
	•	Eventos creados
	•	Fotos generadas
	•	Costos generados por IA
	•	Facturas (via Stripe API)
	•	Logs de actividad

⸻

🧾 3. Business Applications (Resellers / Enterprise)

Solo los business pueden aplicar vía formulario.

Listado de aplicaciones:

Columnas:
	•	Applicant name
	•	Email
	•	Company
	•	Tier solicitado (EventPro o Masters)
	•	AI Score
	•	Estado (Pending, Auto-Approved, Rejected)
	•	Fecha

Detalle de aplicación:
	•	Todas las respuestas del formulario
	•	AI scoring + reasoning
	•	Botón: Approve / Reject
	•	Campo: Notas internas

Al aprobar → enviar email → activar login → asignar tier.

⸻

💳 4. Billing & Pricing Panel

Donde controlas todo el sistema económico del SaaS.

Subsecciones:

4.1. Plans Manager
	•	Crear/editar/eliminar planes Individual
	•	Crear/editar planes Business
	•	Configurar tokens incluidos
	•	Configurar límites: eventos simultáneos, features
	•	Descripción para la landing
	•	Toggle de visibilidad (si un plan no está público)

4.2. Token Packages
	•	Crear paquetes (ej. +5,000 por $X)
	•	Precio configurable
	•	Visible para Individual / Business / Ambos

4.3. Coupons
	•	Crear códigos de descuento
	•	% or fixed amount
	•	Expiración
	•	Número máximo de usos
	•	Aplicable a qué planes

4.4. Stripe Logs
	•	Pagos recientes
	•	Fallas
	•	Subscripciones canceladas
	•	Reintentos de cobro

⸻

🖼️ 5. Events (Global)

Vista global de todos los eventos creados por todos los usuarios.

Listado de eventos:

Columnas:
	•	Event Name
	•	Owner User
	•	Tier del usuario
	•	Photos total
	•	Tokens consumidos
	•	Activo / Inactivo
	•	Fecha de inicio / fin

Acciones:
	•	Ver detalle del evento
	•	Pausar evento
	•	Reanudar
	•	Exportar info

⸻

🧠 6. AI Models Control

Controlas qué modelos están disponibles y cuánto cuestan.

Lista de modelos:
	•	Nombre
	•	Tipo (photo, faceswap, video, enhancer)
	•	FAL.ai ID
	•	Token cost
	•	Visible para: Spark / Vibe / Studio / EventPro / Masters
	•	Estado: Active / Deprecated

Acciones:
	•	Editar información del modelo
	•	Cambiar token cost
	•	Activar/desactivar por tier
	•	Añadir modelos nuevos

⸻

🛒 7. Marketplace Manager

Dónde controlas los templates publicados por usuarios.

Subsecciones:

7.1. Marketplace Items
Tabla:
	•	Creator
	•	Tipo (Template Consumer, Template Enterprise, Prompt Pack)
	•	Price in tokens
	•	Status (Pending, Approved, Rejected)
	•	Downloads

Acciones:
	•	Approve
	•	Reject
	•	Editar metadata
	•	Ver templates comprados

7.2. Revenue Share
	•	Configurar % para creadores (ej. 70/30)
	•	Exportar estadísticas

⸻

📊 8. Analytics (Global)

Un panel avanzado para monitorear actividad global.

Métricas:
	•	Fotos por día / semana / mes
	•	Tokens consumidos por día / semana / mes
	•	Views del feed
	•	Top venues (por tráfico)
	•	Top users (por generación)
	•	Top events
	•	Computo IA estimado vs real
	•	Gráfica de ingresos

⸻

🛠️ 9. System Settings

Configuraciones del sistema.
	•	API keys FAL.ai
	•	S3 / MinIO buckets
	•	SMTP settings
	•	Toggles de features globales
	•	Logos, colores, branding del sistema
	•	Modalidad mantenimiento

⸻

📦 10. Developer Tools (Opcional pero útil)
	•	Ver logs de backend
	•	Ver colas de generación
	•	Trigger manual para reintentar jobs
	•	Panel de errores recientes
	•	API key tester

⸻
