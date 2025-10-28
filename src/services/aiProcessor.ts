import { fal } from "@fal-ai/client";
import { applyBrandingOverlay } from "./imageOverlay";

// Get configuration
const FAL_KEY = import.meta.env.VITE_FAL_KEY;
const FAL_MODEL = import.meta.env.VITE_FAL_MODEL || "fal-ai/bytedance/seedream/v4/edit";

// Configure fal client with credentials
if (FAL_KEY) {
  fal.config({
    credentials: FAL_KEY,
  });
}

export interface ProcessImageOptions {
  userPhotoBase64: string;
  backgroundPrompt: string;
  backgroundImageUrl?: string;
  backgroundImageUrls?: string[]; // Support multiple background images
  includeBranding?: boolean;
  includeHeader?: boolean;
  onProgress?: (status: string, logs?: string[]) => void;
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
    onProgress,
  } = options;

  if (!FAL_KEY) {
    throw new Error(
      "FAL_KEY not configured. Please add VITE_FAL_KEY to your .env file"
    );
  }

  console.log("🤖 Starting AI processing with model:", FAL_MODEL);
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
    const isSeedream = FAL_MODEL.includes("seedream");
    
    let result;
    
    if (isSeedream) {
      // Seedream v4 Edit model - send both images
      result = await fal.subscribe(FAL_MODEL, {
        input: {
          prompt: backgroundPrompt,
          image_urls: imageUrls, // User photo + background to combine
          num_images: 1,
          output_format: "jpeg",
          image_size: {
            width: 1080,  // 9:16 portrait ratio (Instagram/Story format)
            height: 1920,
          },
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
      // Gemini Flash model - send both images
      result = await fal.subscribe(FAL_MODEL, {
        input: {
          prompt: backgroundPrompt,
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
        backgroundColor: '#000000',
        includeHeader,
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
 * Helper function to convert image URL to data URI
 */
async function imageUrlToDataUri(url: string): Promise<string> {
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
    
    img.src = url;
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

