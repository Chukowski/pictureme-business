# Photo Sharing System

## Overview

The photo booth includes a robust sharing system that allows users to generate QR codes and share links to their processed photos.

## How It Works

### 1. **Photo Processing & Storage**

When a user takes a photo:
1. The photo is processed with AI (background replacement + branding)
2. A unique 6-character share code is generated (e.g., `PWE1VA`)
3. The photo is saved to:
   - **Primary**: PostgreSQL (metadata) + MinIO (image files)
   - **Fallback**: Browser localStorage (if cloud fails)

### 2. **Share URL Generation**

Share URLs are generated using the format:
```
https://photo.akitapr.com/share/{shareCode}
```

For example:
- Share code: `PWE1VA`
- Share URL: `https://photo.akitapr.com/share/PWE1VA`

### 3. **QR Code Display**

After processing, users see:
- Their processed photo with Siemens branding
- A QR code that links to the share URL
- Options to:
  - Download the photo
  - Copy the share link
  - Send via email (coming soon)
  - Take another photo

### 4. **Viewing Shared Photos**

When someone scans the QR code or visits the share URL:
1. They are taken to `/share/{shareCode}` route
2. The `SharePage` component loads
3. Photo is fetched from:
   - **First try**: Cloud storage (PostgreSQL + MinIO)
   - **Fallback**: Browser localStorage
4. A clean, full-screen display shows:
   - The processed photo
   - Download button
   - Siemens branding footer
   - NO sidebar or navigation (clean display)

## Technical Implementation

### Routes

```typescript
// App.tsx
<Routes>
  {/* Share page - no sidebar, clean display */}
  <Route path="/share/:shareCode" element={<SharePage />} />
  
  {/* Main app routes with sidebar */}
  <Route path="/*" element={<MainAppWithSidebar />} />
</Routes>
```

### Components

#### `SharePage.tsx`
- Loads photo by share code
- Displays loading state
- Shows error if photo not found
- Clean, branded display without sidebar
- Download functionality

#### `ResultDisplay.tsx`
- Shows processed photo after capture
- Generates QR code with share URL
- Provides sharing options
- "Take Another" button to restart flow

### Storage Service

#### `localStorage.ts`
```typescript
// Generate share URL
export function getShareUrl(shareCode: string): string {
  const baseUrl = import.meta.env.VITE_BASE_URL || 'https://photo.akitapr.com';
  return `${baseUrl}/share/${shareCode}`;
}

// Fetch photo by share code (cloud first, localStorage fallback)
export async function getPhotoByShareCode(shareCode: string): Promise<ProcessedPhoto | null>
```

#### `cloudStorage.ts`
```typescript
// Fetch photo metadata from backend
export async function getPhotoByShareCode(shareCode: string): Promise<CloudPhoto | null>
```

## Environment Variables

Set in `.env`:
```bash
# Base URL for share links (production)
VITE_BASE_URL=https://photo.akitapr.com

# Backend API (for cloud storage)
VITE_API_URL=http://localhost:3001
```

## Backend API

### Get Photo by Share Code
```http
GET /api/photos/:shareCode
```

**Response:**
```json
{
  "id": "photo_1761681865008_u11c1b6",
  "shareCode": "PWE1VA",
  "originalImageUrl": "https://storage.akitapr.com/photobooth/photo_..._original.jpg",
  "processedImageUrl": "https://storage.akitapr.com/photobooth/photo_..._processed.jpg",
  "backgroundId": "glares",
  "backgroundName": "Particle Field",
  "createdAt": 1761681865008,
  "prompt": "..."
}
```

## Deployment

### Domain Setup

1. **Main App**: `photo.akitapr.com`
   - Serves the React app (Nginx)
   - Handles all routes including `/share/:shareCode`

2. **Storage**: `storage.akitapr.com`
   - MinIO server for image files
   - Publicly accessible URLs for image download

3. **Backend API**: `photo.akitapr.com/api/*`
   - Proxied to Express backend (port 3001)
   - Handles PostgreSQL + MinIO operations

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name photo.akitapr.com;
    
    # Frontend (React SPA)
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## User Flow

```mermaid
graph TD
    A[User takes photo] --> B[AI processes photo]
    B --> C[Generate share code]
    C --> D[Save to cloud/localStorage]
    D --> E[Show QR code + share link]
    E --> F[User scans QR code]
    F --> G[Open photo.akitapr.com/share/CODE]
    G --> H[SharePage fetches photo]
    H --> I[Display photo + download option]
```

## Troubleshooting

### QR Code doesn't work
- Check `VITE_BASE_URL` is set to production URL
- Verify backend is running and accessible
- Check MinIO bucket permissions (public read required)

### Photo not found
- Verify share code exists in database
- Check PostgreSQL connection
- Ensure MinIO images are accessible
- Check localStorage fallback

### Download fails
- Verify MinIO CORS settings
- Check bucket public read policy
- Ensure image URLs are accessible

## Future Enhancements

- [ ] Email sharing integration
- [ ] Social media sharing (Twitter, Facebook)
- [ ] Photo expiration (auto-delete after X days)
- [ ] Photo gallery view
- [ ] Analytics (view count, download count)

