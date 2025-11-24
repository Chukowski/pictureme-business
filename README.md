# Photo Booth AI - Akitá (akitapr.com)

A responsive Photo Booth web application designed for iPad use that allows users to capture photos, select AI-generated backgrounds, and receive their edited photos via QR code or email.

## Features

- 📸 Live camera capture with countdown timer
- 🎨 5 stunning pre-designed backgrounds:
  - Particle Field (orange glowing particles)
  - Jungle Depths (mysterious teal jungle)
  - Underwater (bubbles and aquatic scene)
  - Rain Storm (dramatic rainfall)
  - Nature Bokeh (teal leaves with bokeh)
- 🤖 AI-powered background integration via fal.ai
- 📱 QR code generation for instant downloads
- 📧 Email delivery option
- 🎯 iPad-optimized responsive design
- 🏢 Akitá event branding

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: FastAPI (Python)
- **Auth Server**: Express.js (Node.js) - Better Auth
- **Database**: PostgreSQL + CouchDB
- **Storage**: MinIO (S3-compatible)
- **Styling**: Tailwind CSS + shadcn/ui
- **AI Integration**: fal.ai (Flux Dev, SeedDream, Gemini models)
- **Camera**: MediaDevices API
- **QR Codes**: qrcode.react
- **Authentication**: Better Auth (JWT + Sessions)

## 🚀 Quick Start

### Easy Setup (Recommended)

```bash
# 1. Install dependencies
npm install

# 2. Setup environment variables
cp env.example .env
# Edit .env and add your configuration

# 3. Run database migrations (if needed)
npm run migrate:better-auth

# 4. Start all services (Frontend + Backend + Auth)
npm run dev:full
```

Then open **http://localhost:8080** in your browser.

**Services:**
- Frontend: http://localhost:8080
- Backend API: http://localhost:3001
- Auth Server: http://localhost:3002

### Manual Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env file
cp env.example .env

# 3. Edit .env and add your fal.ai API key
# Get your key from: https://fal.ai/dashboard/keys

# 4. Start development server
npm run dev
```

### Environment Variables

Edit `.env` file:

```env
VITE_FAL_KEY=your_fal_api_key_here
VITE_FAL_MODEL=fal-ai/bytedance/seedream/v4/edit
# OR use Gemini: fal-ai/gemini-25-flash-image/edit
VITE_BASE_URL=http://localhost:8080
```

### 📚 Documentation

- **[DEMO_SETUP.md](./DEMO_SETUP.md)** - Complete demo setup guide
- **[CAMERA_SETUP.md](./CAMERA_SETUP.md)** - Camera troubleshooting & HTTPS setup
- **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** - Backend integration plan

## Usage

1. **Select Background**: Choose from 5 artistic backgrounds
2. **Position**: Stand in front of the camera
3. **Capture**: Press the capture button (3-2-1 countdown)
4. **AI Processing**: Wait while AI composites your photo
5. **Download/Share**: Use QR code or email to get your photo

## AI Models

The app supports two fal.ai models (configurable via `FAL_MODEL` env variable):

- **Gemini Nano Banana** (`fal-ai/gemini-25-flash-image/edit`): Fast image editing
- **SeedDream v4** (`fal-ai/bytedance/seedream/v4/edit`): High-quality compositing

## Design System

**Colors:**
- Primary Deep Blue: `#0A3D62`
- Secondary Amber: `#F39C12`
- Background: Black `#000000`

**Typography:**
- System fonts optimized for readability
- Bold headings for impact

## Project Structure

```
src/
├── components/
│   ├── CameraCapture.tsx       # Camera with debug tools
│   ├── BackgroundSelector.tsx  # Background gallery
│   ├── ProcessingLoader.tsx    # AI processing animation
│   └── ResultDisplay.tsx       # QR code & sharing
├── services/
│   ├── aiProcessor.ts          # fal.ai integration
│   └── localStorage.ts         # Browser storage
├── pages/
│   ├── Index.tsx              # Main app flow
│   └── SharePhoto.tsx         # Shared photo viewer
└── assets/
    └── backgrounds/           # Background images
```

## Authentication System

✅ **Better Auth Implementation**:
- Login with email or username
- Secure password hashing (bcrypt)
- JWT tokens with role-based access
- HTTP-only cookies for security
- Persistent sessions (7 days)
- User roles: individual, business, superadmin
- 6 users successfully migrated

**Login:**
```
URL: http://localhost:8080/admin/auth
Email: demo@photobooth.app
Password: [your password]
```

**Documentation:**
- `docs/BETTER_AUTH_FINAL.md` - Complete implementation guide
- `docs/MIGRATION_SUCCESS.md` - Migration summary
- `docs/FINAL_SETUP.md` - Setup and troubleshooting

## Current Implementation

✅ **Production Features**:
- AI-powered background compositing via fal.ai
- Camera capture with permission handling
- User authentication and authorization
- Event management dashboard
- Template library system
- QR code generation for sharing
- Shareable photo links
- Download functionality
- Analytics per event
- Dark/Light mode support

## Future Enhancements

- [ ] Backend API for persistent storage (see IMPLEMENTATION_PLAN.md)
- [ ] PostgreSQL database integration
- [ ] S3/MinIO object storage
- [ ] Email service integration (Resend)
- [ ] Analytics tracking
- [ ] Admin dashboard

## Browser Support

- Modern browsers with MediaDevices API
- Optimized for iPad Safari
- Chrome, Firefox, Edge supported

## License

Proprietary - Akitá (akitapr.com)

## Contact

For questions or support, contact the Akitá team at https://akitapr.com.
