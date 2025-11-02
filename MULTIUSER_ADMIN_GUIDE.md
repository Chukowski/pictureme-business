# Multi-User Admin System - Complete Guide

## Overview
El sistema ahora es completamente multi-usuario, permitiendo a cada usuario crear y gestionar sus propios eventos con configuraciones personalizadas, templates y prompts de AI.

## 🎯 Features Implemented

### ✅ Completed
1. **User Authentication System**
   - Registration with email/username/password
   - Login with JWT tokens
   - Password hashing with bcrypt
   - Token-based authentication

2. **Admin Dashboard**
   - View all user events
   - Create new events
   - Edit existing events
   - Delete events with confirmation
   - View event statistics

3. **Event Management**
   - Create events with custom slugs
   - Configure event details (title, description, dates)
   - Activate/deactivate events
   - Manage multiple events per user

4. **Template Management**
   - Add/edit/delete templates per event
   - Configure AI prompts per template
   - Set background images
   - Configure campaign text overlays
   - Toggle header logo per template
   - Enable/disable templates

5. **Backend API (FastAPI)**
   - Full CRUD for events
   - JWT authentication middleware
   - PostgreSQL integration
   - MinIO cloud storage
   - Photo upload endpoints

## 📁 New Files Created

### Frontend
- **`/src/pages/AdminAuth.tsx`** - Login/Register page
- **`/src/pages/AdminEvents.tsx`** - Events dashboard
- **`/src/pages/AdminEventForm.tsx`** - Create/Edit event form
- **`/src/services/eventsApi.ts`** - API client (updated with new endpoints)

### Backend
- **`/backend/main.py`** - FastAPI backend (updated with CRUD endpoints)

## 🛠️ How to Use

### 1. Start the System

```bash
# Terminal 1: Start backend
npm run backend

# Terminal 2: Start frontend
npm run dev
```

### 2. Create a User Account

1. Go to `http://localhost:8080/admin/auth`
2. Click "Register" tab
3. Fill in:
   - Full Name: `John Doe`
   - Username: `johndoe` (will become URL slug: `/johndoe/...`)
   - Email: `john@example.com`
   - Password: `yourpassword123`
4. Click "Create account"

You'll be automatically logged in and redirected to the events dashboard.

### 3. Create Your First Event

1. Click "Create New Event"
2. Fill in the form:

**Basic Information:**
- **Slug**: `miami-2025` (URL will be `/johndoe/miami-2025`)
- **Title**: `Miami Conference 2025`
- **Description**: `AI Photo Booth for Miami Tech Conference`
- **Start Date**: `2025-11-15T09:00`
- **End Date**: `2025-11-17T18:00`
- **Event Active**: ✅ Toggle ON

3. Click "Load Defaults" to import the default Akitá templates
4. **Customize Templates** (this is where the magic happens! 🎨):

#### Template Configuration Example

Expand each template accordion and customize:

**Template: Ocean Depths**
- **Name**: `Ocean Depths`
- **Description**: `Underwater exploration`
- **AI Prompt**:
```
Create a professional underwater scene by compositing these images:
Preserve the exact person (face, body, pose) from the first image - do NOT cover their face with masks or goggles.
Composite the majestic octopus with tentacles, turquoise underwater lighting, and bubbles from the second image around the person.
Dress the person in a professional black diving suit with equipment and harness.
Keep the person's face fully visible and natural - NO MASKS ON FACE.
Position the person in the lower center with the large octopus tentacles surrounding them in the background.
Blend everything naturally so the person appears to be actually underwater with the octopus.
Dramatic turquoise professional underwater photography.
```
- **Background Images**: `/src/assets/backgrounds/ocean.jpg`
- **Campaign Text**: `Need extra hands?`
- **Active**: ✅
- **Include Header Logo**: ❌

5. Click "Create Event"

### 4. Access Your Event

Once created, your event is live at:
```
http://localhost:8080/johndoe/miami-2025
```

Share this URL with your event attendees!

### 5. Edit Event

From the Events Dashboard:
1. Click "Edit" on any event
2. Modify templates, prompts, or settings
3. Click "Update Event"

Changes are immediately reflected on the live event page.

## 🎨 Customizing AI Prompts

### Prompt Engineering Best Practices

**✅ Good Prompt Structure:**
```
Create a [scene type] by compositing these images:
- Preserve the exact person (face, body, pose) from the first image
- Add [specific background elements] from the second image around/behind the person
- Dress the person in [clothing description]
- Position the person [spatial instructions]
- Blend all elements naturally so the person appears to be [action] in [environment]
- [Photography style]
```

**❌ Bad Prompt (will remove background):**
```
Take the person from the first image and place them into the second image background...
```

### Key Phrases
- ✅ "Create by compositing"
- ✅ "Preserve the person from first image"
- ✅ "Add elements from second image around the person"
- ✅ "Blend naturally"
- ❌ "Place into background"
- ❌ "Replace background"

## 🗄️ Database Structure

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    slug VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Events Table
```sql
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    slug VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    theme JSONB DEFAULT '{}',
    templates JSONB DEFAULT '[]',
    branding JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, slug)
);
```

### Processed Photos Table
```sql
CREATE TABLE processed_photos (
    id VARCHAR(255) PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    original_image_url TEXT NOT NULL,
    processed_image_url TEXT NOT NULL,
    background_id VARCHAR(255),
    background_name VARCHAR(255),
    share_code VARCHAR(6) UNIQUE NOT NULL,
    created_at BIGINT NOT NULL,
    prompt TEXT,
    meta JSONB DEFAULT '{}'
);
```

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Events (Protected)
- `GET /api/events` - Get all events for current user
- `POST /api/events` - Create new event
- `PUT /api/events/{event_id}` - Update event
- `DELETE /api/events/{event_id}` - Delete event

### Events (Public)
- `GET /api/events/{user_slug}/{event_slug}` - Get event by slug (public)
- `GET /api/events/{event_id}/photos` - Get event photos (public feed)

### Photos
- `POST /api/photos/upload` - Upload photo (authenticated)
- `POST /api/photos/upload/public` - Upload photo (public, for legacy)
- `GET /api/photos/{share_code}` - Get photo by share code

## 🚀 Workflow

### For Admin Users:
1. **Register/Login** → `/admin/auth`
2. **View Events** → `/admin/events`
3. **Create Event** → `/admin/events/create`
4. **Customize Templates** → Edit prompts, images, campaign text
5. **Share URL** → `/{username}/{event-slug}`

### For Event Attendees:
1. **Visit Event URL** → `/{username}/{event-slug}`
2. **Select Template** → Choose background
3. **Take Photo** → Use camera
4. **AI Processing** → Wait for compositing
5. **Download/Share** → QR code or direct link

## 📝 Example: Creating a Custom Event

Let's create a wedding photo booth:

### Step 1: Create Event
```
Slug: sarah-wedding
Title: Sarah & Mike's Wedding
Description: Wedding Photo Booth - June 2025
```

### Step 2: Add Custom Template
```
Name: Romantic Garden
Description: Elegant garden wedding scene

AI Prompt:
Create a romantic wedding scene by compositing these images:
- Preserve the exact person (face, body, pose) from the first image
- Add elegant rose garden, fairy lights, and sunset lighting from the second image
- Dress the person in formal wedding attire (suit or elegant dress)
- Position the person centered with soft bokeh roses in background
- Add romantic warm golden hour lighting
- Blend naturally with professional wedding photography style

Background Images: /src/assets/backgrounds/garden.jpg
Campaign Text: Sarah & Mike • June 2025
Active: ✅
Include Header Logo: ❌
```

### Step 3: Event is Live!
```
URL: http://localhost:8080/sarah/sarah-wedding
```

## 🎨 Branding Customization

Each event can have custom branding in the `branding` field:

```json
{
  "logoPath": "/src/assets/backgrounds/custom-logo.png",
  "footerPath": "/src/assets/backgrounds/custom-footer.png",
  "headerBackgroundColor": "#FFFFFF",
  "footerBackgroundColor": "#000000",
  "taglineText": "Custom tagline text"
}
```

## 🔧 Technical Architecture

### Frontend (React + TypeScript)
- **Pages**: AdminAuth, AdminEvents, AdminEventForm, PhotoBoothPage, EventFeedPage
- **Services**: eventsApi (API client), adminStorage (templates)
- **Hooks**: useEventConfig, useEventPhotos

### Backend (FastAPI + Python)
- **Auth**: JWT tokens, bcrypt password hashing
- **Database**: PostgreSQL with asyncpg
- **Storage**: MinIO for images
- **API**: RESTful endpoints with Pydantic models

### Data Flow
```
User → AdminAuth → JWT Token → AdminEvents → Create Event → PostgreSQL
                                                           ↓
                                             Public URL: /user/event
                                                           ↓
                                  Attendee → PhotoBoothPage → Camera → AI Processing
                                                                              ↓
                                                              MinIO ← Upload → PostgreSQL
                                                                ↓
                                                           Share URL / QR Code
```

## 📊 Migration

To migrate existing localStorage data to the new system:

```bash
node server/migrate.js
```

This will:
1. Create a "legacy" user
2. Create a "default" event
3. Migrate existing photos to `processed_photos` table

## 🐛 Troubleshooting

### "Not authenticated" error
- Make sure backend is running (`npm run backend`)
- Check that JWT token is stored in localStorage
- Try logging out and logging in again

### "Event not found"
- Verify event is active (`is_active = TRUE`)
- Check URL matches: `/{user_slug}/{event_slug}`
- User slug and event slug are case-sensitive

### Photos not uploading
- Check backend logs for MinIO errors
- Verify MinIO credentials in `.env`
- Run `npm run setup-minio` to configure bucket permissions

### Templates not loading
- Ensure `templates` field is valid JSON array
- Check that `images` paths are correct
- Verify templates are marked as `active: true`

## 🎯 Next Steps

1. **Docker Deployment** - See `DEPLOYMENT.md`
2. **Custom Branding** - Upload your own logos/footers
3. **Advanced Prompts** - Experiment with AI prompt engineering
4. **Analytics** - Track photo counts per event
5. **Moderation** - Review photos before publishing

## 📚 Related Documentation

- `AI_PROMPT_OPTIMIZATION.md` - Guide for writing better AI prompts
- `AKITA_BRANDING.md` - Branding implementation details
- `START_HERE.md` - Quickstart guide
- `DEPLOYMENT.md` - Docker deployment guide
