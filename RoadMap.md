
# Roadmap de Features – PictureMe.now (SaaS)

Este documento detalla el roadmap de desarrollo para convertir PictureMe.now en una plataforma SaaS completa, incorporando los módulos esenciales y avanzados necesarios para operadores, resellers y usuarios enterprise.


---

## 🚀 Fase 1 — Core SaaS (Fundamentales)

### 1. Sistema de Créditos (Tokens)

* Consumo por imagen, video y faceswap
* Paquetes de crédito configurables
* Rollover (si se define política) o reset mensual
* Token ledger con auditoría

### 2. Autenticación + Suscripciones (Stripe)

* Stripe Checkout + Customer Portal
* Webhooks para renovación, expiración y fallos de pago
* Toggle de cupones (ej. 50% launch)
* Diferentes planes (Spark, Vibe, Studio, EventPro, Masters)

### 3. Admin Panel – Super Admin

* CRUD de planes
* Ajuste dinámico de precios
* Configuración de tokens por plan
* Ajustes de costos internos por modelo
* Vista de consumo global
* Suspender/activar cuentas

### 4. Enterprise Application Flow

* Formulario para revendedores
* Scoring con IA
* Aprobación/Rechazo/Review
* Activación automática del tier correspondiente


---

## 🖼️ Fase 2 — Experiencia del Evento (Módulos de Alto Valor)

### 5. Lead Capture

* Captura de nombre, email, teléfono
* Envío automático a Google Sheets / CRM
* Export CSV

### 6. QR Code a Plataforma de Pago

* Generación automática por evento
* Página de pago configurada en Stripe
* URL única por evento
* Toggle para activar o desactivar

### 7. Toggle QR por Evento

* Activar o desactivar QR en resultados
* Alternar entre QR público, QR privado, o sin QR

### 8. Pago con Código en Stripe

* Flujo: usuario escanea QR → ingresa código del evento → paga
* Endpoint de verificación
* Email automático post-compra

### 9. Timeline con Foto Original (Split View)

* Foto original + foto generada
* Swipe horizontal o vista comparativa
* Toggle por evento

### 10. Hard Watermark (Step & Repeat)

* Marca de agua fija en previsualización
* Estilo "evento patrocinado"
* Configuración de tamaño, opacidad y posición
* Disponible como toggle

### 11. Print Section

* Imagen limpia lista para imprimir
* Plantillas 4x6, 5x7, tiras 2x6
* Descarga PDF para kioskos

### 12. Feed Toggle

* Activar/desactivar feed para pantallas
* Configuración de transición, duración y layout

### 13. Envío Automático por Email Luego de Comprar

* Ideal para quienes venden fotos impresas
* Flujo: pago confirmado → email con JPG clean

### 14. Envío por WhatsApp

* Botón "Enviar a mi WhatsApp"
* API Twilio o fallback por WhatsApp Web
* Confirmación y logs


---

## 🎛️ Fase 3 — Marketplace

### 15. Marketplace Consumer

* Usuarios pueden subir templates
* Templates gratis o de pago (en tokens)
* Split de revenue configurable

### 16. Marketplace Enterprise

* Plantillas profesionales
* Branding corporativo
* Plantillas exclusivas por empresa

### 17. Prompts Pack

* Packs de prompts optimizados
* Venta en tokens
* Clasificación por temática (Navidad, Halloween, Bodas, etc.)


---

## 🧠 Fase 4 — AI Modules

### 18. Optimización de Prompts con LLM

* LLM ajusta el prompt
* Sugiere estilos y mejoras

### 19. AI Model Switching

* Modelos photo-edit, faceswap, enhancers, etc.
* Costos variables según modelo
* Panel para activar/desactivar modelos disponibles

### 20. Video Generation

* Image-to-video 5s / 8s
* Tokens altos
* Cola de generación

### 21. Animated Avatars

* Entrada: 1 foto
* Salida: avatar animado loop
* Modelos [FAL.ai](http://FAL.ai) compatibles


---

## 🛡️ Fase 5 — Compliance & Infra

### 22. Logging y Auditoría

* Eventos de sistema
* Consumo por user/event

### 23. Backups Automáticos

* Postgres + CouchDB + S3
* Cron diario

### 24. Rate Limiting

* Limitar abuso por evento
* Control por IP

### 25. Monitoreo

* Sentry
* Uptime robot
* Métricas de costo de IA


---

## 📅 Fase 6 — Opcionales / Expansión

* App móvil para operadores
* Multi-instalación en un mismo venue
* Integración POS
* Reventa internacional


---

## ✔️ MVP Checklist

| Feature | Status |
|----|----|
| ✅ Créditos funcionando | 🔲 |
| ✅ Suscripciones funcionando | 🔲 |
| ✅ Creación de eventos enterprise | 🔲 |
| ✅ Lead capture | 🔲 |
| ✅ Feed | 🔲 |
| ✅ Email + WhatsApp | 🔲 |
| ✅ Toggle QR | 🔲 |
| ✅ Hard watermark | 🔲 |
| ✅ Print section | 🔲 |
| ✅ Models switching | 🔲 |
| ✅ Stripe codes | 🔲 |


---

## 📊 Resumen de Fases

| Fase | Enfoque | Features | Prioridad |
|----|----|----|----|
| **Fase 1** | Core SaaS | 4 features | 🔴 Crítica |
| **Fase 2** | Experiencia del Evento | 10 features | 🟠 Alta |
| **Fase 3** | Marketplace | 3 features | 🟡 Media |
| **Fase 4** | AI Modules | 4 features | 🟡 Media |
| **Fase 5** | Compliance & Infra | 4 features | 🟢 Baja |
| **Fase 6** | Expansión | 4+ features | 🔵 Futura |


---


