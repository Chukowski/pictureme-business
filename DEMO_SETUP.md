# Photo Booth AI - Demo Setup Guide

This guide will help you set up and run the Photo Booth AI demo with **local storage** (no database required initially).

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 18+ installed
- A camera-enabled device (webcam, iPad, etc.)
- fal.ai API key ([Get one here](https://fal.ai/dashboard/keys))

### 2. Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp env.example .env

# Edit .env and add your FAL_KEY
nano .env  # or use your preferred editor
```

### 3. Configure Environment Variables

Edit `.env` file:

```env
# Required: Your fal.ai API key
VITE_FAL_KEY=your_actual_fal_api_key_here

# Optional: Choose AI model (defaults to Seedream)
VITE_FAL_MODEL=fal-ai/bytedance/seedream/v4/edit

# Optional: Base URL for sharing
VITE_BASE_URL=http://localhost:8080
```

### 4. Run Development Server

```bash
npm run dev
```

Access at: **http://localhost:8080**

⚠️ **Important**: For camera access, you must use:
- `localhost` or `127.0.0.1` (works over HTTP)
- OR HTTPS with a valid certificate

See [CAMERA_SETUP.md](./CAMERA_SETUP.md) for detailed camera troubleshooting.

---

## 🎨 Available AI Models

### Option 1: Seedream v4 (Default)
```env
VITE_FAL_MODEL=fal-ai/bytedance/seedream/v4/edit
```
- **Best for**: High-quality, cinematic compositing
- **Speed**: ~10-20 seconds
- **Quality**: Excellent for fashion, portraits
- **Cost**: Moderate

### Option 2: Gemini Flash
```env
VITE_FAL_MODEL=fal-ai/gemini-25-flash-image/edit
```
- **Best for**: Fast photo blending
- **Speed**: ~5-10 seconds
- **Quality**: Good for quick edits
- **Cost**: Lower

---

## 📱 How It Works

### Current Implementation (Demo)

1. **Background Selection** → User chooses from 5 pre-designed backgrounds
2. **Camera Capture** → Takes photo with countdown
3. **AI Processing** → Sends to fal.ai for background compositing
4. **Local Storage** → Saves processed image in browser localStorage
5. **Share & Download** → Generates QR code and shareable link

### Storage Solution

**Local Storage (Current)**:
- ✅ No backend required
- ✅ Instant setup
- ✅ Works offline after first load
- ⚠️ Limited to ~5MB storage
- ⚠️ Photos stored per-device only
- ⚠️ Cleared when browser cache is cleared

### Flow Diagram

```
┌─────────────────┐
│ Select Background│
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│ Camera Capture  │
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│ fal.ai API Call │  ← Processes image with AI
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│ Download Result │
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│ Save to         │
│ localStorage    │
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│ Generate QR &   │
│ Share Link      │
└─────────────────┘
```

---

## 🧪 Testing the Demo

### Test Checklist

- [ ] Select a background
- [ ] Allow camera permission when prompted
- [ ] Capture photo (3-2-1 countdown)
- [ ] Wait for AI processing (~10-20 seconds)
- [ ] View processed result
- [ ] Download image
- [ ] Scan QR code on another device
- [ ] View shared photo
- [ ] Create a new photo

### Debug Tools

1. **Camera Debug Panel**: Click the ℹ️ button in top-right during camera view
2. **Browser Console**: Press F12 to see detailed logs
3. **Storage Inspector**: Check localStorage in DevTools → Application → Local Storage

### Common Issues

**Camera not showing?**
→ See [CAMERA_SETUP.md](./CAMERA_SETUP.md)

**AI processing fails?**
→ Check your `VITE_FAL_KEY` in `.env`
→ Check console for error messages
→ Verify API key at https://fal.ai/dashboard/keys

**Photos not saving?**
→ Check localStorage isn't full (max ~5MB)
→ Try clearing old photos in DevTools

---

## 🐳 Docker Deployment

### Build and Run

```bash
# Build the Docker image
docker build -t ai-photo-booth-hub .

# Run the container
docker run -p 8080:80 ai-photo-booth-hub
```

Access at: **http://localhost:8080**

⚠️ **Camera Note**: When running Docker, you need HTTPS for camera access unless accessing via `localhost`.

### Docker with HTTPS (Production)

See [CAMERA_SETUP.md](./CAMERA_SETUP.md) for HTTPS setup options:
- Self-signed certificate
- Reverse proxy (Traefik/Caddy)
- Cloud deployment

---

## 📊 Storage Stats

Check localStorage usage:

```javascript
// In browser console
const stats = JSON.parse(localStorage.getItem('photobooth_photos') || '[]');
console.log('Photos stored:', stats.length);
console.log('Storage used:', new Blob([localStorage.getItem('photobooth_photos')]).size, 'bytes');
```

Clear all photos:

```javascript
localStorage.removeItem('photobooth_photos');
```

---

## 🔄 Upgrading to Backend (Future)

When you're ready to add PostgreSQL + S3/MinIO:

1. Follow [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
2. Set up PostgreSQL database
3. Set up MinIO or S3 for image storage
4. Create backend API endpoints
5. Update frontend to use API instead of localStorage

The current code is structured to make this transition easy!

---

## 🎯 Project Structure

```
src/
├── components/
│   ├── BackgroundSelector.tsx  # Background gallery
│   ├── CameraCapture.tsx       # Camera with debug tools
│   ├── ProcessingLoader.tsx    # AI processing animation
│   └── ResultDisplay.tsx       # QR code & download
├── services/
│   ├── aiProcessor.ts          # fal.ai integration
│   └── localStorage.ts         # Browser storage
├── pages/
│   ├── Index.tsx              # Main app flow
│   └── SharePhoto.tsx         # Shared photo viewer
└── assets/
    └── backgrounds/           # Background images
```

---

## 💡 Tips

1. **Performance**: Seedream gives better results but takes longer. Use Gemini Flash for demos.
2. **Storage**: Monitor localStorage usage. It's limited to ~5MB.
3. **Camera**: Always test on the actual device (iPad) you'll be using.
4. **Sharing**: QR codes work great but links only work while photo is in localStorage.

---

## 🆘 Getting Help

- Camera issues → [CAMERA_SETUP.md](./CAMERA_SETUP.md)
- Backend setup → [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
- AI issues → Check [fal.ai docs](https://fal.ai/docs)

---

## 🎉 You're Ready!

Run `npm run dev` and start creating amazing AI-powered photos! 📸✨

