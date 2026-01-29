# 🎨 Template Marketplace Workflow System

## Overview

The Workflow/Pipeline system allows creators to build sophisticated AI templates by chaining multiple operations together. This enables complex use cases like:

- **Photo Booth → Faceswap → Video**: Take a photo, swap faces, then animate to video
- **Image Edit → Video**: Transform an image, then animate it
- **Video → Video**: Motion control, extend, or transform existing videos
- **Multi-step Image Generation**: Chain multiple AI models with different references

## Architecture

### Core Types

#### `WorkflowStep`
Represents a single operation in the pipeline:

```typescript
interface WorkflowStep {
    id: string;
    type: WorkflowStepType;
    name: string;
    model: string;              // Model shortId (e.g., 'seedream-t2i', 'veo-3.1')
    prompt?: string;
    negative_prompt?: string;
    reference_images?: string[]; // Background images
    reference_elements?: string[]; // Overlay elements/assets
    settings?: {
        strength?: number;
        faceswapEnabled?: boolean;
        aspectRatio?: string;
        duration?: number;
        fps?: number;
        motion_intensity?: number;
    };
}
```

#### `WorkflowPipeline`
The complete workflow configuration:

```typescript
interface WorkflowPipeline {
    steps: WorkflowStep[];
    final_output: {
        type: 'image' | 'video';
        preview_url: string;        // The showcase result
        preview_images: string[];   // Multiple preview variations
    };
}
```

#### `PipelineConfig`
Unified configuration supporting both simple and advanced modes:

```typescript
interface PipelineConfig {
    // Simple mode (backwards compatible)
    imageModel?: string;
    videoModel?: string;
    faceswapEnabled?: boolean;
    videoEnabled?: boolean;
    
    // Advanced mode (workflow)
    workflow?: WorkflowPipeline;
    
    // Asset library
    assets?: {
        backgrounds: string[];
        elements: string[];
        reference_images: string[];
    };
}
```

## Workflow Step Types

### 1. Text-to-Image (`text-to-image`)
Generate an image from a text prompt.

**Models**: `seedream-t2i`, `flux-realism`, `flux-2-pro`, `nano-banana`, `nano-banana-pro`

**Use Cases**:
- Generate base images
- Create backgrounds
- Generate elements

### 2. Image-to-Image (`image-to-image`)
Edit or transform an existing image.

**Models**: `seedream-t2i`, `flux-2-pro`, `nano-banana`, `nano-banana-pro`

**Settings**:
- `strength`: How much to transform (0-1)
- `reference_images`: Images to use as references

**Use Cases**:
- Style transfer
- Image editing
- Composition

### 3. Face Swap (`faceswap`)
Apply face swap to an image.

**Models**: Any image model with `faceswapEnabled: true`

**Use Cases**:
- Photo booth effects
- Character replacement
- Portrait transformation

### 4. Image-to-Video (`image-to-video`)
Animate a static image into video.

**Models**: `veo-3.1`, `veo-3.1-fast`, `kling-2.5`, `ltx-video`

**Settings**:
- `duration`: Video length in seconds (1-10)
- `fps`: Frames per second (24, 30, 60)
- `strength`: Animation intensity

**Use Cases**:
- Animate portraits
- Bring images to life
- Create dynamic content

### 5. Video-to-Video (`video-to-video`)
Transform or extend existing video.

**Models**: `veo-3.1`, `veo-3.1-fast`, `kling-2.5`

**Settings**:
- `motion_intensity`: Control motion strength
- `duration`: Extended duration

**Use Cases**:
- Motion control
- Video extension
- Style transfer for video

### 6. Text-to-Video (`text-to-video`)
Generate video directly from text prompt.

**Models**: `veo-3.1`, `veo-3.1-fast`, `kling-2.5`, `ltx-video`

**Settings**:
- `duration`: Video length
- `fps`: Frame rate

**Use Cases**:
- Generate video content
- Create animations
- Motion graphics

## Example Workflows

### Example 1: Photo Booth with Video Animation

```typescript
{
  steps: [
    {
      id: "step-1",
      type: "image-to-image",
      name: "Apply Style",
      model: "flux-realism",
      prompt: "cyberpunk city background, neon lights",
      reference_images: ["background-url"],
      settings: { strength: 0.8 }
    },
    {
      id: "step-2",
      type: "faceswap",
      name: "Face Swap",
      model: "seedream-t2i",
      settings: { faceswapEnabled: true }
    },
    {
      id: "step-3",
      type: "image-to-video",
      name: "Animate",
      model: "veo-3.1-fast",
      prompt: "smooth camera movement, cinematic",
      settings: { duration: 5, fps: 30 }
    }
  ],
  final_output: {
    type: "video",
    preview_url: "final-video-url",
    preview_images: ["thumbnail-1", "thumbnail-2"]
  }
}
```

### Example 2: Multi-Reference Image Generation

```typescript
{
  steps: [
    {
      id: "step-1",
      type: "text-to-image",
      name: "Base Generation",
      model: "flux-2-pro",
      prompt: "professional product photo",
      reference_images: ["product-ref-1", "product-ref-2"],
      reference_elements: ["logo-overlay"],
      settings: { aspectRatio: "9:16" }
    },
    {
      id: "step-2",
      type: "image-to-image",
      name: "Refinement",
      model: "nano-banana-pro",
      prompt: "enhance lighting and details",
      settings: { strength: 0.5 }
    }
  ],
  final_output: {
    type: "image",
    preview_url: "final-image-url",
    preview_images: ["preview-1", "preview-2", "preview-3"]
  }
}
```

## Asset Management

### Preview vs Original Assets

Templates can showcase a final result while preserving the original assets used to create it:

```typescript
{
  pipeline_config: {
    workflow: { /* ... */ },
    assets: {
      backgrounds: [
        "original-bg-1.jpg",
        "original-bg-2.jpg"
      ],
      elements: [
        "logo.png",
        "frame-overlay.png"
      ],
      reference_images: [
        "style-reference-1.jpg",
        "composition-reference.jpg"
      ]
    }
  },
  preview_url: "final-showcase-result.jpg",  // What users see
  preview_images: [
    "variation-1.jpg",
    "variation-2.jpg",
    "variation-3.jpg"
  ]
}
```

**Benefits**:
- Show the best possible result as preview
- Provide all original assets for customization
- Allow users to understand the creation process
- Enable remixing and variations

## UI Components

### WorkflowBuilder

The `WorkflowBuilder` component provides a visual interface for creating workflows:

**Features**:
- Add/remove steps
- Reorder steps (move up/down)
- Expand/collapse step details
- Per-step configuration
- Visual flow indicators
- Model selection with cost display

**Usage**:
```tsx
<WorkflowBuilder
  workflow={formData.pipeline_config?.workflow}
  onChange={(workflow) => setFormData({
    ...formData,
    pipeline_config: { ...formData.pipeline_config, workflow }
  })}
/>
```

### Mode Toggle

Templates can switch between Simple and Workflow modes:

```tsx
<div className="flex gap-2">
  <Button onClick={() => setUseWorkflow(false)}>
    Simple Mode
  </Button>
  <Button onClick={() => setUseWorkflow(true)}>
    Workflow Mode
  </Button>
</div>
```

## Cost Calculation

Each model has an associated token cost:

**Image Models**:
- `nano-banana`: 1 token
- `seedream-t2i`: 2 tokens
- `flux-realism`: 2 tokens
- `flux-2-pro`: 4 tokens
- `nano-banana-pro`: 15 tokens

**Video Models**:
- `ltx-video`: 10 tokens
- `veo-3.1-fast`: 100 tokens
- `veo-3.1`: 100 tokens
- `kling-2.5`: 100 tokens

**Total Cost** = Sum of all step costs

## Backend Implementation

### Storage

Workflows are stored in CouchDB as part of the `MarketplaceTemplate` document:

```json
{
  "_id": "template-123",
  "name": "Cyberpunk Portrait Video",
  "pipeline_config": {
    "workflow": {
      "steps": [ /* ... */ ],
      "final_output": { /* ... */ }
    },
    "assets": { /* ... */ }
  }
}
```

### Execution

When a user applies a template:

1. Load workflow steps
2. Execute steps sequentially
3. Pass output from step N to step N+1
4. Apply user's photo at appropriate step
5. Return final result

## Best Practices

### For Creators

1. **Start Simple**: Begin with 1-2 steps, add complexity as needed
2. **Test Thoroughly**: Preview each step's output
3. **Provide References**: Include high-quality reference images
4. **Optimize Costs**: Use faster models where appropriate
5. **Clear Naming**: Give descriptive names to each step

### For Templates

1. **Showcase Quality**: Use your best result as preview
2. **Include Assets**: Provide all original backgrounds/elements
3. **Document Steps**: Clear step names and descriptions
4. **Set Realistic Costs**: Balance quality vs token cost
5. **Test Variations**: Ensure workflow works with different inputs

## Future Enhancements

- [ ] Conditional branching (if/else logic)
- [ ] Parallel step execution
- [ ] Step output caching
- [ ] Workflow templates/presets
- [ ] Visual workflow graph editor
- [ ] A/B testing for steps
- [ ] Performance analytics
- [ ] Cost optimization suggestions

## API Reference

### Create Template with Workflow

```typescript
POST /api/marketplace/templates
{
  "name": "My Workflow Template",
  "media_type": "workflow",
  "pipeline_config": {
    "workflow": {
      "steps": [ /* ... */ ],
      "final_output": { /* ... */ }
    },
    "assets": { /* ... */ }
  }
}
```

### Execute Workflow

```typescript
POST /api/marketplace/templates/:id/use
{
  "user_photo": "base64-image-data",
  "custom_prompt": "optional custom prompt"
}
```

## Troubleshooting

### Workflow Not Saving
- Check that all required fields are filled
- Ensure at least one step exists
- Verify model IDs are valid

### Step Execution Fails
- Check model availability
- Verify reference image URLs are accessible
- Ensure settings are within valid ranges

### High Token Cost
- Use faster models (nano-banana, ltx-video)
- Reduce video duration
- Optimize number of steps

## Support

For questions or issues with the workflow system:
- Check this documentation
- Review example workflows
- Contact support team
