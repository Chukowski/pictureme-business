import { fal } from "@fal-ai/client";
import { applyBrandingOverlay } from "./imageOverlay";
import { ENV } from "../config/env";

// Configuration state - FAL_KEY is ONLY loaded from backend for security
let FAL_KEY: string | undefined = undefined;
let DEFAULT_FAL_MODEL: string = "fal-ai/nano-banana/edit"; // Default to Nano Banana (Gemini/Imagen 3)
let configLoaded = false;

// Available AI models for selection
export const AI_MODELS = {
  nanoBanana: {
    id: "fal-ai/nano-banana/edit",
    name: "Nano Banana (Gemini/Imagen 3)",
    description: "Fast, high-quality image editing with good prompt following",
    speed: "fast",
  },
  seedream: {
    id: "fal-ai/bytedance/seedream/v4/edit",
    name: "Seedream v4",
    description: "Best for LEGO-style and artistic transformations",
    speed: "medium",
  },
  flux: {
    id: "fal-ai/flux/dev",
    name: "Flux Dev",
    description: "High-quality photorealistic generation",
    speed: "slow",
  },
} as const;

export type AIModelKey = keyof typeof AI_MODELS;

// Load config from backend API - this is the ONLY source for sensitive keys
async function loadConfig() {
  if (configLoaded) {
    return;
  }
  
  try {
    let apiUrl = ENV.API_URL || 'http://localhost:3001';
    
    // Enforce HTTPS for production
    if (apiUrl.startsWith('http://') && !apiUrl.includes('localhost') && !apiUrl.includes('127.0.0.1')) {
      apiUrl = apiUrl.replace('http://', 'https://');
    }
    
    const response = await fetch(`${apiUrl}/api/config`);
    const config = await response.json();
    
    if (config.falKey) {
      FAL_KEY = config.falKey;
      // Don't override default model from backend - let event config control it
      
      // Configure fal client
      fal.config({
        credentials: FAL_KEY,
      });
      
      console.log('✅ FAL configuration loaded from backend (secure)');
    }
  } catch (error) {
    console.warn('⚠️ Failed to load config from backend:', error);
  }
  
  configLoaded = true;
}

import type { WatermarkConfig } from './imageOverlay';

export type AspectRatio = 'auto' | '1:1' | '4:5' | '3:2' | '16:9' | '9:16';

export interface ProcessImageOptions {
  userPhotoBase64: string;
  backgroundPrompt: string;
  backgroundImageUrl?: string;
  backgroundImageUrls?: string[]; // Support multiple background images
  includeBranding?: boolean;
  includeHeader?: boolean;
  campaignText?: string; // Campaign text overlay (e.g., "Need extra hands?")
  taglineText?: string; // Custom tagline text
  logoUrl?: string; // Custom logo URL
  footerUrl?: string; // Custom footer URL
  headerBackgroundColor?: string; // Header background color
  watermark?: WatermarkConfig; // Watermark configuration
  aspectRatio?: AspectRatio; // Output aspect ratio
  aiModel?: string; // AI model to use (defaults to Gemini)
  onProgress?: (status: string, logs?: string[]) => void;
}

/**
 * Get image dimensions based on aspect ratio
 */
function getImageDimensions(aspectRatio: AspectRatio = '9:16'): { width: number; height: number } {
  switch (aspectRatio) {
    case '1:1':
      return { width: 1080, height: 1080 };
    case '4:5':
      return { width: 1080, height: 1350 };
    case '3:2':
      return { width: 1620, height: 1080 };
    case '16:9':
      return { width: 1920, height: 1080 };
    case '9:16':
    default:
      return { width: 1080, height: 1920 };
  }
}

export interface ProcessImageResult {
  url: string;
  seed?: number;
  contentType?: string;
}

/**
 * Process an image with AI using fal.ai
 * Supports both Seedream v4 and Gemini Flash models
 */
export async function processImageWithAI(
  options: ProcessImageOptions
): Promise<ProcessImageResult> {
  const {
    userPhotoBase64,
    backgroundPrompt,
    backgroundImageUrl,
    backgroundImageUrls,
    includeBranding = true,
    includeHeader = false,
    campaignText,
    aspectRatio = '9:16',
    aiModel,
    onProgress,
  } = options;

  // Load config from backend if not available
  await loadConfig();

  if (!FAL_KEY) {
    throw new Error(
      "FAL_KEY not configured. Please add VITE_FAL_KEY to your environment variables."
    );
  }

  // Use provided model or default
  const modelToUse = aiModel || DEFAULT_FAL_MODEL;
  
  console.log("🤖 Starting AI processing with model:", modelToUse);
  console.log("📝 Prompt:", backgroundPrompt);
  console.log("🖼️ Background images:", backgroundImageUrls || [backgroundImageUrl]);

  try {
    // Prepare image URLs array - user photo + all background images
    const imageUrls: string[] = [];
    
    // 1. Add user photo as data URI (base64)
    imageUrls.push(userPhotoBase64);
    
    // 2. Add background images (support both single and multiple)
    const bgImages = backgroundImageUrls || (backgroundImageUrl ? [backgroundImageUrl] : []);
    
    for (const bgImageUrl of bgImages) {
      console.log("🖼️ Loading background image:", bgImageUrl);
      const bgDataUri = await imageUrlToDataUri(bgImageUrl);
      imageUrls.push(bgDataUri);
    }
    
    console.log("📸 Sending images count:", imageUrls.length, "(1 user photo +", bgImages.length, "background images)");

    // Call fal.ai based on model type
    const isSeedream = modelToUse.includes("seedream");
    
    let result;
    
    if (isSeedream) {
      // Get dimensions based on aspect ratio
      const dimensions = getImageDimensions(aspectRatio);
      console.log(`📐 Using aspect ratio: ${aspectRatio} (${dimensions.width}x${dimensions.height})`);
      
      // For Seedream, we need to be very explicit about the person in the image
      // Add specific instructions about preserving the person's features
      const enhancedPrompt = `IMPORTANT: The person in the provided images is the MAIN SUBJECT. ${backgroundPrompt}. 
You MUST preserve the person's key features: their hair (color, length, style), face shape, skin tone, and overall appearance. 
Transform them while keeping their identity recognizable.`;
      
      console.log("📝 Enhanced prompt for Seedream:", enhancedPrompt);
      
      // Seedream v4 Edit model - send both images with higher guidance for better prompt following
      result = await fal.subscribe(modelToUse, {
        input: {
          prompt: enhancedPrompt,
          image_urls: imageUrls, // User photo + background to combine
          num_images: 1,
          output_format: "jpeg",
          image_size: dimensions,
          guidance_scale: 7.5, // Higher guidance = follows prompt more closely
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS" && onProgress) {
            const logs = update.logs?.map((log) => log.message) || [];
            onProgress("processing", logs);
            logs.forEach((log) => console.log("📊", log));
          }
          if (update.status === "IN_QUEUE" && onProgress) {
            onProgress("queued");
          }
        },
      });
    } else {
      // Gemini Flash (Nano Banana) or other models
      const hasBackgroundImages = bgImages.length > 0;
      
      // Build enhanced prompt based on what we're trying to do
      let enhancedPrompt = backgroundPrompt;
      
      // Check if prompt mentions style transformation keywords
      const styleKeywords = ['transform', 'convert', 'turn into', 'make', 'lego', 'pixar', 'anime', 'cartoon', 'comic', 'pixel', 'painting', 'sketch', 'drawing', 'minifigure', '3d', 'animated'];
      const isStyleTransfer = styleKeywords.some(keyword => backgroundPrompt.toLowerCase().includes(keyword));
      
      if (hasBackgroundImages && isStyleTransfer) {
        // COMBINED: Style transfer + Background scene
        // This is the most common photobooth use case
        enhancedPrompt = `CREATE A NEW IMAGE combining these elements:

IMAGE 1 (first image): Contains the person/people - this is who to transform
IMAGE 2 (second image): Contains the background/scene - this is WHERE to place them

TASK: ${backgroundPrompt}

IMPORTANT INSTRUCTIONS:
1. Extract the person(s) from Image 1
2. Apply the style transformation to them (e.g., LEGO, Pixar, anime style)
3. Place the transformed person(s) INTO the scene from Image 2
4. The final image should show the stylized person IN the background scene
5. Match the art style consistently across the entire image
6. Keep the person recognizable despite the style change

Output a single cohesive image with the transformed person placed in the background scene.`;
      } else if (hasBackgroundImages) {
        // COMPOSITING: Just place person in background (no style change)
        enhancedPrompt = `CREATE A COMPOSITE IMAGE:

IMAGE 1 (first image): Contains the person/people to extract
IMAGE 2 (second image): Contains the background scene

TASK: ${backgroundPrompt}

INSTRUCTIONS:
1. Extract the person(s) from Image 1
2. Place them naturally into the scene from Image 2
3. Match lighting, scale, and perspective
4. Preserve the person's exact appearance, clothing, and pose
5. Make it look like they were photographed in that location

Output a single realistic composite image.`;
      } else if (isStyleTransfer) {
        // STYLE ONLY: Transform person without specific background
        enhancedPrompt = `TRANSFORM THE PERSON in this image:

${backgroundPrompt}

INSTRUCTIONS:
1. Apply the style transformation to the person
2. Keep them recognizable (preserve key features like hair, face shape)
3. Transform the entire scene to match the style
4. Output a cohesive stylized image`;
      }
      // If none of the above, just use the original prompt
      
      console.log("📝 Enhanced prompt for Nano Banana:", enhancedPrompt);
      console.log("📸 Images being sent:", imageUrls.length, "(hasBackground:", hasBackgroundImages, ", isStyleTransfer:", isStyleTransfer, ")");
      
      result = await fal.subscribe(modelToUse, {
        input: {
          prompt: enhancedPrompt,
          image_urls: imageUrls, // User photo + background to combine
          num_images: 1,
          output_format: "jpeg",
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS" && onProgress) {
            const logs = update.logs?.map((log) => log.message) || [];
            onProgress("processing", logs);
            logs.forEach((log) => console.log("📊", log));
          }
          if (update.status === "IN_QUEUE" && onProgress) {
            onProgress("queued");
          }
        },
      });
    }

    console.log("✅ AI processing complete:", result);

    // Extract the processed image URL (both models return images array)
    const processedUrl = result.data?.images?.[0]?.url;

    if (!processedUrl) {
      throw new Error("No processed image URL returned from AI");
    }

    if (includeBranding) {
      console.log("🎨 Creating branded composition...");
      if (onProgress) {
        onProgress("applying_branding");
      }

      const brandedImageUrl = await applyBrandingOverlay(processedUrl, {
        backgroundColor: '#000000', // Footer and tagline
        headerBackgroundColor: options.headerBackgroundColor || '#FFFFFF', // Custom or white header
        includeHeader,
        campaignText,
        taglineText: options.taglineText,
        logoUrl: options.logoUrl,
        footerUrl: options.footerUrl,
        watermark: options.watermark,
      });

      console.log("✅ Branded composition created successfully");

      return {
        url: brandedImageUrl,
        seed: result.data?.seed,
        contentType: result.data?.images?.[0]?.content_type || "image/jpeg",
      };
    }

    return {
      url: processedUrl,
      seed: result.data?.seed,
      contentType: result.data?.images?.[0]?.content_type || "image/jpeg",
    };
  } catch (error) {
    console.error("❌ AI processing error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`AI processing failed: ${errorMessage}`);
  }
}

/**
 * Get proxied URL for S3 images to bypass CORS
 */
function getProxiedUrl(url: string): string {
  // Check if URL is from S3 and needs proxying
  const s3Patterns = [
    's3.amazonaws.com/pictureme.now',
    'pictureme.now.s3.amazonaws.com'
  ];
  
  const needsProxy = s3Patterns.some(pattern => url.includes(pattern));
  
  if (needsProxy) {
    const apiUrl = ENV.API_URL || '';
    return `${apiUrl}/api/proxy/image?url=${encodeURIComponent(url)}`;
  }
  
  return url;
}

/**
 * Helper function to convert image URL to data URI
 */
async function imageUrlToDataUri(url: string): Promise<string> {
  // Use proxy for S3 URLs to bypass CORS
  const proxiedUrl = getProxiedUrl(url);
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // Enable CORS
    
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      const dataUri = canvas.toDataURL("image/jpeg", 0.95);
      resolve(dataUri);
    };
    
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${url}`));
    };
    
    img.src = proxiedUrl;
  });
}

/**
 * Download processed image from URL and convert to base64
 * Useful for storing in localStorage
 */
export async function downloadImageAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Failed to download image:", error);
    throw error;
  }
}

