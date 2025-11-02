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

- **Frontend**: React + TypeScript
- **Styling**: Tailwind CSS
- **AI Integration**: fal.ai (Gemini or SeedDream models)
- **Camera**: MediaDevices API
- **QR Codes**: qrcode.react
- **Build Tool**: Vite

## 🚀 Quick Start

### Easy Setup (Recommended)

```bash
# Run the setup script
./setup-demo.sh

# Start the development server
npm run dev
```

Then open **http://localhost:8080** in your browser.

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

## Current Implementation

✅ **Demo Features (Local Storage)**:
- AI-powered background compositing via fal.ai
- Camera capture with permission handling
- Local browser storage (no backend required)
- QR code generation for sharing
- Shareable photo links
- Download functionality
- Debug tools for troubleshooting

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
