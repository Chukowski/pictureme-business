# Siemens Healthineers Branding Configuration

## Overview

Only the **Particle Field (glares)** template applies Siemens Healthineers branding around the photo. All other templates output the raw 9:16 AI image with no header, tagline, or footer.

## Particle Field Composition

The Particle Field template keeps the image at 1080 × 1920 and renders the branding within the same frame:

```
┌─────────────────┐
│   Siemens Logo  │ ← Header band (WHITE background)
├─────────────────┤
│                 │
│   AI Generated  │ ← 9:16 portrait photo
│      Photo      │
│                 │
├─────────────────┤
│ With Atellica   │ ← Tagline (white text, black background)
│ systems...      │
├─────────────────┤
│  "Do less"      │ ← Footer artwork (transparent PNG, black background)
│   Footer        │
└─────────────────┘
```

## Campaign Scenarios

### 1. **Particle Field** - Tech Innovation
- **Theme**: Golden glowing particles with dark background
- **Attire**: Professional business attire (dark sweater/business casual)
- **Props**: **Orange glowing chevron symbol** (held in hands at chest level)
- **Images Used**: 3 images (user photo + background + chevron prop)
- **Pose**: Centered, looking at camera with confident expression, displaying chevron
- **Lighting**: Cinematic with warm golden particle effects
- **Campaign Message**: Technology and innovation
- **Special Note**: This template uses **3 images** - the only one with a prop overlay

### 2. **Ocean Depths** - Need Extra Hands?
- **Theme**: Underwater scene with octopus
- **Attire**: Professional black diving suit with equipment
- **Props**: Octopus tentacles in background, bubbles, jellyfish
- **Pose**: Lower center, looking at camera
- **Lighting**: Turquoise bioluminescent underwater
- **Campaign Text**: "Need extra hands?"
- **Message**: Versatility and support

### 3. **Jungle Explorer** - Run Lean, Run Fast
- **Theme**: Running with turquoise cheetah/leopard
- **Attire**: Safari/outdoor explorer outfit (beige/tan)
- **Props**: Backpack, cheetah running beside
- **Pose**: Dynamic running motion, person on left
- **Lighting**: Dramatic turquoise atmospheric
- **Campaign Text**: "Run lean. Run fast."
- **Message**: Speed and efficiency

### 4. **Rain Magic** - Simply Sustainable
- **Theme**: Rain with growing plant
- **Attire**: Casual earth-tone clothing (olive/grey t-shirt, jeans)
- **Props**: Small plant/seedling with glowing turquoise leaves
- **Pose**: Sitting cross-legged, smiling, holding plant
- **Lighting**: Turquoise-tinted with rain effects
- **Campaign Text**: "Simply sustainable."
- **Message**: Environmental sustainability

### 5. **Mystical Leaves** - Lighten the Load
- **Theme**: Glowing turquoise leaves with ant
- **Attire**: Professional dark clothing (black jacket)
- **Props**: Glowing turquoise leaf with visible veins, small ant
- **Pose**: Centered, calm, holding/presenting leaf
- **Lighting**: Dramatic turquoise accent with particles
- **Campaign Text**: "Lighten the load."
- **Message**: Simplification and efficiency

## Image Specifications

### AI Generated Photo
- **Format**: Portrait (9:16 ratio)
- **Dimensions**: 1080 x 1920 pixels
- **Use**: Instagram Story / Social media compatible

### Branding Elements (Separate Sections)

#### Logo (Top Section)
- **File**: `/src/assets/backgrounds/logo-siemens.png`
- **Position**: Top, centered horizontally
- **Width**: 60% of image width
- **Background**: White (#FFFFFF)
- **Section**: Separate from AI image

#### Footer (Bottom Section)
- **File**: `/src/assets/backgrounds/Footer_DoLess_Transparent.png`
- **Content**: 
  - "With Atellica systems, our goal is simple: **less.**"
  - "Do less." (in orange)
  - Download button icon
- **Position**: Bottom, full width
- **Background**: Transparent PNG
- **Section**: Separate from AI image

### Composition Details (Particle Field)
- **Canvas**: 1080 × 1920 (9:16)
- **Header**: Siemens logo centered inside a white band
- **Tagline**: "With Atellica systems, our goal is simple: less." centered on its own black band above the footer
- **Footer**: Transparent PNG artwork centered on a black band
- **Other Templates**: Render as plain AI images (no additional branding)

## Technical Implementation

### Image Composition Service
Location: `/src/services/imageOverlay.ts`

This service applies the Particle Field branding within a single 9:16 canvas:

```typescript
applyBrandingOverlay(aiImageUrl, {
  backgroundColor: '#000000', // Footer and tagline
  headerBackgroundColor: '#FFFFFF', // White header for logo
  taglineText: 'With Atellica systems, our goal is simple: less.'
})
```

**Process:**
1. Loads AI image (1080 × 1920)
2. Draws the photo as the base layer
3. Paints white header band (for logo)
4. Paints black tagline/footer bands
5. Centers the Siemens logo in the white header band
6. Renders the tagline text above the footer band
7. Centers the footer artwork in the bottom band
8. Returns the branded image (still 1080 × 1920)

### AI Processing Flow
1. User takes photo with camera
2. **AI receives multiple images**:
   - Image 1: User's photo
   - Image 2: Background template (e.g., particles, jungle, ocean)
   - Image 3 (optional): Props (e.g., chevron symbol for Particle Field)
3. AI combines all images according to the prompt
4. AI generates 9:16 portrait photo (1080x1920)
5. AI preserves user's face and facial features exactly
6. AI changes only the clothing to match theme
7. AI integrates props if specified (e.g., person holding chevron)
8. **Vertical composition is created automatically**:
   - Logo section added at top
   - AI image in middle
   - Footer section added at bottom
9. Final composed image is displayed (ready for social media)

### Prompt Structure
Each template uses a specific prompt format:

**For templates with 2 images (most scenarios):**
```
"Take the person from the first image and place them into the second image background. 
Keep the person's face and body exactly as they appear without any modifications. 
Use all visual elements from the second image: [specific elements]. 
Dress the person in [specific attire]. 
[Specific pose and composition instructions]. 
Professional [style] photography with [lighting description]."
```

**For Particle Field (3 images with prop):**
```
"Take the person from the first image and place them into the second image background. 
Keep the person's face and body exactly as they appear without any modifications. 
Use all visual elements from the second image: [specific elements].
The person should be holding the [prop description] from the third image [position].
Dress the person in [specific attire]. 
[Specific pose and composition instructions]. 
Professional [style] photography with [lighting description]."
```

## Key Features

✅ **9:16 Portrait Format**: Perfect for Instagram Stories and social media
✅ **Face Preservation**: User's facial features remain unchanged
✅ **Costume Change**: Clothing adapts to each theme
✅ **Background Integration**: All background elements preserved (cheetah, octopus, etc.)
✅ **Footer & Tagline on All Photos**: Every template adds the “Do less.” band and Atellica tagline
✅ **Header Logo (Particle Field Only)**: Siemens logo band appears only for the glares scene
✅ **Automatic Branding**: Overlay logic runs for every template but header is gated by `includeHeader`
✅ **Campaign Consistency**: Matches Siemens Healthineers "Do less" campaign style
✅ **Transparent Footer**: Uses PNG for seamless integration

## Customization

### Adjust Composition Settings
Edit in `/src/services/aiProcessor.ts`:

```typescript
const brandedImageUrl = await applyBrandingOverlay(processedUrl, {
  backgroundColor: '#000000', // Footer and tagline
  headerBackgroundColor: '#FFFFFF', // White header for logo
  taglineText: 'With Atellica systems, our goal is simple: less.',
  includeHeader: true, // Set to true only for Particle Field
});
```

Set `includeHeader` to `false` (default) for scenes that should not show the Siemens logo. All scenes still render the footer + tagline bands.

### Modify Campaign Text
Each template includes campaign-specific text in the prompt. Edit in `/src/services/adminStorage.ts`:

```typescript
prompt: '... Campaign text: "Your message here"'
```

### Change Branding Assets
Replace these files with new versions:
- `/src/assets/backgrounds/logo-siemens.png` - Logo image
- `/src/assets/backgrounds/Footer_DoLess_Transparent.png` - Footer with transparent background

**Important**: Footer must be a transparent PNG for best results.

## Processing States

The loader shows different messages:
1. **"Waiting in queue..."** - Request queued
2. **"AI is creating your photo..."** - AI generating 9:16 portrait
3. **"Composing final image with branding..."** - Creating vertical composition
4. **Done** - Final composition ready for sharing/download

## Campaign Alignment

All scenarios align with the Siemens Healthineers "Atellica" campaign message:
> "With Atellica systems, our goal is simple: **less.**"

Each photo demonstrates this philosophy through different contexts:
- Less complexity (Tech/Particles)
- Less workload (Octopus/Extra hands)
- Less waste (Efficiency/Speed)
- Less environmental impact (Sustainability)
- Less burden (Lightening the load)

