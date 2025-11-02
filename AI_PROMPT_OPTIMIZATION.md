# AI Prompt Optimization Guide

## Problem
The AI model (`fal-ai/bytedance/seedream/v4/edit`) was removing background elements instead of compositing the person with the background. For example, when placing a person with a cheetah, the cheetah would disappear.

## Root Cause
The original prompts used phrasing like "Take the person from the first image and place them into the second image background" which the AI interpreted as:
- Extract person → Replace background completely
- Instead of: Composite person + preserve background elements

## Solution: Compositing-Focused Prompts

### Key Changes in Prompt Structure

#### ❌ **Old Approach** (Replacement-based)
```
"Take the person from the first image and place them into the second image background..."
```

#### ✅ **New Approach** (Compositing-based)
```
"Create a [scene type] by compositing these images: 
Preserve the exact person (face, body, pose) from the first image.
Add [specific elements from background image] around the person.
Blend all elements naturally so the person appears to be [in the scene]..."
```

### Updated Prompts

#### 1. **Particle Field** (3 images: person + particles + chevron)
```
Create a professional corporate photo by seamlessly compositing these images:
- Preserve the exact person (face, body, pose) from the first image
- Add the atmospheric golden glowing particles and dark technological background from the second image around and behind the person
- Place the orange glowing chevron/arrow symbol from the third image in the person's hands at chest level
- Dress the person in professional dark business attire (sweater or blazer)
- The person should be centered, confidently displaying the glowing chevron
- Maintain photorealistic quality with cinematic lighting
- Blend all elements naturally - the person should look like they are physically present in this particle-filled environment
```

#### 2. **Ocean Depths** (2 images: person + octopus)
```
Create a professional underwater scene by compositing these images:
- Preserve the exact person (face, body, pose) from the first image - do NOT cover their face with masks or goggles
- Composite the majestic octopus with tentacles, turquoise underwater lighting, and bubbles from the second image around the person
- Dress the person in a professional black diving suit with equipment and harness
- Keep the person's face fully visible and natural - NO MASKS ON FACE
- Position the person in the lower center with the large octopus tentacles surrounding them in the background
- Blend everything naturally so the person appears to be actually underwater with the octopus
- Dramatic turquoise professional underwater photography
```

#### 3. **Jungle Explorer** (2 images: person + cheetah)
```
Create a dynamic wildlife action scene by compositing these images:
- Preserve the exact person (face, body) from the first image
- Add the majestic turquoise cheetah/leopard, particles, and dark teal jungle environment from the second image
- Dress the person in safari/outdoor explorer outfit (beige/tan shirt and cargo pants) with backpack
- Position the person running on the left side with the cheetah running beside them on the right
- Both should appear to be running together in the same scene
- Blend all elements naturally so the person and cheetah look like they are actually running together through the jungle
- Professional wildlife photography with dramatic turquoise atmospheric lighting
```

#### 4. **Rain Magic** (2 images: person + rain)
```
Create an environmental scene by compositing these images:
- Preserve the exact person (face, body) from the first image
- Add the heavy rain, turquoise-tinted lighting, dark moody atmosphere, and water reflections from the second image around them
- Dress the person in casual earth-tone clothing (olive/grey t-shirt and jeans)
- The person should be sitting cross-legged on wet ground, smiling while holding a small plant or seedling with glowing turquoise leaves
- Blend all elements naturally so the person appears to be sitting in the rain with the plant
- Professional environmental photography with rain and dramatic turquoise lighting
```

#### 5. **Mystical Leaves** (2 images: person + glowing leaves)
```
Create a mystical nature scene by compositing these images:
- Preserve the exact person (face, body) from the first image
- Add the glowing turquoise leaves with visible veins, small ant on leaf, bokeh effects, and dark mystical background from the second image
- Dress the person in professional dark clothing (black jacket with white collar visible)
- The person should be centered with a calm expression, gently holding or presenting a glowing turquoise leaf
- Blend all elements naturally with floating particles and dramatic turquoise accent lighting
- Professional photography with mystical atmosphere
```

## Prompt Engineering Best Practices

### 1. **Start with Action Verb**
- ✅ "Create a scene by compositing..."
- ✅ "Composite these images to create..."
- ❌ "Take X and put it in Y..."
- ❌ "Place X into Y..."

### 2. **Use "Compositing" Language**
- "Composite these images"
- "Blend all elements naturally"
- "The person appears to be [action] in [environment]"
- "Seamlessly integrate"
- "Preserve [element] while adding [element]"

### 3. **Be Explicit About Preservation**
- "Preserve the exact person (face, body, pose)"
- "Keep the person's face fully visible"
- "Do NOT cover their face with..."
- "Maintain [specific feature] unchanged"

### 4. **Describe Spatial Relationships**
- "Add [element] around and behind the person"
- "Position the person [location] with [element] surrounding them"
- "The person should be centered with [elements] in the background"

### 5. **End with Cohesion Statement**
- "Blend all elements naturally so..."
- "The person should look like they are physically present in..."
- "Create a seamless integration where..."

## Model Configuration

### Current Model
```
fal-ai/bytedance/seedream/v4/edit
```

### Model Capabilities
- ✅ Multi-image compositing (2-3 images)
- ✅ Selective element preservation
- ✅ Atmospheric blending
- ✅ Lighting and color matching
- ✅ Photorealistic output

### Image Input Order
1. **First image**: Person (source)
2. **Second image**: Background scene with elements
3. **Third image** (optional): Props or additional elements

## Testing Approach

### Before Changes
- ❌ Background elements disappeared (cheetah removed)
- ❌ Person was "placed on" background, not "in" it
- ❌ Lighting/colors didn't match
- ❌ Person looked cut-out or pasted

### After Changes
- ✅ Background elements preserved
- ✅ Person appears naturally integrated
- ✅ Lighting and colors blend cohesively
- ✅ Photorealistic composition

## Troubleshooting

### If elements still disappear:
1. Add more explicit language: "Preserve [element] from second image"
2. Use negative prompts: "Do not remove [element]"
3. Emphasize: "Keep ALL visual elements from [image number]"

### If person looks cut-out:
1. Add: "Blend naturally with seamless edges"
2. Emphasize: "Match lighting and atmosphere"
3. Add: "Photorealistic integration"

### If wrong elements appear:
1. Be more specific about which image each element comes from
2. Use numbering: "first image", "second image", "third image"
3. Describe exact element: "the turquoise cheetah" not just "the animal"

## Files Modified
- `/src/services/adminStorage.ts` - Default template prompts
- `/src/components/BackgroundSelector.tsx` - UI template prompts

## Related Documentation
- `AKITA_BRANDING.md` - Branding implementation
- `CODE_DOCUMENTATION.md` - Technical architecture
- `START_HERE.md` - Quickstart guide
