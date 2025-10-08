# Photo Booth AI - Siemens Healthineers

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
- 🏢 Siemens Healthineers branding

## Tech Stack

- **Frontend**: React + TypeScript
- **Styling**: Tailwind CSS
- **AI Integration**: fal.ai (Gemini or SeedDream models)
- **Camera**: MediaDevices API
- **QR Codes**: qrcode.react
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Camera-enabled device (iPad recommended)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file:

```env
FAL_KEY=your_fal_api_key
FAL_MODEL=fal-ai/gemini-25-flash-image/edit
# OR use SeedDream: fal-ai/bytedance/seedream/v4/edit
```

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
- Primary Teal: `#009999` (HSL: 180, 100%, 30%)
- Secondary Orange: `#ee6602` (HSL: 24, 96%, 48%)
- Background: Black `#000000`

**Typography:**
- System fonts optimized for readability
- Bold headings for impact

## Project Structure

```
src/
├── components/
│   ├── CameraCapture.tsx       # Camera interface with countdown
│   ├── BackgroundSelector.tsx  # Background gallery
│   ├── ProcessingLoader.tsx    # AI processing animation
│   └── ResultDisplay.tsx       # QR code & sharing
├── hooks/
│   └── useCamera.ts            # Camera access hook
├── assets/
│   └── backgrounds/            # Background images
└── pages/
    └── Index.tsx               # Main app flow
```

## TODO: Backend Integration

- [ ] Create edge function for fal.ai API calls
- [ ] Implement email service integration
- [ ] Add image storage for QR code persistence
- [ ] Set up analytics tracking

## Browser Support

- Modern browsers with MediaDevices API
- Optimized for iPad Safari
- Chrome, Firefox, Edge supported

## License

Proprietary - Siemens Healthineers

## Contact

For questions or support, contact the Siemens Healthineers development team.
