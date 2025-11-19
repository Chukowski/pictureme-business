# 📋 AI Photo Booth Hub - Complete Technical Specifications

**Version:** 2.0  
**Last Updated:** November 13, 2025  
**Owner:** Akitá (akitapr.com)

---

## 📖 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Frontend Components](#frontend-components)
7. [AI Integration](#ai-integration)
8. [Storage Systems](#storage-systems)
9. [Authentication & Security](#authentication--security)
10. [Admin Dashboard](#admin-dashboard)
11. [Event System](#event-system)
12. [Photo Processing Pipeline](#photo-processing-pipeline)
13. [Sharing & QR System](#sharing--qr-system)
14. [Deployment](#deployment)
15. [Environment Variables](#environment-variables)

---

## 🎯 System Overview

**AI Photo Booth Hub** is a multi-tenant SaaS platform that enables users to create customizable AI-powered photo booth experiences for events. The system provides:

- **Multi-user platform** with isolated event spaces
- **Dynamic event configuration** (themes, templates, branding)
- **Real-time AI photo processing** using fal.ai models
- **Live photo feeds** for events
- **QR code sharing** system
- **Admin dashboard** with analytics
- **Cloud storage** with MinIO/S3
- **Dark/Light mode** support

### Key Capabilities

✅ **For Event Organizers:**
- Create multiple events with unique URLs
- Customize branding, colors, and logos
- Upload custom templates and backgrounds
- Manage photo feeds and moderation
- View analytics per event

✅ **For Event Attendees:**
- Access event via simple URL (`/{user}/{event}`)
- Take photos with live camera
- Select from custom templates
- AI-powered background replacement
- Instant sharing via QR code
- View live photo feed

---

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Photo Booth  │  │  Admin Panel │  │  Event Feed  │  │
│  │    Pages     │  │  Dashboard   │  │    Viewer    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │ REST API (HTTP/JSON)
┌────────────────────────▼────────────────────────────────┐
│              Backend API (FastAPI/Python)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │   Auth   │  │  Events  │  │  Photos  │  │Analytics│ │
│  │ Service  │  │ Service  │  │ Service  │  │ Service │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└───────┬─────────────┬───────────────┬──────────────────┘
        │             │               │
┌───────▼───────┐ ┌───▼─────────┐ ┌──▼──────────────┐
│  PostgreSQL   │ │   CouchDB   │ │   MinIO/S3      │
│ (User Auth)   │ │(Events/Photos│ │ (Image Files)   │
└───────────────┘ └──────────────┘ └─────────────────┘
                        │
                ┌───────▼────────┐
                │   fal.ai API   │
                │  (AI Models)   │
                └────────────────┘
```

### Data Flow

```
User Takes Photo
    │
    ├──> Camera Capture (React)
    │
    ├──> Base64 Image Generation
    │
    ├──> POST /api/photos/process
    │       │
    │       ├──> fal.ai API (AI Processing)
    │       │
    │       ├──> Image Overlay (Branding)
    │       │
    │       └──> MinIO Upload (Original + Processed)
    │
    ├──> Save to CouchDB (Metadata)
    │
    └──> Display Result + QR Code
```

---

## 💻 Technology Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 18.3.1 | UI Framework |
| **TypeScript** | 5.8.3 | Type Safety |
| **Vite** | 5.4.19 | Build Tool & Dev Server |
| **Tailwind CSS** | 3.4.17 | Styling |
| **shadcn/ui** | Latest | UI Component Library |
| **React Router** | 6.30.1 | Client-side Routing |
| **TanStack Query** | 5.83.0 | Data Fetching & Caching |
| **Lucide React** | 0.462.0 | Icons |
| **QRCode.react** | 4.2.0 | QR Code Generation |
| **Canvas Confetti** | 1.9.4 | Animations |
| **Embla Carousel** | 8.6.0 | Photo Carousel |
| **React Hook Form** | 7.61.1 | Form Management |
| **Zod** | 3.25.76 | Schema Validation |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Python** | 3.11+ | Runtime |
| **FastAPI** | 0.115.0 | API Framework |
| **Uvicorn** | 0.32.0 | ASGI Server |
| **Pydantic** | 2.9.2 | Data Validation |
| **asyncpg** | 0.29.0 | PostgreSQL Driver |
| **CouchDB3** | 2.0.0+ | CouchDB Client |
| **boto3** | 1.35.36 | S3/MinIO SDK |
| **python-jose** | 3.3.0 | JWT Handling |
| **bcrypt** | 4.1.2 | Password Hashing |

### Databases & Storage

| System | Purpose |
|--------|---------|
| **PostgreSQL 15+** | User accounts, authentication |
| **CouchDB 3.3+** | Events, templates, photo metadata |
| **MinIO / AWS S3** | Image file storage |

### AI & External Services

| Service | Purpose |
|---------|---------|
| **fal.ai** | AI image generation/editing (Seedream, Gemini models) |

### Infrastructure

| Tool | Purpose |
|------|---------|
| **Docker** | Containerization |
| **Docker Compose** | Multi-container orchestration |
| **Nginx** | Reverse proxy (production) |

---

## 🗄️ Database Schema

### PostgreSQL Schema

#### `users` Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    slug VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** User account management and authentication.

**Indexes:**
- `username` (UNIQUE)
- `email` (UNIQUE)
- `slug` (UNIQUE)

#### `user_sessions` Table
```sql
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** JWT token management.

**Indexes:**
- `user_id`
- `token` (UNIQUE)
- `expires_at`

### CouchDB Databases

#### `photobooth_events` Database

**Document Type:** Event Configuration

```json
{
  "_id": "abc123def456",
  "_rev": "1-hash",
  "type": "event",
  "user_id": "uuid-from-postgres",
  "slug": "my-event-2025",
  "title": "My Event 2025",
  "description": "Event description",
  "start_date": "2025-01-01T00:00:00Z",
  "end_date": "2025-12-31T23:59:59Z",
  "is_active": true,
  "theme": {
    "mode": "dark",
    "brandName": "Akitá",
    "primaryColor": "#FF6B35",
    "secondaryColor": "#004E89",
    "tagline": "Experiencias visuales para tus eventos"
  },
  "templates": [
    {
      "id": "template-1",
      "name": "Ocean Depths",
      "description": "Underwater scene",
      "prompt": "underwater scene with coral reefs...",
      "images": [
        "https://storage.akitapr.com/photobooth/template_ocean_bg.jpg",
        "https://storage.akitapr.com/photobooth/template_ocean_prop.png"
      ],
      "campaignText": "Dive into innovation",
      "active": true,
      "includeHeader": false
    }
  ],
  "branding": {
    "logoUrl": "https://storage.akitapr.com/photobooth/logo.png",
    "footerUrl": "https://storage.akitapr.com/photobooth/footer.png",
    "headerBackgroundColor": "#FFFFFF",
    "footerBackgroundColor": "#000000"
  },
  "settings": {
    "aiModel": "fal-ai/bytedance/seedream/v4/edit",
    "imageSize": {"width": 1080, "height": 1920},
    "feedEnabled": true,
    "moderationEnabled": false,
    "maxPhotosPerSession": 3,
    "promptOverride": ""
  },
  "created_at": "2025-11-02T13:00:00Z",
  "updated_at": "2025-11-02T13:00:00Z"
}
```

**CouchDB Views:**

```javascript
// _design/events
{
  "views": {
    "by_user": {
      "map": "function(doc) { if(doc.type=='event') emit(doc.user_id, doc); }"
    },
    "by_slug": {
      "map": "function(doc) { if(doc.type=='event') emit([doc.user_id, doc.slug], doc); }"
    },
    "active": {
      "map": "function(doc) { if(doc.type=='event' && doc.is_active) emit(doc._id, doc); }"
    }
  }
}
```

#### `photobooth_photos` Database

**Document Type:** Photo Metadata

```json
{
  "_id": "xyz789abc123",
  "_rev": "1-hash",
  "type": "photo",
  "event_id": "event-couch-id",
  "share_code": "ABC123",
  "original_image_url": "https://storage.akitapr.com/photobooth/photo_1234_original.jpg",
  "processed_image_url": "https://storage.akitapr.com/photobooth/photo_1234_processed.jpg",
  "template_id": "template-1",
  "template_name": "Ocean Depths",
  "metadata": {
    "processing_time_ms": 12500,
    "ai_model": "fal-ai/bytedance/seedream/v4/edit"
  },
  "created_at": "2025-11-02T14:30:00Z"
}
```

**CouchDB Views:**

```javascript
// _design/photos
{
  "views": {
    "by_event": {
      "map": "function(doc) { if(doc.type=='photo') emit(doc.event_id, doc); }"
    },
    "by_share_code": {
      "map": "function(doc) { if(doc.type=='photo') emit(doc.share_code, doc); }"
    },
    "by_date": {
      "map": "function(doc) { if(doc.type=='photo') emit(doc.created_at, doc); }"
    }
  }
}
```

---

## 🔌 API Endpoints

### Base URL
- **Development:** `http://localhost:3001`
- **Production:** `https://api.photo.akitapr.com`

### Authentication Endpoints

#### `POST /api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "full_name": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "username": "johndoe",
  "email": "john@example.com",
  "slug": "johndoe",
  "full_name": "John Doe",
  "created_at": "2025-11-13T10:00:00Z"
}
```

#### `POST /api/auth/login`
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "username": "johndoe",
    "email": "john@example.com",
    "slug": "johndoe"
  }
}
```

#### `GET /api/auth/me`
Get current authenticated user info.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "username": "johndoe",
  "email": "john@example.com",
  "slug": "johndoe",
  "full_name": "John Doe"
}
```

---

### Event Endpoints

#### `POST /api/events`
Create a new event (requires authentication).

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "slug": "my-event-2025",
  "title": "My Event 2025",
  "description": "Annual company event",
  "start_date": "2025-01-01T00:00:00Z",
  "end_date": "2025-12-31T23:59:59Z",
  "is_active": true,
  "theme": { /* theme config */ },
  "templates": [ /* template array */ ],
  "branding": { /* branding config */ },
  "settings": { /* settings config */ }
}
```

**Response:** `201 Created`
```json
{
  "_id": "couch-doc-id",
  "_rev": "1-hash",
  "user_id": "uuid",
  "slug": "my-event-2025",
  "title": "My Event 2025",
  ...
}
```

#### `GET /api/events`
Get all events for authenticated user.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
[
  {
    "_id": "event-id-1",
    "slug": "event-1",
    "title": "Event One",
    ...
  },
  {
    "_id": "event-id-2",
    "slug": "event-2",
    "title": "Event Two",
    ...
  }
]
```

#### `GET /api/events/{userSlug}/{eventSlug}`
Get event configuration by URL slugs (public, no auth required).

**Response:** `200 OK`
```json
{
  "_id": "event-id",
  "slug": "my-event",
  "title": "My Event",
  "theme": {...},
  "templates": [...],
  "branding": {...},
  "settings": {...}
}
```

#### `PUT /api/events/{event_id}`
Update an existing event.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "_rev": "2-hash",  // Required for CouchDB
  "title": "Updated Title",
  "templates": [ /* updated templates */ ]
}
```

**Response:** `200 OK`

#### `DELETE /api/events/{event_id}`
Delete an event.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`

---

### Photo Endpoints

#### `POST /api/photos/process`
Process a photo with AI and upload to storage.

**Request Body:**
```json
{
  "event_id": "event-couch-id",
  "template_id": "template-1",
  "base64_image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "prompt_override": "" // Optional
}
```

**Response:** `201 Created`
```json
{
  "_id": "photo-id",
  "share_code": "ABC123",
  "original_image_url": "https://storage.akitapr.com/...",
  "processed_image_url": "https://storage.akitapr.com/...",
  "created_at": "2025-11-13T15:30:00Z"
}
```

#### `GET /api/events/{userSlug}/{eventSlug}/photos`
Get photos for an event (feed).

**Query Parameters:**
- `limit` (default: 50)
- `offset` (default: 0)

**Response:** `200 OK`
```json
{
  "photos": [
    {
      "_id": "photo-id",
      "share_code": "ABC123",
      "processed_image_url": "https://...",
      "created_at": "2025-11-13T15:30:00Z"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

#### `GET /api/photos/share/{share_code}`
Get photo by share code.

**Response:** `200 OK`
```json
{
  "_id": "photo-id",
  "share_code": "ABC123",
  "processed_image_url": "https://...",
  "original_image_url": "https://...",
  "event_id": "event-id",
  "created_at": "2025-11-13T15:30:00Z"
}
```

#### `DELETE /api/photos/{photo_id}`
Delete a photo (admin only).

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`

---

### Admin Endpoints

#### `GET /api/admin/events/{event_id}/photos`
Get all photos for an event (admin view).

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `limit` (default: 100)
- `offset` (default: 0)

**Response:** `200 OK`

#### `GET /api/admin/events/{event_id}/analytics`
Get analytics for a specific event.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "event_id": "event-id",
  "event_title": "My Event",
  "total_photos": 245,
  "total_views": 1820,
  "photos_last_24h": 32,
  "most_used_template": "Ocean Depths",
  "avg_processing_time": 12.5,
  "is_active": true
}
```

---

### Media Library Endpoints

#### `POST /api/media/upload`
Upload media files (images, logos, backgrounds).

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Form Data:**
```
file: [binary file]
type: "background" | "logo" | "overlay" | "template"
```

**Response:** `201 Created`
```json
{
  "url": "https://storage.akitapr.com/photobooth/media_123.jpg",
  "filename": "media_123.jpg",
  "size": 245678,
  "type": "background"
}
```

#### `GET /api/media`
Get all media files for authenticated user.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
[
  {
    "url": "https://...",
    "filename": "background1.jpg",
    "type": "background",
    "uploaded_at": "2025-11-13T10:00:00Z"
  }
]
```

#### `DELETE /api/media/{filename}`
Delete a media file.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`

---

## 🎨 Frontend Components

### Core Pages

#### `Index.tsx` (Landing/Home)
- Hero section with app overview
- Call-to-action for registration
- Feature highlights

#### `PhotoBoothPage.tsx` (Main Photo Booth)
- **Route:** `/{userSlug}/{eventSlug}`
- Event configuration loading
- Template selection carousel
- Camera capture
- AI processing with progress
- Result display with QR code
- Confetti animation on success
- WebGL shader background (dark mode only)

#### `EventFeedPage.tsx` (Live Photo Feed)
- **Route:** `/{userSlug}/{eventSlug}/feed`
- Carousel of recent photos
- Auto-refresh every 5 seconds
- QR codes for each photo
- Dark/Light mode support

#### `SharePage.tsx` (Shared Photo Viewer)
- **Route:** `/share/{shareCode}`
- Display single photo
- Download option
- "Create your own" CTA

#### `AdminDashboard.tsx` (Admin Panel)
- **Route:** `/admin`
- Tabbed interface:
  - **Events Management Tab:** Create, edit, delete events
  - **Analytics Tab:** Per-event and overall metrics
- Dark/Light mode toggle

#### `AdminEventForm.tsx` (Event Editor)
- **Route:** `/admin/events/new` or `/admin/events/{id}/edit`
- Tabbed interface:
  - **Basic Info:** Title, slug, dates, description
  - **Branding:** Theme, colors, logo, footer
  - **Templates:** Scene configuration, prompts, images
- Template management with media library
- Live preview (future)

#### `AdminEventPhotos.tsx` (Photo Management)
- **Route:** `/admin/events/{id}/photos`
- Grid view of all photos for an event
- Delete functionality with confirmation
- Batch operations

#### `AdminAuth.tsx` (Login Page)
- **Route:** `/admin/auth`
- Email/password login
- JWT token management
- Redirects to dashboard on success

#### `AdminRegister.tsx` (Registration Page)
- **Route:** `/admin/register`
- User registration form
- Validation with Zod
- Auto-login after registration

---

### Reusable Components

#### Camera & Capture
- **`CameraCapture.tsx`:** Live camera feed, device selector, countdown, error handling
- **`SceneCard.tsx`:** Template preview cards in carousel

#### UI & Feedback
- **`ProcessingLoader.tsx`:** Animated loading with status messages and aurora effects
- **`UniqueLoading.tsx`:** Morphing shape animation
- **`ResultDisplay.tsx`:** Photo result with download, QR code, share options
- **`ShaderBackground.tsx`:** WebGL animated gradient background
- **`BorderBeam.tsx`:** Animated border effect for cards

#### Forms & Inputs
- **`CustomPromptModal.tsx`:** AI prompt customization dialog
- **`PromptSuggestions.tsx`:** AI prompt suggestions (GPT-based, future)
- **`BackgroundSelector.tsx`:** Background image picker
- **`MediaLibrary.tsx`:** File upload and management UI

#### Admin Components
- **`AdminEventsTab.tsx`:** Events list and management
- **`AdminAnalyticsTab.tsx`:** Charts and metrics display
- **`DarkModeToggle.tsx`:** Theme switcher

#### Shared UI (shadcn/ui)
- Button, Input, Label, Textarea
- Card, Badge, Skeleton
- Dialog, AlertDialog, Tabs, Accordion
- Select, Switch, Progress
- Toast (Sonner)

---

## 🤖 AI Integration

### Supported Models

The application integrates with **fal.ai** for AI image processing. Currently supported models:

#### 1. **Seedream v4** (Primary)
- **Model ID:** `fal-ai/bytedance/seedream/v4/edit`
- **Purpose:** High-quality image editing and background replacement
- **Speed:** ~10-15 seconds per image
- **Quality:** High fidelity, detailed compositing
- **Cost:** $0.008-0.012 per generation

#### 2. **Gemini Flash Image** (Alternative)
- **Model ID:** `fal-ai/gemini-25-flash-image/edit`
- **Purpose:** Fast image editing
- **Speed:** ~5-8 seconds per image
- **Quality:** Good, faster processing
- **Cost:** $0.003-0.005 per generation

### AI Processing Pipeline

```
1. Capture Photo (base64)
    │
    ├──> Prepare Request
    │    ├─ Background template images
    │    ├─ Custom AI prompt
    │    ├─ Scene configuration
    │    └─ Image dimensions (1080x1920)
    │
2. Call fal.ai API
    │
    ├──> Seedream/Gemini Model
    │    ├─ Background removal
    │    ├─ Subject extraction
    │    ├─ Scene composition
    │    └─ Lighting adjustment
    │
3. Receive Processed Image
    │
4. Apply Branding Overlay
    │    ├─ Logo (header)
    │    ├─ Footer graphic
    │    ├─ Campaign text
    │    └─ Brand colors
    │
5. Upload to MinIO
    │
6. Save Metadata to CouchDB
    │
7. Return Result + QR Code
```

### AI Request Format

```typescript
// aiProcessor.ts
const request = {
  image_url: base64Image,
  prompt: template.prompt,
  reference_images: template.images,
  image_size: {
    width: 1080,
    height: 1920
  },
  sync_mode: true,
  num_inference_steps: 25,
  guidance_scale: 7.5
};

const result = await fal.subscribe(model, {
  input: request,
  onQueueUpdate: (update) => {
    // Progress callback
  }
});
```

### AI Prompt Engineering

**Prompt Structure:**
```
[Scene Description] + [Composition Instructions] + [Style Modifiers] + [Technical Parameters]
```

**Example:**
```
"A person standing in an underwater coral reef scene with tropical fish swimming around, 
cinematic lighting, high detail, photorealistic, vibrant colors, professional photography, 
depth of field, 4K quality"
```

**Prompt Variables:**
- `{scene}` - Scene type (underwater, jungle, urban, etc.)
- `{style}` - Art style (photorealistic, artistic, etc.)
- `{lighting}` - Lighting conditions
- `{composition}` - Framing and layout

---

## 💾 Storage Systems

### MinIO Configuration

**Bucket Structure:**
```
photobooth/
├── originals/
│   └── photo_{timestamp}_{userId}_original.jpg
├── processed/
│   └── photo_{timestamp}_{userId}_processed.jpg
├── templates/
│   └── template_{eventId}_{name}.jpg
├── media/
│   ├── logos/
│   ├── backgrounds/
│   └── overlays/
```

**Access Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": "*"},
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::photobooth/*"]
    }
  ]
}
```

**Image Processing:**
- **Original:** Saved as-is from camera
- **Processed:** AI + branding overlay
- **Format:** JPEG (quality: 90)
- **Max Size:** 10MB per file

**CDN/Public Access:**
```
https://storage.akitapr.com/photobooth/{filename}
```

---

## 🔐 Authentication & Security

### JWT Token Structure

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "username": "johndoe",
  "slug": "johndoe",
  "exp": 1731513600,
  "iat": 1731510000
}
```

**Token Expiration:** 24 hours

**Storage:** `localStorage.auth_token` (frontend)

### Security Measures

1. **Password Hashing:** bcrypt with 12 rounds
2. **HTTPS Only:** All production traffic over TLS
3. **CORS:** Restricted to allowed origins
4. **Rate Limiting:** 100 requests/min per IP (future)
5. **SQL Injection:** Prevented via parameterized queries
6. **XSS Protection:** React's built-in escaping
7. **CSRF:** JWT tokens (stateless, no cookies)

### Access Control

| Endpoint | Public | Authenticated | Admin |
|----------|--------|---------------|-------|
| `GET /events/{user}/{event}` | ✅ | ✅ | ✅ |
| `POST /photos/process` | ✅ | ✅ | ✅ |
| `GET /events/{user}/{event}/photos` | ✅ | ✅ | ✅ |
| `POST /api/events` | ❌ | ✅ | ✅ |
| `PUT /api/events/{id}` | ❌ | ✅ (own) | ✅ |
| `DELETE /api/events/{id}` | ❌ | ✅ (own) | ✅ |
| `DELETE /api/photos/{id}` | ❌ | ❌ | ✅ |

---

## 📊 Admin Dashboard

### Features

#### 1. **Events Management**
- Create new events with full configuration
- Edit existing events (title, templates, branding)
- Delete events (with confirmation)
- Toggle event active/inactive status
- Navigate to event URL
- View event photos

#### 2. **Analytics Tab**

**Overall Metrics:**
- Total Photos (across all events)
- Total Views (feed impressions)
- Photos in Last 24 Hours
- Active Events Count

**Per-Event Metrics:**
- Total photos per event
- Total views per event
- Photos in last 24h
- Most used template
- Average processing time
- Event status (Active/Inactive)

**Visualizations:**
- Cards with icon indicators
- Color-coded status badges
- Skeleton loaders during fetch
- Responsive grid layout

#### 3. **Event Editor (Tabbed)**

**Tab 1: Basic Info**
- Event title (required)
- URL slug (auto-generated from title, editable)
- Description
- Start/End dates
- Active status toggle

**Tab 2: Branding**
- Brand name
- Primary color picker
- Secondary color picker
- Theme mode (dark/light)
- Logo upload (from media library)
- Footer image upload
- Tagline text

**Tab 3: Templates**
- Add new template button
- Template list with accordions:
  - Name & description
  - AI prompt (textarea)
  - Template images (multi-upload)
  - Campaign text
  - Active toggle
  - Include header toggle
  - Delete template button

#### 4. **Media Library**
- Upload images (backgrounds, logos, overlays)
- Grid view of user's media
- Delete media files
- Copy URL to clipboard
- Filter by type (future)
- Search (future)

#### 5. **Photo Management**
- View all photos for an event
- Grid layout with thumbnails
- Delete individual photos
- Confirmation dialog before deletion
- Share code display
- Download photo

---

## 🎪 Event System

### Event Lifecycle

```
1. User Creates Event
    │
    ├──> Event saved to CouchDB
    │
2. Event Published
    │
    ├──> Public URL generated: /{user}/{event}
    │
3. Attendees Visit
    │
    ├──> Config loaded from CouchDB
    ├──> Templates displayed
    │
4. Photos Generated
    │
    ├──> Saved to MinIO + CouchDB
    ├──> Appear in feed
    │
5. Event Ends
    │
    ├──> Set to inactive
    ├──> Photos remain accessible
```

### Event Configuration Options

#### Theme Settings
```typescript
{
  mode: "dark" | "light",
  brandName: string,
  primaryColor: string,    // Hex color
  secondaryColor: string,  // Hex color
  tagline: string
}
```

#### Branding Settings
```typescript
{
  logoUrl?: string,
  footerUrl?: string,
  headerBackgroundColor: string,
  footerBackgroundColor: string
}
```

#### Template Structure
```typescript
{
  id: string,              // Unique identifier
  name: string,            // Display name
  description: string,     // Short description
  prompt: string,          // AI prompt
  images: string[],        // Background/prop URLs
  campaignText?: string,   // Optional overlay text
  active: boolean,         // Show in selector
  includeHeader: boolean   // Include logo overlay
}
```

#### Advanced Settings
```typescript
{
  aiModel: string,         // fal.ai model ID
  imageSize: {
    width: number,
    height: number
  },
  feedEnabled: boolean,
  moderationEnabled: boolean,
  maxPhotosPerSession: number,
  promptOverride?: string  // Override template prompts
}
```

---

## 📸 Photo Processing Pipeline

### Step-by-Step Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. User selects template                                │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 2. Camera capture (base64 image)                        │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 3. Loading state: "Preparing your photo..."             │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 4. POST /api/photos/process                             │
│    - event_id, template_id, base64_image                │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 5. Backend: Call fal.ai API                             │
│    - Progress updates via SSE (future)                  │
│    - Status: "AI is creating your scene..."             │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 6. Backend: Apply branding overlay                      │
│    - Logo, footer, campaign text                        │
│    - Status: "Adding final touches..."                  │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 7. Backend: Upload to MinIO                             │
│    - Original + Processed images                        │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 8. Backend: Save to CouchDB                             │
│    - Metadata, URLs, share code                         │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 9. Response to frontend                                 │
│    - Processed image URL, share code                    │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 10. Display result                                      │
│     - Show photo                                        │
│     - Generate QR code                                  │
│     - Confetti animation 🎉                             │
└─────────────────────────────────────────────────────────┘
```

### Processing Times

| Step | Duration | Notes |
|------|----------|-------|
| Camera capture | 3s | Countdown timer |
| Frontend prep | < 1s | Base64 encoding |
| API request | < 1s | Network latency |
| AI processing | 10-15s | fal.ai Seedream |
| Branding overlay | < 1s | Canvas API |
| MinIO upload | 2-3s | Depends on file size |
| CouchDB save | < 1s | Metadata only |
| **Total** | **~15-20s** | End-to-end |

---

## 📲 Sharing & QR System

### Share Code Generation

**Format:** 6-character alphanumeric (e.g., `ABC123`)

**Algorithm:**
```python
import random
import string

def generate_share_code():
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=6))
```

**Collision Handling:** Check CouchDB for uniqueness, retry if exists.

### QR Code Implementation

**Library:** `qrcode.react` (React component)

**Configuration:**
```typescript
<QRCodeSVG
  value={downloadUrl}       // Direct image URL
  size={64}                 // 64x64 pixels
  level="Q"                 // Error correction: ~25%
  includeMargin={false}
/>
```

**QR Code Content:**
- **Direct Image URL:** `https://storage.akitapr.com/photobooth/photo_xxx_processed.jpg`
- **Advantages:**
  - Works immediately after upload
  - Opens directly in browser/gallery
  - No intermediate page required
  - Can be downloaded with right-click

**Alternative (for localStorage fallback):**
- Base64 data URI (if cloud storage fails)

### Sharing Flow

```
User scans QR code
    │
    ├──> Opens image URL in browser
    │
    ├──> Image loads from MinIO/S3
    │
    ├──> User can:
    │    ├─ View full-size
    │    ├─ Download (right-click)
    │    ├─ Share via social media
    │    └─ Save to device
```

---

## 🚀 Deployment

### Docker Setup

**File:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "8080:80"
    environment:
      - VITE_API_URL=http://localhost:3001
      - VITE_BASE_URL=https://photo.akitapr.com
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - COUCHDB_URL=${COUCHDB_URL}
      - COUCHDB_USER=${COUCHDB_USER}
      - COUCHDB_PASSWORD=${COUCHDB_PASSWORD}
      - VITE_MINIO_ENDPOINT=${VITE_MINIO_ENDPOINT}
      - VITE_FAL_KEY=${VITE_FAL_KEY}
    depends_on:
      - postgres
      - couchdb

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=photobooth
      - POSTGRES_USER=admin
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  couchdb:
    image: couchdb:3.3
    environment:
      - COUCHDB_USER=${COUCHDB_USER}
      - COUCHDB_PASSWORD=${COUCHDB_PASSWORD}
    ports:
      - "5984:5984"
    volumes:
      - couchdb_data:/opt/couchdb/data

volumes:
  postgres_data:
  couchdb_data:
```

### Production Deployment (Dokploy)

**Platform:** Dokploy (self-hosted PaaS)

**Steps:**
1. Connect GitHub repository
2. Configure environment variables
3. Set build command: `npm run build`
4. Set start command: `npm run preview`
5. Configure domain: `photo.akitapr.com`
6. Enable HTTPS (Let's Encrypt)
7. Deploy

**Health Checks:**
```bash
# Frontend
curl https://photo.akitapr.com/

# Backend
curl https://photo.akitapr.com/api/health
```

### Environment Configuration

See [Environment Variables](#environment-variables) section.

---

## 🔧 Environment Variables

### Frontend (`.env`)

```bash
# API Configuration
VITE_API_URL=http://localhost:3001
VITE_BASE_URL=https://photo.akitapr.com

# AI Service
VITE_FAL_KEY=your-fal-api-key

# AI Model Selection
VITE_FAL_MODEL=fal-ai/bytedance/seedream/v4/edit
# Alternative: fal-ai/gemini-25-flash-image/edit

# Feature Flags (optional)
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_EMAIL=false
```

### Backend (`backend/.env`)

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/photobooth
VITE_POSTGRES_URL=postgresql://user:password@host:5432/photobooth

# CouchDB
COUCHDB_URL=https://couch.akitapr.com
COUCHDB_USER=your-username
COUCHDB_PASSWORD=your-password
COUCHDB_DB_EVENTS=photobooth_events
COUCHDB_DB_PHOTOS=photobooth_photos

# MinIO / S3
VITE_MINIO_ENDPOINT=storage.akitapr.com
VITE_MINIO_PORT=443
VITE_MINIO_USE_SSL=true
VITE_MINIO_ACCESS_KEY=your-access-key
VITE_MINIO_SECRET_KEY=your-secret-key
VITE_MINIO_BUCKET=photobooth
VITE_MINIO_REGION=us-east-1

# AI Service
VITE_FAL_KEY=your-fal-api-key
FAL_KEY=your-fal-admin-key  # For fal.ai Platform APIs (if using analytics)

# Security
SECRET_KEY=your-secret-jwt-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_HOURS=24

# Email (future)
RESEND_API_KEY=your-resend-key
FROM_EMAIL=noreply@akitapr.com
```

---

## 📦 Project Structure

```
ai-photo-booth-hub/
├── backend/
│   ├── __pycache__/
│   ├── services/
│   │   └── fal_analytics.py      # fal.ai Platform API integration
│   ├── couchdb_service.py         # CouchDB client wrapper
│   ├── main.py                    # FastAPI app & routes
│   ├── requirements.txt           # Python dependencies
│   ├── Dockerfile
│   └── .env                       # Backend environment vars
│
├── src/
│   ├── assets/
│   │   └── backgrounds/           # Default images
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminAnalyticsTab.tsx
│   │   │   └── AdminEventsTab.tsx
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── CameraCapture.tsx
│   │   ├── SceneCard.tsx
│   │   ├── ProcessingLoader.tsx
│   │   ├── ResultDisplay.tsx
│   │   ├── ShaderBackground.tsx
│   │   ├── BorderBeam.tsx
│   │   ├── DarkModeToggle.tsx
│   │   ├── MediaLibrary.tsx
│   │   └── ... (other components)
│   ├── contexts/
│   │   └── ThemeContext.tsx       # Dark/Light mode
│   ├── hooks/
│   │   ├── useCamera.ts
│   │   ├── useEventConfig.ts
│   │   └── useEventPhotos.ts
│   ├── pages/
│   │   ├── Index.tsx              # Landing page
│   │   ├── PhotoBoothPage.tsx     # Main photobooth
│   │   ├── EventFeedPage.tsx      # Live feed
│   │   ├── SharePage.tsx          # Shared photo viewer
│   │   ├── AdminDashboard.tsx     # Admin panel
│   │   ├── AdminAuth.tsx          # Login
│   │   ├── AdminRegister.tsx      # Registration
│   │   ├── AdminEventForm.tsx     # Event editor
│   │   └── AdminEventPhotos.tsx   # Photo management
│   ├── services/
│   │   ├── aiProcessor.ts         # fal.ai integration
│   │   ├── imageOverlay.ts        # Branding overlay
│   │   ├── cloudStorage.ts        # MinIO upload
│   │   ├── eventsApi.ts           # Backend API calls
│   │   ├── localStorage.ts        # Browser storage
│   │   └── adminStorage.ts        # Admin API helpers
│   ├── App.tsx                    # Router setup
│   ├── main.tsx                   # React entry
│   └── index.css                  # Global styles
│
├── public/                        # Static assets
├── docs/                          # Documentation
├── scripts/                       # Utility scripts
│
├── .env                           # Frontend environment
├── .env.example                   # Template
├── package.json                   # Node dependencies
├── tsconfig.json                  # TypeScript config
├── vite.config.ts                 # Vite config
├── tailwind.config.ts             # Tailwind config
├── docker-compose.yml             # Docker orchestration
├── Dockerfile                     # Frontend container
│
├── README.md                      # Main readme
├── TECHNICAL_SPECS.md             # This file
├── COUCHDB_INTEGRATION.md         # CouchDB setup
├── MULTIUSER_ADMIN_GUIDE.md       # Admin guide
├── SHARE_SYSTEM.md                # Sharing system
├── CLOUD_STORAGE_SETUP.md         # MinIO setup
└── DEPLOYMENT.md                  # Deployment guide
```

---

## 🎯 Key Features Summary

### ✅ Implemented Features

1. **Multi-tenant Platform**
   - User registration & authentication (JWT)
   - Isolated event spaces per user
   - Dynamic routing: `/{user}/{event}`

2. **Event Management**
   - Create, edit, delete events
   - Custom themes & branding
   - Template configuration
   - Media library for uploads
   - Dark/Light mode support

3. **Photo Booth**
   - Live camera capture
   - Multiple camera support
   - Template selection carousel
   - AI-powered background replacement
   - Real-time processing feedback
   - Confetti animation on success
   - WebGL shader backgrounds (dark mode)

4. **Photo Processing**
   - fal.ai integration (Seedream/Gemini)
   - Custom AI prompts per template
   - Branding overlay (logo, footer, text)
   - Dual storage (original + processed)
   - Share code generation
   - QR code creation

5. **Live Feed**
   - Auto-refreshing photo carousel
   - Per-event feeds
   - Dark/Light mode adaptive styling
   - QR codes for each photo

6. **Admin Dashboard**
   - Tabbed interface (Events, Analytics)
   - Per-event analytics
   - Overall platform metrics
   - Photo management (view, delete)
   - Event editor with tabs
   - Media library management

7. **Storage & Database**
   - PostgreSQL (user auth)
   - CouchDB (events, photos)
   - MinIO/S3 (image files)
   - Hybrid architecture

8. **Security**
   - JWT authentication
   - Password hashing (bcrypt)
   - HTTPS enforcement
   - CORS configuration
   - Ownership validation

### 🚧 Future Enhancements

- [ ] Real-time photo feed (WebSockets/SSE)
- [ ] Email delivery integration (Resend)
- [ ] Photo moderation (approve/reject)
- [ ] Advanced analytics (charts, exports)
- [ ] fal.ai Platform Analytics integration
- [ ] Rate limiting per user
- [ ] Photo albums/collections
- [ ] Social media sharing (native)
- [ ] Watermark customization
- [ ] Multi-language support (i18n)
- [ ] Webhook notifications
- [ ] API rate limiting
- [ ] Admin super-user role
- [ ] Batch photo operations
- [ ] Photo filters/effects
- [ ] GIF/Video support
- [ ] Print queue integration

---

## 📞 Support & Documentation

### Additional Resources

- **[README.md](./README.md)** - Quick start guide
- **[README_MULTIUSER.md](./README_MULTIUSER.md)** - Multi-user platform guide
- **[COUCHDB_INTEGRATION.md](./COUCHDB_INTEGRATION.md)** - CouchDB setup & migration
- **[MULTIUSER_ADMIN_GUIDE.md](./MULTIUSER_ADMIN_GUIDE.md)** - Admin panel usage
- **[SHARE_SYSTEM.md](./SHARE_SYSTEM.md)** - Sharing system details
- **[CLOUD_STORAGE_SETUP.md](./CLOUD_STORAGE_SETUP.md)** - MinIO configuration
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment
- **[DOKPLOY_SETUP.md](./DOKPLOY_SETUP.md)** - Dokploy deployment guide

### API Documentation

- **Swagger UI:** `http://localhost:3001/docs` (development)
- **ReDoc:** `http://localhost:3001/redoc` (development)

### Contact

- **Company:** Akitá
- **Website:** [akitapr.com](https://akitapr.com)
- **Email:** [Contact via website]

---

## 📄 License

**Proprietary** - © 2025 Akitá. All rights reserved.

This software is the property of Akitá and is not open source. Unauthorized copying, modification, distribution, or use of this software, via any medium, is strictly prohibited.

---

**Document Version:** 2.0  
**Generated:** November 13, 2025  
**Status:** Production-ready


