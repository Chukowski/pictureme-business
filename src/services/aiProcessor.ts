import { fal } from "@fal-ai/client";
import { applyBrandingOverlay } from "./imageOverlay";
import { ENV } from "../config/env";

// Configuration state - FAL_KEY is ONLY loaded from backend for security
let FAL_KEY: string | undefined = undefined;
let DEFAULT_FAL_MODEL: string = "fal-ai/nano-banana/edit"; // Default to Nano Banana (Gemini/Imagen 3)
let configLoaded = false;

async function chargeTokensForGeneration(
  modelId: string,
  context?: string,
  eventId?: number,
  tokens?: number,
  eventSlug?: string,
  userSlug?: string
) {
  console.log("🪙 chargeTokensForGeneration called:", { modelId, context, eventId, tokens, eventSlug, userSlug });
  
  try {
    let apiUrl = ENV.API_URL;
    if (!apiUrl) {
      console.warn("🪙 No API_URL configured, skipping token charge");
      return;
    }
    
    // Force HTTPS for production
    if (apiUrl.startsWith('http://') && !apiUrl.includes('localhost') && !apiUrl.includes('127.0.0.1')) {
      apiUrl = apiUrl.replace('http://', 'https://');
    }

    const payload: Record<string, unknown> = {
      model_id: modelId,
      context,
      event_id: eventId,
      event_slug: eventSlug,
      user_slug: userSlug,
    };

    if (typeof tokens === "number") {
      payload.tokens = tokens;
    }
    
    console.log("🪙 Token charge payload:", payload);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (typeof window !== "undefined") {
      const authToken = localStorage.getItem("auth_token");
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }
    }
    
    const chargeUrl = `${apiUrl}/api/tokens/charge`;
    console.log("🪙 Token charge URL:", chargeUrl);

    const response = await fetch(chargeUrl, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json().catch(() => null);
      console.log("🪙 Token charge response:", data);
      const newBalance = data?.new_balance;
      const tokensCharged = data?.tokens_charged;
      if (typeof newBalance === "number") {
        console.log(`🪙 Tokens charged: ${tokensCharged}, new balance: ${newBalance}`);
        try {
          const betterAuthUser = localStorage.getItem("user");
          if (betterAuthUser) {
            const parsed = JSON.parse(betterAuthUser);
            parsed.tokens_remaining = newBalance;
            localStorage.setItem("user", JSON.stringify(parsed));
          }
        } catch (err) {
          console.warn("Failed to update Better Auth user tokens", err);
        }

        try {
          const legacyUser = localStorage.getItem("current_user");
          if (legacyUser) {
            const parsed = JSON.parse(legacyUser);
            parsed.tokens_remaining = newBalance;
            localStorage.setItem("current_user", JSON.stringify(parsed));
          }
        } catch (err) {
          console.warn("Failed to update legacy user tokens", err);
        }
        
        // Dispatch custom event so dashboard can refresh token display
        window.dispatchEvent(new CustomEvent("tokens-updated", { detail: { newBalance, tokensCharged } }));
      }
    } else {
      const errorText = await response.text().catch(() => "Unknown error");
      console.warn("⚠️ Token charge failed:", response.status, errorText);
    }
  } catch (error) {
    console.warn("⚠️ Failed to record token usage:", error);
  }
}

// Available AI models for selection
export const AI_MODELS = {
  // Image Editing Models
  nanoBanana: {
    id: "fal-ai/nano-banana/edit",
    name: "Nano Banana (Gemini 2.5 Flash)",
    description: "Fast, high-quality image editing",
    speed: "fast",
    type: "image",
    cost: 1,
  },
  nanoBananaPro: {
    id: "fal-ai/nano-banana-pro/edit",
    name: "Nano Banana Pro (Gemini 3 Pro)",
    description: "Premium quality with advanced reasoning",
    speed: "medium",
    type: "image",
    cost: 4,
  },
  seedream: {
    id: "fal-ai/bytedance/seedream/v4/edit",
    name: "Seedream v4",
    description: "Best for LEGO-style and artistic transformations",
    speed: "medium",
    type: "image",
    cost: 1,
  },
  seedream45: {
    id: "fal-ai/bytedance/seedream/v4.5/edit",
    name: "Seedream 4.5",
    description: "Latest ByteDance model - unified generation and editing",
    speed: "medium",
    type: "image",
    cost: 2,
  },
  flux2Pro: {
    id: "fal-ai/flux-2-pro/edit",
    name: "Flux 2 Pro Edit",
    description: "Professional-grade image editing with excellent prompt adherence",
    speed: "medium",
    type: "image",
    cost: 3,
  },
  flux: {
    id: "fal-ai/flux/dev",
    name: "Flux Dev",
    description: "High-quality photorealistic generation (text-to-image only)",
    speed: "slow",
    type: "image",
    cost: 2,
  },
  // Video Models
  kling26Pro: {
    id: "fal-ai/kling-video/v2.6/pro/image-to-video",
    name: "Kling 2.6 Pro (Image to Video)",
    description: "Top-tier cinematic visuals with fluid motion and audio",
    speed: "slow",
    type: "video",
    cost: 150,
  },
  kling26Text: {
    id: "fal-ai/kling-video/v2.6/pro/text-to-video",
    name: "Kling 2.6 Pro (Text to Video)",
    description: "Generate video from text with cinematic quality",
    speed: "slow",
    type: "video",
    cost: 150,
  },
  klingO1Edit: {
    id: "fal-ai/kling-video/o1/video-to-video/edit",
    name: "Kling O1 Video Edit",
    description: "Edit existing video with natural language instructions",
    speed: "slow",
    type: "video",
    cost: 100,
  },
} as const;

export type AIModelKey = keyof typeof AI_MODELS;

// Load config from backend API - this is the ONLY source for sensitive keys
async function loadConfig() {
  if (configLoaded) {
    return;
  }
  
  try {
    // ENV.API_URL now auto-derives production URLs if not set
    const apiUrl = ENV.API_URL;
    
    if (!apiUrl) {
      console.warn('⚠️ No API URL configured - cannot load FAL config');
      configLoaded = true;
      return;
    }
    
    const response = await fetch(`${apiUrl}/api/config`);
    const config = await response.json();
    
    // Backend returns snake_case (fal_key), check both formats for compatibility
    const falKey = config.fal_key || config.falKey;
    if (falKey) {
      FAL_KEY = falKey;
      // Don't override default model from backend - let event config control it
      
      // Configure fal client
      fal.config({
        credentials: FAL_KEY,
      });
      
      console.log('✅ FAL configuration loaded from backend (secure)');
    } else {
      console.warn('⚠️ No FAL key in config response:', Object.keys(config));
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
  forceInstructions?: boolean; // Add extra instructions to help model understand images
  seed?: number; // Seed for reproducible results (same seed = similar output)
  onProgress?: (status: string, logs?: string[]) => void;
  eventId?: number;
  billingContext?: string;
  tokensToCharge?: number;
  skipTokenCharge?: boolean;
  eventSlug?: string;
  userSlug?: string;
}

/**
 * Get image dimensions based on aspect ratio (standard quality)
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

/**
 * Get optimized dimensions for Flux models to stay under 1 megapixel (~$0.03)
 * 1 megapixel = 1,000,000 pixels
 * These dimensions are optimized to be just under 1MP while maintaining aspect ratio
 */
function getFluxOptimizedDimensions(aspectRatio: AspectRatio = '9:16'): { width: number; height: number } {
  switch (aspectRatio) {
    case '1:1':
      // 1000x1000 = 1,000,000 pixels (exactly 1MP)
      return { width: 1000, height: 1000 };
    case '4:5':
      // 894x1118 ≈ 999,492 pixels (<1MP)
      return { width: 894, height: 1118 };
    case '3:2':
      // 1224x816 ≈ 998,784 pixels (<1MP)
      return { width: 1224, height: 816 };
    case '16:9':
      // 1332x750 ≈ 999,000 pixels (<1MP) - using landscape_16_9 preset
      return { width: 1024, height: 576 }; // Flux preset: landscape_16_9
    case '9:16':
    default:
      // 750x1332 ≈ 999,000 pixels (<1MP) - using portrait_16_9 preset
      return { width: 576, height: 1024 }; // Flux preset: portrait_16_9
  }
}

/**
 * Get Flux image_size enum value when available, or custom dimensions
 */
function getFluxImageSize(aspectRatio: AspectRatio = '9:16'): string | { width: number; height: number } {
  // Use Flux's built-in presets when they match our aspect ratios
  switch (aspectRatio) {
    case '1:1':
      return 'square'; // 1024x1024
    case '4:5':
      return 'portrait_4_3'; // Close enough, 768x1024
    case '16:9':
      return 'landscape_16_9'; // 1024x576
    case '9:16':
      return 'portrait_16_9'; // 576x1024
    case '3:2':
      // No preset for 3:2, use custom dimensions
      return { width: 1224, height: 816 };
    default:
      return 'portrait_16_9';
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
  
  console.log("═══════════════════════════════════════════════════════════");
  console.log("🚀 AI PROCESSING STARTED");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("🤖 Model requested:", aiModel || "(default)");
  console.log("🤖 Model to use:", modelToUse);
  console.log("📝 Prompt received:", backgroundPrompt?.substring(0, 200) + (backgroundPrompt?.length > 200 ? '...' : ''));
  console.log("🖼️ Background images:", backgroundImageUrls?.length || (backgroundImageUrl ? 1 : 0));
  console.log("⚙️ Options - forceInstructions:", options.forceInstructions, ", aspectRatio:", options.aspectRatio);

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
      
      const forceInstructions = options.forceInstructions || false;
      let finalPrompt: string;
      
      if (forceInstructions) {
        // User explicitly wants extra instructions - add them for Seedream
        const promptLower = backgroundPrompt.toLowerCase();
        const isStyleTransform = 
          promptLower.includes('lego') || 
          promptLower.includes('pixar') || 
          promptLower.includes('anime') || 
          promptLower.includes('cartoon') ||
          promptLower.includes('clay') ||
          promptLower.includes('3d render') ||
          promptLower.includes('minifigure') ||
          promptLower.includes('toy') ||
          promptLower.includes('plastic');
        
        if (isStyleTransform) {
          // For style transformations, DON'T ask to preserve skin tone, etc.
          finalPrompt = `You have 2 images:
- Image 1: Photo of person(s) - this is the SUBJECT to transform
- Image 2: Background scene - use this as the setting

YOUR TASK: ${backgroundPrompt}

IMPORTANT INSTRUCTIONS:
1. Transform the person(s) from Image 1 according to the style instructions above
2. Keep the same pose, position, and composition as the original
3. Place the transformed subject in the scene from Image 2
4. Match the number of people (if there are 2 people, create 2 characters)
5. The style transformation should be complete - do NOT mix real human features with the new style`;
          console.log("🎨 Style transformation detected - using style-focused prompt (forceInstructions=true)");
        } else {
          // For non-style transformations, preserve identity
          finalPrompt = `IMPORTANT: The person in the provided images is the MAIN SUBJECT. ${backgroundPrompt}. 
You MUST preserve the person's key features: their hair (color, length, style), face shape, skin tone, and overall appearance. 
Transform them while keeping their identity recognizable.`;
          console.log("👤 Identity preservation mode (forceInstructions=true)");
        }
        console.log("📝 Enhanced prompt for Seedream:", finalPrompt);
      } else {
        // Use prompt AS-IS without modifications
        finalPrompt = backgroundPrompt;
        console.log("📝 Using prompt AS-IS for Seedream (forceInstructions=false)");
      }
      
      // Seedream v4 Edit model - send both images with higher guidance for better prompt following
      const seedreamInput: Record<string, unknown> = {
        prompt: finalPrompt,
        image_urls: imageUrls, // User photo + background to combine
        num_images: 1,
        output_format: "jpeg",
        image_size: dimensions,
        guidance_scale: 7.5, // Higher guidance = follows prompt more closely
      };
      
      // Add seed if provided
      if (options.seed !== undefined) {
        seedreamInput.seed = options.seed;
        console.log(`🎲 Seed: ${options.seed} (for reproducible results)`);
      }
      
      result = await fal.subscribe(modelToUse, {
        input: seedreamInput,
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
      const forceInstructions = options.forceInstructions || false;
      
      let finalPrompt = backgroundPrompt;
      
      if (forceInstructions && hasBackgroundImages) {
        // User explicitly wants extra instructions added
        finalPrompt = `You have ${imageUrls.length} images:
- Image 1: Photo of person/people (the subject to transform)
- Image 2: Background/scene image (where to place them)

YOUR TASK: ${backgroundPrompt}

INSTRUCTIONS:
1. Extract the person(s) from Image 1
2. Apply any style transformation mentioned in the task
3. Place the transformed person(s) INTO the scene from Image 2
4. The final image should show the person IN the background scene
5. Match the art style consistently across the entire image
6. Keep the person recognizable despite any style changes

Output a single cohesive image.`;
        console.log("📝 Prompt with FORCED instructions added");
      } else {
        // Force Instructions OFF - send prompt exactly as written by user
        console.log("📝 Using prompt AS-IS (no modifications)");
      }
      
      const isFlux2Pro = modelToUse.includes("flux-2-pro");
      
      // Detailed logging for debugging
      console.log("═══════════════════════════════════════════════════════════");
      console.log("🤖 AI REQUEST DETAILS:");
      console.log("═══════════════════════════════════════════════════════════");
      console.log("🎯 Model:", modelToUse);
      console.log("📸 Images count:", imageUrls.length, "(1 user photo +", bgImages.length, "background images)");
      console.log("⚙️ Force Instructions:", forceInstructions);
      console.log("📐 Aspect Ratio:", aspectRatio);
      console.log("───────────────────────────────────────────────────────────");
      console.log("📝 ORIGINAL PROMPT (from template):");
      console.log(backgroundPrompt);
      console.log("───────────────────────────────────────────────────────────");
      console.log("📝 FINAL PROMPT (sent to AI):");
      console.log(finalPrompt);
      console.log("───────────────────────────────────────────────────────────");
      
      // Build input based on model capabilities
      const modelInput: Record<string, unknown> = {
        prompt: finalPrompt,
        image_urls: imageUrls,
        num_images: 1,
        output_format: "jpeg",
      };
      
      // Add seed if provided (for reproducible results)
      if (options.seed !== undefined) {
        modelInput.seed = options.seed;
        console.log(`🎲 Seed: ${options.seed} (for reproducible results)`);
      }
      
      // Add image_size for Flux 2 Pro - use optimized sizes to stay under 1 megapixel ($0.03)
      if (isFlux2Pro && aspectRatio !== 'auto') {
        const fluxImageSize = getFluxImageSize(aspectRatio);
        modelInput.image_size = fluxImageSize;
        
        if (typeof fluxImageSize === 'string') {
          console.log(`📐 Flux 2 Pro: Using preset "${fluxImageSize}" for aspect ratio ${aspectRatio}`);
        } else {
          console.log(`📐 Flux 2 Pro: Using custom size ${fluxImageSize.width}x${fluxImageSize.height} for aspect ratio ${aspectRatio}`);
        }
        console.log(`💰 Cost optimized: ~$0.03 (under 1 megapixel)`);
      } else {
        const dimensions = getImageDimensions(aspectRatio);
        console.log(`📐 Using aspect ratio: ${aspectRatio} (${dimensions.width}x${dimensions.height})`);
      }
      
      result = await fal.subscribe(modelToUse, {
        input: modelInput,
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

  console.log("🪙 skipTokenCharge:", options.skipTokenCharge);
  if (!options.skipTokenCharge) {
    console.log("🪙 Calling chargeTokensForGeneration...");
    await chargeTokensForGeneration(
      modelToUse,
      options.billingContext,
      options.eventId,
      options.tokensToCharge,
      options.eventSlug,
      options.userSlug
    );
  } else {
    console.log("🪙 Token charge SKIPPED (skipTokenCharge=true)");
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

