# Photo Booth AI - Code Documentation

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Core Components](#core-components)
5. [Services](#services)
6. [Data Flow](#data-flow)
7. [State Management](#state-management)
8. [Styling System](#styling-system)
9. [Configuration](#configuration)

---

## Architecture Overview

This is a **client-side React application** built for iPad that captures photos, processes them with AI-generated backgrounds, and enables sharing via QR codes. The app uses **localStorage** for persistence and **fal.ai** for AI image processing.

```
User Interface (React)
       ↓
Component Layer (UI Components)
       ↓
Service Layer (AI Processing + Storage)
       ↓
External APIs (fal.ai) + Browser APIs (MediaDevices, localStorage)
```

### Key Architectural Decisions

- **No Backend Required**: Uses browser localStorage and client-side AI API calls
- **Single Page Application**: React Router for navigation
- **Component-Based**: Modular, reusable components
- **State-Driven UI**: Clear state machine for app flow
- **iPad-First Design**: Optimized for tablet viewport and touch interactions

---

## Technology Stack

### Core Framework
- **React 18.3.1**: UI library with hooks
- **TypeScript**: Type-safe development
- **Vite**: Build tool and dev server

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library
- **shadcn/ui**: Pre-built component library

### AI & Processing
- **@fal-ai/client**: fal.ai SDK for image processing
- **qrcode.react**: QR code generation

### Routing & State
- **React Router DOM 6**: Client-side routing
- **React Hooks**: State management (useState, useCallback, useEffect)

---

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── BackgroundSelector.tsx    # Gallery of 5 background options
│   ├── CameraCapture.tsx         # Camera interface with debug tools
│   ├── ProcessingLoader.tsx      # AI processing status display
│   ├── ResultDisplay.tsx         # Final result with QR code
│   └── ui/                       # shadcn/ui components (40+ components)
│
├── services/            # Business logic & external integrations
│   ├── aiProcessor.ts            # fal.ai API integration
│   └── localStorage.ts           # Browser storage management
│
├── pages/               # Route pages
│   ├── Index.tsx                 # Main photo booth flow
│   ├── SharePhoto.tsx            # Shared photo viewer
│   └── NotFound.tsx              # 404 page
│
├── hooks/               # Custom React hooks
│   ├── use-mobile.tsx            # Mobile detection
│   ├── use-toast.ts              # Toast notifications
│   └── useCamera.ts              # Camera permissions & access
│
├── assets/              # Static files
│   └── backgrounds/              # 5 background images (JPG)
│
├── lib/
│   └── utils.ts                  # Utility functions (cn helper)
│
├── App.tsx              # Root component with routes
├── main.tsx             # React app entry point
└── index.css            # Global styles & design tokens
```

---

## Core Components

### 1. **BackgroundSelector** (`src/components/BackgroundSelector.tsx`)

**Purpose**: Displays 5 artistic background options for the user to choose from.

**Props**:
```typescript
interface BackgroundSelectorProps {
  onSelect: (background: Background) => void;
}
```

**Background Interface**:
```typescript
interface Background {
  id: string;              // e.g., "jungle"
  name: string;            // e.g., "Jungle Depths"
  prompt: string;          // AI prompt for background
  previewImage: string;    // Path to preview image
}
```

**Key Features**:
- Grid layout with image previews
- Hover effects for interactivity
- Passes selected background to parent via `onSelect` callback

**Backgrounds Available**:
1. **Particle Field** (glares.jpg) - Orange glowing particles
2. **Jungle Depths** (jungle.jpg) - Mysterious teal jungle
3. **Underwater** (ocean.jpg) - Bubbles and aquatic scene
4. **Rain Storm** (rain.jpg) - Dramatic rainfall
5. **Nature Bokeh** (leafs.jpg) - Teal leaves with bokeh effect

---

### 2. **CameraCapture** (`src/components/CameraCapture.tsx`)

**Purpose**: Handles camera access, preview, photo capture with countdown timer, and debug tools.

**Props**:
```typescript
interface CameraCaptureProps {
  onCapture: (imageData: string) => void;  // Base64 image callback
  onBack: () => void;                      // Navigate back
}
```

**Key Features**:
- **Permission Handling**: Detects and requests camera access
- **HTTPS Validation**: Warns if not on secure context
- **Multi-Camera Support**: Allows switching between cameras
- **Countdown Timer**: 3-2-1 countdown before capture
- **Debug Panel**: ℹ️ button shows camera details (resolution, device ID, etc.)
- **Error States**: User-friendly error messages

**Camera Flow**:
1. Request `getUserMedia()` permission
2. Display video stream in `<video>` element
3. On capture button click → start countdown
4. Capture frame to `<canvas>`
5. Convert to base64 JPEG
6. Call `onCapture(imageData)`

**Debug Information**:
- Browser/OS detection
- Camera resolution
- Device ID
- HTTPS status
- Permission state

---

### 3. **ProcessingLoader** (`src/components/ProcessingLoader.tsx`)

**Purpose**: Shows animated loading state while AI processes the image.

**Props**:
```typescript
interface ProcessingLoaderProps {
  status?: string;        // e.g., "queued", "processing"
  logs?: string[];        // AI processing logs from fal.ai
}
```

**Behavior**:
- Displays spinner animation
- Shows dynamic status messages
- Optionally displays AI processing logs
- Used during fal.ai API call (10-20 seconds)

---

### 4. **ResultDisplay** (`src/components/ResultDisplay.tsx`)

**Purpose**: Shows the final processed photo with download, share, and email options.

**Props**:
```typescript
interface ResultDisplayProps {
  processedImage: string;      // Base64 or URL of AI-processed image
  originalImage: string;       // Base64 of original photo
  shareUrl: string;            // Shareable URL with QR code
  onStartOver: () => void;     // Reset to beginning
}
```

**Key Features**:
- **Siemens Healthineers Branding**: Logo overlay on image
- **QR Code**: Generated from `shareUrl` using `qrcode.react`
- **Download Button**: Triggers browser download of image
- **Share Code Display**: Shows 6-character code for manual sharing
- **Copy Link**: Copies share URL to clipboard
- **Email Input** (placeholder): Ready for email integration
- **Responsive Layout**: Vertical layout optimized for iPad

**Share Code Example**: `A1B2C3`

---

## Services

### 1. **AI Processor** (`src/services/aiProcessor.ts`)

**Purpose**: Handles all fal.ai API interactions for image processing.

#### Configuration
```typescript
const FAL_KEY = import.meta.env.VITE_FAL_KEY;
const FAL_MODEL = import.meta.env.VITE_FAL_MODEL || "fal-ai/bytedance/seedream/v4/edit";
```

#### Main Function: `processImageWithAI()`

**Input**:
```typescript
interface ProcessImageOptions {
  userPhotoBase64: string;        // User's captured photo
  backgroundPrompt: string;       // AI prompt (from background)
  backgroundImageUrl?: string;    // Optional background reference image
  backgroundImageUrls?: string[]; // Support for multiple reference images
  includeBranding?: boolean;      // Whether to render Siemens branding (Particle Field only)
  onProgress?: (status: string, logs?: string[]) => void;
}
```

**Output**:
```typescript
interface ProcessImageResult {
  url: string;           // Processed image URL from fal.ai
  seed?: number;         // Random seed used
  contentType?: string;  // MIME type (e.g., "image/jpeg")
}
```

**Process Flow**:
1. Validate `FAL_KEY` exists
2. Convert background image to data URI if provided
3. Prepare `image_urls` array: `[userPhoto, backgroundImage]`
4. Call fal.ai API with model-specific parameters
5. Subscribe to processing queue with progress callbacks
6. Extract processed image URL from response
7. Return result

**Supported Models**:
- **Seedream v4** (`fal-ai/bytedance/seedream/v4/edit`): High quality, 10-20s
- **Gemini Flash** (`fal-ai/gemini-25-flash-image/edit`): Fast, 5-10s

#### Helper Functions

**`imageUrlToDataUri(url: string)`**
- Loads external image via `<img>` tag
- Draws to canvas
- Returns base64 data URI
- Used to convert background images before sending to fal.ai

**`downloadImageAsBase64(url: string)`**
- Fetches image from URL
- Converts blob to base64 via FileReader
- Used to store fal.ai results in localStorage

---

### 2. **Local Storage** (`src/services/localStorage.ts`)

**Purpose**: Manages browser localStorage for photo persistence and sharing.

#### Data Structure

**Photo Interface**:
```typescript
interface ProcessedPhoto {
  id: string;                      // e.g., "photo_1234567890_abc123"
  originalImageBase64: string;     // User's photo (base64)
  processedImageBase64: string;    // AI-processed photo (base64)
  backgroundId: string;            // e.g., "jungle"
  backgroundName: string;          // e.g., "Jungle Depths"
  shareCode: string;               // 6-char code (e.g., "A1B2C3")
  createdAt: number;               // Timestamp
  prompt: string;                  // AI prompt used
}
```

**Storage Key**: `"photobooth_photos"` → Array of `ProcessedPhoto[]`

#### Core Functions

**`saveProcessedPhoto(photo)`**
- Generates unique ID and share code
- Adds timestamp
- Prepends to array (newest first)
- Limits to 50 photos max
- Handles storage overflow by removing old photos
- Returns saved photo with generated fields

**`getPhotoById(id: string)`**
- Retrieves photo by unique ID
- Returns `null` if not found

**`getPhotoByShareCode(shareCode: string)`**
- Retrieves photo by 6-character share code
- Used for `/share/:shareCode` route

**`getAllPhotos()`**
- Returns all stored photos
- Handles JSON parse errors gracefully

**`deletePhoto(id: string)`**
- Removes photo from storage
- Returns `true` if deleted, `false` if not found

**`clearAllPhotos()`**
- Wipes all photos from localStorage

**`getStorageStats()`**
- Returns storage usage metrics:
  - `photoCount`: Number of photos stored
  - `storageUsed`: Bytes used
  - `storageLimit`: ~5MB typical limit
  - `percentUsed`: Usage percentage

**`getShareUrl(shareCode: string)`**
- Constructs shareable URL
- Format: `${VITE_BASE_URL}/share/${shareCode}`

#### ID/Code Generation

**`generateId()`**
- Format: `photo_{timestamp}_{random}`
- Example: `photo_1704067200000_a3b5c7`

**`generateShareCode()`**
- 6-character alphanumeric uppercase
- Example: `A1B2C3`
- Uses `Math.random().toString(36)`

---

## Data Flow

### Complete User Journey

```
1. SELECT BACKGROUND
   └─> User clicks background card
       └─> BackgroundSelector calls onSelect(background)
           └─> Index.tsx updates state: selectedBackground, setState("camera")

2. CAMERA CAPTURE
   └─> CameraCapture component mounts
       └─> Requests camera permission
           └─> Displays video stream
               └─> User clicks capture button
                   └─> 3-2-1 countdown
                       └─> Canvas captures frame → base64
                           └─> Calls onCapture(imageData)
                               └─> Index.tsx: setCapturedPhoto(), setState("processing")

3. AI PROCESSING
   └─> Index.tsx calls processImageWithAI()
       └─> aiProcessor.ts sends to fal.ai
           ├─> Queued status → ProcessingLoader shows "queued"
           ├─> In progress → ProcessingLoader shows logs
           └─> Complete → Returns processed image URL
               └─> downloadImageAsBase64() converts to base64
                   └─> saveProcessedPhoto() stores in localStorage
                       └─> setState("result")

4. RESULT DISPLAY
   └─> ResultDisplay shows:
       ├─> Processed image with Siemens logo
       ├─> QR code (from share URL)
       ├─> Download button
       ├─> Copy link button
       └─> Email input (placeholder)

5. SHARING (via QR code)
   └─> Another device scans QR
       └─> Opens /share/{shareCode}
           └─> SharePhoto.tsx loads
               └─> getPhotoByShareCode() retrieves from localStorage
                   └─> Displays photo with download option
```

---

## State Management

### Main App State (`src/pages/Index.tsx`)

The app uses a **state machine pattern** with `useState`:

```typescript
type AppState = "selecting" | "camera" | "processing" | "result";
const [state, setState] = useState<AppState>("selecting");
```

**State Transitions**:
```
selecting → camera → processing → result → selecting (loop)
    ↓          ↓
  (back)    (back)
```

**Other State Variables**:
```typescript
const [selectedBackground, setSelectedBackground] = useState<Background | null>(null);
const [capturedPhoto, setCapturedPhoto] = useState<string>("");
const [processedPhoto, setProcessedPhoto] = useState<string>("");
const [shareUrl, setShareUrl] = useState<string>("");
```

**State Rendering Logic**:
```typescript
{state === "selecting" && <BackgroundSelector onSelect={handleBackgroundSelect} />}
{state === "camera" && <CameraCapture onCapture={handlePhotoCapture} onBack={handleBack} />}
{state === "processing" && <ProcessingLoader />}
{state === "result" && <ResultDisplay processedImage={processedPhoto} ... />}
```

### Camera Hook (`src/hooks/useCamera.ts`)

Custom hook for camera management:

```typescript
const {
  videoRef,           // React ref for <video> element
  stream,             // MediaStream object
  error,              // Error message if any
  devices,            // Available camera devices
  currentDeviceId,    // Active camera ID
  switchCamera,       // Function to switch cameras
  capturePhoto,       // Function to capture frame
  stopCamera,         // Cleanup function
} = useCamera();
```

---

## Styling System

### Design Tokens (`src/index.css`)

The app uses **CSS custom properties** for theming:

```css
:root {
  --primary: 180 100% 30%;          /* Teal #009999 */
  --secondary: 24 96% 48%;          /* Orange #ee6602 */
  --background: 0 0% 0%;            /* Black */
  --foreground: 0 0% 100%;          /* White */
  /* ... more tokens */
}
```

### Tailwind Configuration (`tailwind.config.ts`)

Extends Tailwind with custom colors mapped to CSS variables:

```typescript
colors: {
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  // ...
}
```

### Component Styling

Uses Tailwind utility classes with semantic tokens:

```tsx
// ✅ CORRECT - Uses design system
<Button className="bg-primary text-primary-foreground">

// ❌ WRONG - Hardcoded colors
<Button className="bg-teal-600 text-white">
```

### Responsive Design

iPad-optimized with responsive breakpoints:

```tsx
<div className="flex flex-col md:flex-row gap-4 md:gap-8">
  {/* Stacks vertically on mobile, horizontally on tablet+ */}
</div>
```

---

## Configuration

### Environment Variables (`.env`)

Required variables:

```env
VITE_FAL_KEY=your_fal_api_key_here
VITE_FAL_MODEL=fal-ai/bytedance/seedream/v4/edit
VITE_BASE_URL=http://localhost:8080
```

- **`VITE_FAL_KEY`**: fal.ai API key (get from https://fal.ai/dashboard/keys)
- **`VITE_FAL_MODEL`**: AI model to use (Seedream or Gemini)
- **`VITE_BASE_URL`**: Base URL for share links (production domain)

### Vite Configuration (`vite.config.ts`)

```typescript
export default defineConfig({
  server: {
    port: 8080,        // Development server port
    host: true,        // Allow external access
  },
  // ... path aliases, plugins
});
```

### TypeScript Configuration

- `tsconfig.json`: Base config
- `tsconfig.app.json`: App-specific settings
- `tsconfig.node.json`: Node environment config

---

## Key Algorithms

### 1. Image Capture to Base64

```typescript
const capturePhoto = () => {
  const video = videoRef.current;
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);
  
  const imageData = canvas.toDataURL("image/jpeg", 0.95);
  return imageData; // data:image/jpeg;base64,...
};
```

### 2. Share Code Generation

```typescript
function generateShareCode(): string {
  return Math.random()
    .toString(36)      // Convert to base-36 string
    .substring(2, 8)   // Take 6 characters
    .toUpperCase();    // A1B2C3 format
}
```

### 3. QR Code URL Generation

```typescript
const shareUrl = getShareUrl(shareCode);
// Returns: http://localhost:8080/share/A1B2C3

<QRCodeSVG value={shareUrl} size={200} />
```

---

## Error Handling

### Camera Errors

```typescript
try {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
} catch (error) {
  if (error.name === "NotAllowedError") {
    setError("Camera permission denied");
  } else if (error.name === "NotFoundError") {
    setError("No camera found");
  }
}
```

### AI Processing Errors

```typescript
try {
  const result = await processImageWithAI(options);
} catch (error) {
  toast.error("AI processing failed. Please try again.");
  setState("selecting"); // Reset to beginning
}
```

### Storage Errors

```typescript
try {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
} catch (error) {
  // localStorage full - remove old photos
  const reducedPhotos = photos.slice(0, 25);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reducedPhotos));
}
```

---

## Performance Considerations

### Image Size Optimization

- Canvas capture at native camera resolution
- JPEG quality: 0.95 (95%)
- fal.ai processes at 1024x1024 for consistency

### localStorage Limits

- Max 50 photos stored
- ~5MB typical browser limit
- Auto-cleanup of old photos when full

### AI Processing

- Seedream v4: 10-20 seconds (high quality)
- Gemini Flash: 5-10 seconds (faster)
- Progress callbacks prevent UI blocking

---

## Browser Compatibility

**Minimum Requirements**:
- Modern browser with `getUserMedia()` support
- localStorage support (all modern browsers)
- HTTPS required for camera (except localhost)

**Tested On**:
- ✅ iPad Safari (primary target)
- ✅ Chrome Desktop/Mobile
- ✅ Firefox
- ✅ Edge

**Known Limitations**:
- Camera requires HTTPS in production
- localStorage ~5MB limit varies by browser
- Some older browsers may not support all features

---

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Adding New Backgrounds

1. Add image to `src/assets/backgrounds/`
2. Update `BackgroundSelector.tsx`:

```typescript
const backgrounds: Background[] = [
  {
    id: "new-background",
    name: "New Background",
    prompt: "AI prompt describing the scene...",
    previewImage: "/src/assets/backgrounds/new-bg.jpg"
  },
  // ...existing backgrounds
];
```

### Debugging Tips

1. **Camera Issues**: Click ℹ️ button for debug info
2. **Console Logs**: Check browser console for detailed logs
3. **Network Tab**: Monitor fal.ai API calls
4. **localStorage**: Inspect Application > Local Storage in DevTools

---

## Security Considerations

### API Keys

- ⚠️ `VITE_FAL_KEY` is exposed in client-side code
- For production, move AI processing to backend
- See `IMPLEMENTATION_PLAN.md` for backend setup

### localStorage Security

- Data stored in plain text
- Not encrypted
- Accessible via DevTools
- Suitable for demo/local use only

### Camera Permissions

- Requires HTTPS in production (except localhost)
- Browser permission prompt required
- No camera data sent to server (stays client-side)

---

## Future Improvements

See `IMPLEMENTATION_PLAN.md` for full backend implementation:

1. **Backend Database**: PostgreSQL for persistent storage
2. **Cloud Storage**: S3/MinIO for images
3. **Email Delivery**: Resend API integration
4. **User Authentication**: Optional user accounts
5. **Analytics**: Track usage and popular backgrounds
6. **Admin Dashboard**: Manage photos and settings

---

## Troubleshooting

### Camera Not Working
- Check HTTPS requirement
- Verify camera permissions in browser settings
- Try different camera if multiple available
- See `CAMERA_SETUP.md`

### AI Processing Fails
- Verify `VITE_FAL_KEY` in `.env` file
- Check fal.ai API key validity
- Ensure internet connection
- Check browser console for errors

### localStorage Full
```javascript
// Clear all photos
localStorage.removeItem('photobooth_photos');
// Or in DevTools: Application > Local Storage > Clear
```

### Share Links Not Working
- Verify `VITE_BASE_URL` is set correctly
- Check if photo exists in localStorage
- Try regenerating share code

---

## Code Conventions

### Naming Conventions
- **Components**: PascalCase (e.g., `BackgroundSelector.tsx`)
- **Functions**: camelCase (e.g., `handlePhotoCapture`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `STORAGE_KEY`)
- **Types/Interfaces**: PascalCase (e.g., `ProcessedPhoto`)

### File Organization
- One component per file
- Co-locate types with components
- Shared types in separate files
- Services in `src/services/`

### TypeScript
- Strict mode enabled
- Explicit return types for functions
- Interface over type for objects
- No `any` types (use `unknown` if needed)

---

## Resources

### Documentation
- `README.md` - Project overview and quick start
- `DEMO_SETUP.md` - Demo setup instructions
- `CAMERA_SETUP.md` - Camera troubleshooting
- `IMPLEMENTATION_PLAN.md` - Backend implementation plan
- `WHAT_WAS_BUILT.md` - Feature summary

### External Documentation
- [fal.ai Docs](https://fal.ai/docs) - AI API documentation
- [React Docs](https://react.dev) - React framework
- [Tailwind CSS](https://tailwindcss.com) - Styling framework
- [Vite Docs](https://vitejs.dev) - Build tool

---

## Contact & Support

For questions or issues:
1. Check existing documentation files
2. Review browser console for errors
3. Contact Siemens Healthineers development team

---

*Last Updated: 2025-10-21*
