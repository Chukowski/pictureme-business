import { fal } from "@fal-ai/client";
import { applyBrandingOverlay } from "./imageOverlay";
import { ENV } from "../config/env";
import type { JobUpdateData } from "../hooks/useSSE";

// Configuration state - FAL_KEY is ONLY loaded from backend for security
// Configuration state - FAL_KEY is ONLY loaded from backend for security
let FAL_KEY: string | undefined = undefined;
export let DEFAULT_FAL_MODEL: string = "fal-ai/nano-banana/edit"; // Default to Nano Banana (Gemini/Imagen 3)
let configLoaded = false;

export async function chargeTokensForGeneration(
  modelId: string,
  context?: string,
  eventId?: number,
  tokens?: number,
  eventSlug?: string,
  userSlug?: string
) {
  console.log("🪙 chargeTokensForGeneration called:", { modelId, context, eventId, tokens, eventSlug, userSlug });

  try {
    const apiUrl = ENV.API_URL;
    if (!apiUrl) {
      console.warn("🪙 No API_URL configured, skipping token charge");
      return;
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

/**
 * Wait for a generation job to complete using SSE events with polling fallback.
 * This eliminates aggressive polling while maintaining reliability.
 */
async function waitForJobCompletion(jobId: number, apiUrl: string, timeoutMs = 120000): Promise<string> {
  return new Promise((resolve, reject) => {
    let resolved = false;
    let pollInterval: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      window.removeEventListener('job-updated', handleJobUpdate as EventListener);
    };

    const handleJobUpdate = (event: CustomEvent<JobUpdateData>) => {
      if (resolved) return;
      const data = event.detail;

      if (data.job_id === jobId) {
        if (data.status === 'completed' && data.url) {
          console.log('✅ Job completed via SSE:', jobId);
          resolved = true;
          cleanup();
          resolve(data.url);
        } else if (data.status === 'failed') {
          console.error('❌ Job failed via SSE:', data.error);
          resolved = true;
          cleanup();
          reject(new Error(data.error || 'Generation failed'));
        }
      }
    };

    window.addEventListener('job-updated', handleJobUpdate as EventListener);

    // Polling fallback (every 3 seconds)
    const pollForStatus = async () => {
      if (resolved) return;
      try {
        const authToken = localStorage.getItem('auth_token');
        const statusRes = await fetch(`${apiUrl}/api/generate/status/${jobId}`, {
          headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
        });
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.status === 'completed' && statusData.url) {
            console.log('✅ Job completed via polling:', jobId);
            resolved = true;
            cleanup();
            resolve(statusData.url);
          } else if (statusData.status === 'failed') {
            resolved = true;
            cleanup();
            reject(new Error(statusData.error || 'Generation failed'));
          }
        }
      } catch (e) {
        console.warn('Poll error:', e);
      }
    };

    pollInterval = setInterval(pollForStatus, 3000);
    pollForStatus(); // Immediate poll

    setTimeout(() => {
      if (!resolved) {
        cleanup();
        reject(new Error('Generation timed out'));
      }
    }, timeoutMs);
  });
}

// Map short model IDs to full FAL.ai model IDs
const MODEL_ID_MAP: Record<string, string> = {
  // Image models
  'nano-banana': 'fal-ai/nano-banana/edit',
  'nano-banana-pro': 'fal-ai/nano-banana-pro/edit',
  'seedream-v4.5': 'fal-ai/bytedance/seedream/v4.5/edit',
  'flux-dev': 'fal-ai/flux/dev',
  'flux-realism': 'fal-ai/flux-realism',
  'flux-2-pro': 'fal-ai/flux-2-pro/edit',
  'flux-klein': 'fal-ai/flux-2/klein/9b/base/edit/lora',

  // Backwards compatibility / variations
  'nano-banana-base': 'fal-ai/nano-banana',
  'nano-banana-pro-base': 'fal-ai/nano-banana-pro',
  'flux-pro': 'fal-ai/flux-2-pro/edit',
  'flux-2-dev': 'fal-ai/flux/dev',

  // Video models
  'kling-2.6-pro': 'fal-ai/kling-video/v2.6/pro/image-to-video',
  'kling-v2.5-i2v': 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
  'wan-v2': 'fal-ai/wan/v2.2-a14b/image-to-video',
  'ltx-video': 'fal-ai/ltx-video',
  'veo-3.1-i2v': 'fal-ai/veo3.1/image-to-video',
  'veo-3.1-fast': 'fal-ai/veo3.1/fast',
  'google-video': 'fal-ai/google/veo-3-1/image-to-video',
};

/**
 * Resolve a model ID to the full FAL.ai model ID
 * Accepts both short names (e.g., 'nano-banana') and full IDs (e.g., 'fal-ai/nano-banana/edit')
 */
export function resolveModelId(modelId: string): string {
  // If it's already a full FAL.ai ID, return as-is
  if (modelId.startsWith('fal-ai/')) {
    return modelId;
  }
  // Look up in the map
  const resolved = MODEL_ID_MAP[modelId];
  if (resolved) {
    console.log(`🔄 Resolved model ID: ${modelId} → ${resolved}`);
    return resolved;
  }
  // Unknown model, return as-is and hope for the best
  console.warn(`⚠️ Unknown model ID: ${modelId}, using as-is`);
  return modelId;
}

/**
 * Normalize a model ID from full FAL.ai path to short ID
 * used for UI selection and consistency
 */
export function normalizeModelId(modelId: string): string {
  if (!modelId) return '';

  const clean = (s: string) => s.toLowerCase().replace(/\s+/g, '').replace(/\/edit$/, '').replace(/\/lora$/, '').replace(/\/text-to-image$/, '').replace(/\/image-to-video$/, '');
  const lowerId = clean(modelId);

  // 1. Try to find inverse mapping in MODEL_ID_MAP
  for (const [shortId, fullId] of Object.entries(MODEL_ID_MAP)) {
    if (fullId === modelId || clean(fullId) === lowerId || shortId === modelId || clean(shortId) === lowerId) {
      return shortId;
    }
  }

  // 2. Try to find in AI_MODELS definitions (by technical ID or display name)
  for (const modelData of Object.values(AI_MODELS) as any[]) {
    const model = modelData as { id: string; shortId: string; name: string; variants?: any[] };
    const modelShortLower = clean(model.shortId);
    const modelNameLower = clean(model.name);

    if (model.id === modelId || clean(model.id) === lowerId || modelShortLower === lowerId || modelNameLower === lowerId) {
      return model.shortId;
    }

    // Check variants too
    if (model.variants) {
      for (const variant of model.variants) {
        const variantNameLower = clean(variant.name);
        const variantShortLower = clean(variant.id);
        if (variant.id === modelId || variantShortLower === lowerId || variantNameLower === lowerId) {
          return variant.id;
        }
      }
    }
  }

  // 3. Fallback: If it's already a known short ID (doesn't start with fal-ai/), return it
  if (!modelId.startsWith('fal-ai/')) return modelId;

  // 4. Return as-is if no mapping found
  return modelId;
}

// Available AI models for selection
export const AI_MODELS = {
  // --- GOOGLE ---
  // --- GOOGLE ---
  veo31: {
    id: "fal-ai/google/veo-3-1/image-to-video",
    shortId: "veo-3.1",
    name: "Veo 3.1",
    brand: "Google",
    description: "Google's state-of-the-art video generation",
    speed: "slow",
    type: "video",
    cost: 100,
    capabilities: ['i2v', 't2v'] as const,
    variants: [
      { id: "veo-3.1", name: "Standard (I2V)", description: "Premium quality I2V", cost: 100 },
      { id: "veo-3.1-fast", name: "Fast", description: "Lightning-fast generation", cost: 100 },
      { id: "veo-3.1-frames", name: "Frames", description: "Interpolate between frames", cost: 100 },
      { id: "veo-3.1-extend", name: "Extend", description: "Seamlessly extend video", cost: 100 }
    ]
  },
  veo31Fast: {
    id: "fal-ai/veo3.1/fast",
    shortId: "veo-3.1-fast",
    name: "Veo 3.1 Fast",
    brand: "Google",
    description: "Lightning-fast video generation from Google DeepMind",
    speed: "fast",
    type: "video",
    cost: 100,
    capabilities: ['t2v'] as const,
    isVariant: true
  },
  veo31I2V: {
    id: "fal-ai/veo3.1/image-to-video",
    shortId: "veo-3.1-i2v",
    name: "Veo 3.1 Premium",
    brand: "Google",
    description: "Google's premium image-to-video model",
    speed: "slow",
    type: "video",
    cost: 100,
    capabilities: ['i2v'] as const,
    isVariant: true
  },
  veo31Frames: {
    id: "fal-ai/veo3.1/fast/first-last-frame-to-video",
    shortId: "veo-3.1-frames",
    name: "Veo 3.1 Frames",
    brand: "Google",
    description: "Interpolate between two frames",
    speed: "fast",
    type: "video",
    cost: 100,
    capabilities: ['i2v'] as const,
    isVariant: true
  },
  veo31Extend: {
    id: "fal-ai/veo3.1/fast/extend-video",
    shortId: "veo-3.1-extend",
    name: "Veo 3.1 Extend",
    brand: "Google",
    description: "Extend videos seamlessly",
    speed: "fast",
    type: "video",
    cost: 100,
    capabilities: ['v2v'] as const,
    isVariant: true
  },
  nanoBanana: {
    id: "fal-ai/nano-banana/edit",
    shortId: "nano-banana",
    name: "Nano Banana",
    brand: "Google",
    description: "Google Nano Banana - Fast image editing",
    speed: "fast",
    type: "image",
    cost: 1,
    capabilities: ['i2i', 't2i'] as const,
    variants: [
      { id: "nano-banana", name: "Standard", description: "Fast image editing", cost: 1 },
      { id: "nano-banana-pro", name: "Pro", description: "Premium quality", cost: 15 }
    ]
  },
  nanoBananaPro: {
    id: "fal-ai/nano-banana-pro/edit",
    shortId: "nano-banana-pro",
    name: "Nano Banana Pro",
    brand: "Google",
    description: "Google Nano Banana Pro - Premium quality",
    speed: "medium",
    type: "image",
    cost: 15,
    capabilities: ['i2i', 't2i'] as const,
    isVariant: true
  },
  googleVideo: {
    id: "fal-ai/google/veo-3-1/image-to-video",
    shortId: "google-video",
    name: "Google Video (Legacy)",
    brand: "Google",
    description: "Legacy Google video model",
    speed: "slow",
    type: "video",
    cost: 100,
    capabilities: ['i2v'] as const,
    isVariant: true
  },

  // --- KLING ---
  kling26Pro: {
    id: "fal-ai/kling-video/v2.6/pro/image-to-video",
    shortId: "kling-2.6-pro",
    name: "Kling 2.6",
    brand: "Kling",
    description: "Fluid motion and cinematic realism",
    speed: "slow",
    type: "video",
    cost: 100,
    capabilities: ['i2v', 't2v'] as const,
    variants: [
      { id: "kling-2.6-pro", name: "Pro", description: "Highest quality cinematic motion", cost: 100 },
      { id: "kling-v2.6-motion", name: "Motion Control", description: "Precise camera and subject control", cost: 100 },
      { id: "kling-v2.6-motion-std", name: "Standard Motion", description: "Optimized motion control", cost: 100 },
      { id: "kling-o1-edit", name: "O1 Edit", description: "Edit video with instructions", cost: 100 }
    ]
  },
  kling25I2V: {
    id: "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
    shortId: "kling-v2.5-i2v",
    name: "Kling 2.5",
    brand: "Kling",
    description: "Premium performance with Kling Turbo",
    speed: "medium",
    type: "video",
    cost: 100,
    capabilities: ['i2v', 't2v'] as const,
    variants: [
      { id: "kling-v2.5-i2v", name: "Turbo I2V", description: "Fast image-to-video", cost: 100 },
      { id: "kling-v2.5-t2v", name: "Turbo T2V", description: "Fast text-to-video", cost: 100 }
    ]
  },
  kling25T2V: {
    id: "fal-ai/kling-video/v2.5-turbo/pro/text-to-video",
    shortId: "kling-v2.5-t2v",
    name: "Kling Turbo T2V",
    brand: "Kling",
    description: "Fast, high-quality text-to-video generation",
    speed: "medium",
    type: "video",
    cost: 100,
    capabilities: ['t2v'] as const,
    isVariant: true
  },
  kling26Motion: {
    id: "fal-ai/kling-video/v2.6/pro/motion-control",
    shortId: "kling-v2.6-motion",
    name: "Kling 2.6 Motion",
    brand: "Kling",
    description: "Precise motion control and camera movement",
    speed: "slow",
    type: "video",
    cost: 100,
    capabilities: ['i2v'] as const,
    isVariant: true
  },
  kling26MotionStd: {
    id: "fal-ai/kling-video/v2.6/standard/motion-control",
    shortId: "kling-v2.6-motion-std",
    name: "Kling 2.6 Standard Motion",
    brand: "Kling",
    description: "Standard motion control for Kling v2.6",
    speed: "medium",
    type: "video",
    cost: 100,
    capabilities: ['i2v'] as const,
    isVariant: true
  },
  klingO1Edit: {
    id: "fal-ai/kling-video/o1/video-to-video/edit",
    shortId: "kling-o1-edit",
    name: "Kling O1 Edit",
    brand: "Kling",
    description: "Edit existing video with instructions",
    speed: "slow",
    type: "video",
    cost: 100,
    capabilities: ['v2v'] as const,
    isVariant: true
  },

  // --- WAN ---
  wanV2: {
    id: "fal-ai/wan/v2.2-a14b/image-to-video",
    shortId: "wan-v2",
    name: "Wan V2.2 (I2V)",
    brand: "Wan",
    description: "Excellent motion and realism for image-to-video",
    speed: "medium",
    type: "video",
    cost: 100,
    capabilities: ['i2v'] as const,
  },

  // --- LTX ---
  ltxVideo: {
    id: "fal-ai/ltx-video",
    shortId: "ltx-video",
    name: "LTX Video",
    brand: "LTX",
    description: "Fast, high-quality cinematic video generation",
    speed: "medium",
    type: "video",
    cost: 10,
    capabilities: ['t2v', 'i2v'] as const,
  },

  // --- FLUX ---
  flux2Pro: {
    id: "fal-ai/flux-2-pro/edit",
    shortId: "flux-2-pro",
    name: "Flux Models",
    brand: "Flux",
    description: "Professional image generation and editing",
    speed: "medium",
    type: "image",
    cost: 4,
    capabilities: ['i2i', 't2i'] as const,
    variants: [
      { id: "flux-2-pro", name: "Pro", description: "Flux 2 Pro - Professional editing", cost: 4 },
      { id: "flux-dev", name: "Dev", description: "Flux Dev", cost: 3 },
      { id: "flux-klein", name: "Klein", description: "Flux Klein - Fast efficient", cost: 1 },
      { id: "flux-realism", name: "Realism", description: "Flux Realism", cost: 2 }
    ]
  },
  fluxKlein: {
    id: "fal-ai/flux-2/klein/9b/base/edit/lora",
    shortId: "flux-klein",
    name: "Flux Klein",
    brand: "Flux",
    description: "Fast & efficient image generation",
    speed: "fast",
    type: "image",
    cost: 1,
    capabilities: ['i2i', 't2i'] as const,
    isVariant: true
  },
  fluxDev: {
    id: "fal-ai/flux/dev",
    shortId: "flux-dev",
    name: "Flux Dev",
    brand: "Flux",
    description: "Flux Dev",
    speed: "medium",
    type: "image",
    cost: 3,
    capabilities: ['t2i'] as const,
    isVariant: true
  },
  fluxRealism: {
    id: "fal-ai/flux-realism",
    shortId: "flux-realism",
    name: "Flux Realism",
    brand: "Flux",
    description: "Flux Realism",
    speed: "medium",
    type: "image",
    cost: 2,
    capabilities: ['t2i'] as const,
    isVariant: true
  },

  // --- BYTEDANCE ---
  seedream: {
    id: "fal-ai/bytedance/seedream/v4.5/edit",
    shortId: "seedream-v4.5",
    name: "Seedream",
    brand: "Bytedance",
    description: "Bytedance Seedream - Multi-modal generation",
    speed: "medium",
    type: "image",
    cost: 2,
    capabilities: ['i2i', 't2i'] as const,
    variants: [
      { id: "seedream-v4.5", name: "v4.5", description: "Bytedance Seedream v4.5", cost: 2 },
      { id: "seedream-v4", name: "v4", description: "Bytedance Seedream v4", cost: 1 },
      { id: "seedream-edit", name: "Edit", description: "Bytedance Seedream Edit", cost: 2 },
      { id: "seedream-t2i", name: "Text-to-Image", description: "Bytedance Seedream Text-to-Image", cost: 2 }
    ]
  },
  seedreamEdit: {
    id: "fal-ai/bytedance/seedream/v4.5/edit",
    shortId: "seedream-edit",
    name: "Seedream Edit",
    brand: "Bytedance",
    description: "Bytedance Seedream Edit",
    speed: "medium",
    type: "image",
    cost: 2,
    capabilities: ['i2i'] as const,
    isVariant: true
  },
  seedreamT2I: {
    id: "fal-ai/bytedance/seedream/v4.5/text-to-image",
    shortId: "seedream-t2i",
    name: "Seedream T2I",
    brand: "Bytedance",
    description: "Bytedance Seedream Text-to-Image",
    speed: "medium",
    type: "image",
    cost: 2,
    capabilities: ['t2i'] as const,
  }
} as const;

export type AIModelKey = keyof typeof AI_MODELS;

// Helper arrays for easier iteration
export const LOCAL_IMAGE_MODELS = Object.values(AI_MODELS).filter(m => (m as any).type === 'image');
export const LOCAL_VIDEO_MODELS = Object.values(AI_MODELS).filter(m => (m as any).type === 'video');

// Legacy models to be hidden from selector but still resolvable if encountered
export const LEGACY_MODEL_IDS = [
  'flux-realism',
  'seedream-t2i',
  'seedream-edit',
  'kling-pro',
  'google-video'
];

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

    // We no longer need to load FAL_KEY in the frontend as all generation happens backend-side
    // This prevents the "credentials exposed" warning

    console.log('✅ Backend configuration loaded');
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
  numImages?: number;
}

/**
 * Get image dimensions based on aspect ratio (standard quality)
 */
export function getImageDimensions(aspectRatio: AspectRatio = '9:16'): { width: number; height: number } {
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
export function getFluxOptimizedDimensions(aspectRatio: AspectRatio = '9:16'): { width: number; height: number } {
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
 * Flux 2 Pro supports: square, portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9
 */
export function getFluxImageSize(aspectRatio: AspectRatio = '9:16'): string | { width: number; height: number } {
  // Use Flux's built-in presets when they match our aspect ratios
  switch (aspectRatio) {
    case '1:1':
      return 'square'; // 1024x1024
    case '4:5':
      // No exact preset for 4:5, use custom dimensions
      return { width: 816, height: 1020 };
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
  urls?: string[];
  rawUrl?: string;
  seed?: number;
  contentType?: string;
  jobId?: number;
  status?: string;
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
    numImages = 1,
  } = options;

  // Load config from backend if not available
  await loadConfig();



  // Use provided model or default, and resolve short IDs to full FAL.ai IDs
  const requestedModel = aiModel || DEFAULT_FAL_MODEL;
  let modelToUse = resolveModelId(requestedModel);

  // Validate required parameters
  if (!userPhotoBase64 && !modelToUse.includes("lora")) {
    // If no user photo, we need to make sure we're using a text-to-image model
    // or that we have at least some input images
    if (!backgroundImageUrl && (!backgroundImageUrls || backgroundImageUrls.length === 0)) {
      throw new Error("No input provided. Please upload a photo or select a template.");
    }
  }

  // Switch to Text-to-Image if no user photo is provided for Flux Klein
  if (!userPhotoBase64 && modelToUse === 'fal-ai/flux-2/klein/9b/base/edit/lora') {
    modelToUse = 'fal-ai/flux-2/klein/9b/base/lora';
    console.log("📝 No user photo provided, switching to Text-to-Image model");
  }

  console.log("═══════════════════════════════════════════════════════════");
  console.log("🚀 AI PROCESSING STARTED");
  console.log("═══════════════════════════════════════════════════════════");
  // console.log("🤖 Model requested:", aiModel || "(default)"); // Hidden for privacy
  // console.log("🤖 Model resolved:", modelToUse); // Hidden for privacy
  console.log("📝 Prompt received:", backgroundPrompt?.substring(0, 50) + "...");
  console.log("🖼️ Background images:", backgroundImageUrls?.length || (backgroundImageUrl ? 1 : 0));
  console.log("⚙️ Options - forceInstructions:", options.forceInstructions, ", aspectRatio:", options.aspectRatio);

  try {
    // Prepare image URLs array - user photo + all background images
    const imageUrls: string[] = [];

    // 1. Add user photo as data URI (base64) if provided
    if (userPhotoBase64) {
      imageUrls.push(userPhotoBase64);
    }

    // 2. Add background images (support both single and multiple)
    const bgImages = backgroundImageUrls || (backgroundImageUrl ? [backgroundImageUrl] : []);

    for (const bgImageUrl of bgImages) {
      // console.log("🖼️ Loading background image:", bgImageUrl); // Too verbose
      const bgDataUri = await imageUrlToDataUri(bgImageUrl);
      imageUrls.push(bgDataUri);
    }

    console.log("📸 Processing images count:", imageUrls.length);

    // Determine prompt strategy
    const isSeedream = modelToUse.includes("seedream");
    let finalPrompt = backgroundPrompt;
    let imageSize: string | { width: number; height: number } | undefined;

    if (isSeedream) {
      // Get dimensions based on aspect ratio
      const dimensions = getImageDimensions(aspectRatio);
      imageSize = dimensions;

      const forceInstructions = options.forceInstructions || false;

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
          // console.log("🎨 Style transformation detected");
        } else {
          finalPrompt = `IMPORTANT: The person in the provided images is the MAIN SUBJECT. ${backgroundPrompt}.
You MUST preserve the person's key features: their hair (color, length, style), face shape, skin tone, and overall appearance.
Transform them while keeping their identity recognizable.`;
          // console.log("👤 Identity preservation mode");
        }
      } else {
        // console.log("📝 Using standard prompt strategy");
      }
    } else {
      // Gemini/Flux logic
      const hasBackgroundImages = bgImages.length > 0;
      const forceInstructions = options.forceInstructions || false;

      if (forceInstructions && hasBackgroundImages) {
        finalPrompt = `You have ${imageUrls.length} images:
- Image 1: Photo of person/people (the subject to transform)
- Image 2: Background/scene image (where to place them)

INSTRUCTIONS:
1. Extract the person(s) from Image 1
2. Apply any style transformation mentioned in the task
3. Place the transformed person(s) INTO the scene from Image 2
4. The final image should show the person IN the background scene
5. Match the art style consistently across the entire image
6. Keep the person recognizable despite any style changes

Output a single cohesive image.`;
        // console.log("📝 Enhanced prompt strategy active");
      } else {
        // console.log("📝 Standard prompt strategy active");
      }

      const isFlux2Pro = modelToUse.includes("flux-2-pro");
      if (isFlux2Pro && aspectRatio !== 'auto') {
        imageSize = getFluxImageSize(aspectRatio);
      } else {
        imageSize = getImageDimensions(aspectRatio);
      }
    }

    // Prepare request for Go backend
    const apiUrl = ENV.API_URL;
    if (!apiUrl) {
      throw new Error("API_URL not configured");
    }

    // Upload images first to get URLs (Go backend expects URLs, not base64 in generation request)
    // Actually, for now, let's assume the Go backend can handle the image_url if we pass it
    // But wait, our Go backend expects `image_url` (singular) in GenerateImageRequest
    // We need to handle the multi-image case.
    // For now, let's upload the combined image or handle it via the backend's upload endpoint if needed.
    // BUT, the Go backend's GenerateImageRequest has `ImageURL *string`.
    // It seems the Go backend might need an update to support multiple images or we need to upload them.

    // Let's look at how we did it before: we passed `image_urls` (array) to FAL.
    // The Go backend currently only accepts `image_url` (singular).
    // We should update the Go backend to accept `image_urls` or handle the upload here.

    // For this step, let's assume we are sending the request to the Go backend.
    // We'll need to upload the images first if they are base64, because Go backend expects URLs.

    // Helper to upload base64 image
    const uploadImage = async (base64Data: string): Promise<string> => {
      const blob = await (await fetch(base64Data)).blob();
      const formData = new FormData();
      formData.append('file', blob, 'image.jpg');

      const uploadRes = await fetch(`${apiUrl}/api/generate/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Failed to upload image');
      const data = await uploadRes.json();
      return data.url;
    };

    console.log("📤 Uploading assets...");
    const uploadedUrls: string[] = [];
    for (const dataUri of imageUrls) {
      const url = await uploadImage(dataUri);
      uploadedUrls.push(url);
    }
    // console.log("✅ Images uploaded:", uploadedUrls); // Hidden

    // Construct the request payload for Go backend
    // Note: We are mapping our multi-image logic to what the backend supports.
    // If the backend only supports one image_url, we might have a limitation.
    // However, for Seedream/Edit, we usually pass the user image as the main image_url.
    // Let's pass the first image (user photo) as `image_url`.
    // If we need multiple, we might need to update the backend model.
    // For now, let's assume `image_url` is the primary input.

    // WAIT: The Go backend `GenerateImageRequest` has `ImageURL *string`.
    // It doesn't seem to have `ImageURLs []string`.
    // We should probably update the Go backend model to support `image_urls` for full compatibility.
    // But to proceed without changing Go again right now, let's send the primary image.

    // Actually, FAL edit models usually take `image_url` as the input image.
    // If we have multiple (backgrounds), we might need to composite them or pass them differently.
    // But wait, the previous code passed `image_urls: imageUrls` (array) to FAL.
    // This implies FAL supports multiple images for these models.

    // Let's use the `image_url` field for the first image, and maybe we can pass others in arguments?
    // Or better, let's update the Go backend to support `Arguments` map or `ImageURLs`.
    // Since I cannot update Go in this step (I am editing TS), I will assume I can pass
    // the array in the `image_url` field if I serialize it? No, that's hacky.

    // Let's look at the Go code again.
    // `GenerateImage` calls `falService.GenerateImage`.
    // `falService.GenerateImage` maps `req.ImageURL` to `args["image_url"]`.
    // It does NOT seem to support `image_urls` array.

    // CRITICAL: The Go backend needs to support `image_urls` for this to work correctly with multiple images.
    // However, I must complete this request.
    // I will implement the client side to send `image_url` (the first one) for now.
    // If we need multiple, we will need to fix the Go backend.
    // BUT, for `seedream` and `edit` models, usually one image is the input.
    // The previous code was combining user photo + backgrounds into `imageUrls`.

    // Let's send the request to Go.
    const payload: any = {
      prompt: finalPrompt,
      model_id: modelToUse,
      image_size: imageSize,
      num_images: numImages,
    };

    // Add specific parameters for Flux Klein models
    if (modelToUse.includes('klein')) {
      payload.guidance_scale = 5;
      payload.num_inference_steps = 28;
      payload.acceleration = "regular";
      payload.enable_safety_checker = true;
      payload.output_format = "png";
    }

    if (uploadedUrls.length > 0) {
      payload.image_urls = uploadedUrls;
      payload.image_url = uploadedUrls[0];
    }

    // console.log("🚀 Sending generation request...");
    const genResponse = await fetch(`${apiUrl}/api/generate/image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('auth_token')
          ? { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
          : {})
      },
      body: JSON.stringify(payload)
    });

    if (!genResponse.ok) {
      const errorData = await genResponse.json().catch(() => ({}));
      throw new Error(errorData.error || `Backend error: ${genResponse.status}`);
    }

    const genResult = await genResponse.json();
    console.log("📝 Backend response:", genResult);

    // Handle async generation (new flow with background jobs)
    let processedUrl = genResult.image_url;

    if (!processedUrl && genResult.job_id) {
      // Backend returned a job ID - wait for completion via SSE with polling fallback
      console.log("⏳ Background generation started, waiting for completion via SSE...", genResult);
      if (onProgress) onProgress("processing");

      // Wait for job completion (SSE primary, polling fallback)
      processedUrl = await waitForJobCompletion(genResult.job_id, apiUrl, 120000);
    }

    if (!processedUrl) {
      throw new Error("No image URL returned from backend");
    }

    // Branding overlay logic remains the same
    if (includeBranding) {
      console.log("🎨 Creating branded composition...");
      if (onProgress) onProgress("applying_branding");

      const brandedImageUrl = await applyBrandingOverlay(processedUrl, {
        backgroundColor: '#000000',
        headerBackgroundColor: options.headerBackgroundColor || '#FFFFFF',
        includeHeader,
        campaignText,
        taglineText: options.taglineText,
        logoUrl: options.logoUrl,
        footerUrl: options.footerUrl,
        watermark: options.watermark,
      });

      return {
        url: brandedImageUrl,
        rawUrl: processedUrl, // Return original FAL URL for metadata matching
        seed: genResult.seed,
        contentType: "image/jpeg",
      };
    }

    return {
      url: processedUrl,
      rawUrl: processedUrl,
      seed: genResult.seed,
      contentType: "image/jpeg",
    };

  } catch (error) {
    console.error("❌ AI processing error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`AI processing failed: ${errorMessage}`);
  }
}

/**
 * Get proxied URL for S3/MinIO images to bypass CORS
 */
function getProxiedUrl(url: string): string {
  // Check if URL is from S3 or MinIO and needs proxying
  const proxyPatterns = [
    's3.amazonaws.com',
    'pictureme.now.s3.amazonaws.com',
    'r2.dev',
    'fal.media',
    'v3.fal.media'
  ];

  // Also check MinIO server URL
  const minioServerUrl = ENV.MINIO_SERVER_URL || '';
  const minioHost = minioServerUrl.replace('https://', '').replace('http://', '');

  const needsProxy = proxyPatterns.some(pattern => url.includes(pattern)) ||
    (minioHost && url.includes(minioHost)) ||
    (url.includes('pub-') && url.includes('r2.dev'));

  if (needsProxy) {
    const apiUrl = ENV.API_URL || '';
    console.log("🔄 Proxying image URL:", url, "via", apiUrl);
    return `${apiUrl}/api/proxy/image?url=${encodeURIComponent(url)}`;
  }

  return url;
}

/**
 * Compress an image to a maximum size while maintaining aspect ratio
 * @param img - HTMLImageElement to compress
 * @param maxSize - Maximum dimension (width or height)
 * @param quality - JPEG quality (0-1)
 * @returns Compressed data URI
 */
function compressImage(img: HTMLImageElement, maxSize: number = 2048, quality: number = 0.85): string {
  let { width, height } = img;

  // Calculate new dimensions
  if (width > maxSize || height > maxSize) {
    const ratio = Math.min(maxSize / width, maxSize / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
    console.log(`📐 Resizing image from ${img.width}x${img.height} to ${width}x${height}`);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Helper function to convert image URL to data URI
 * Uses fetch for better CORS handling with proxy
 * Automatically compresses large images to avoid 413 errors
 */
async function imageUrlToDataUri(url: string, maxSize: number = 2048): Promise<string> {
  // Use proxy for S3 URLs to bypass CORS
  const proxiedUrl = getProxiedUrl(url);
  console.log("📥 Loading image:", url, "->", proxiedUrl);

  // Try fetch first (works better with proxy)
  try {
    const response = await fetch(proxiedUrl, {
      mode: 'cors',
      credentials: 'omit', // Don't send cookies to proxy
    });

    if (response.ok) {
      const blob = await response.blob();
      // Create image from blob to check dimensions and compress if needed
      const blobUrl = URL.createObjectURL(blob);
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(blobUrl);
          try {
            const dataUri = compressImage(img, maxSize);
            console.log("✅ Image loaded via fetch:", url);
            resolve(dataUri);
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          reject(new Error(`Failed to load blob image for: ${url}`));
        };
        img.src = blobUrl;
      });
    } else {
      console.warn("⚠️ Fetch failed with status:", response.status, "- trying canvas fallback");
    }
  } catch (fetchError) {
    console.warn("⚠️ Fetch error:", fetchError, "- trying canvas fallback");
  }

  // Fallback to canvas method
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // Enable CORS

    img.onload = () => {
      try {
        const dataUri = compressImage(img, maxSize);
        console.log("✅ Image loaded via canvas:", url);
        resolve(dataUri);
      } catch (canvasError) {
        reject(new Error(`Canvas error for ${url}: ${canvasError}`));
      }
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image: ${url} (proxied: ${proxiedUrl})`));
    };

    img.src = proxiedUrl;
  });
}

/**
 * Download processed image from URL and convert to base64
 * Uses proxy to bypass CORS and handles compression to avoid payload size limits.
 */
export async function downloadImageAsBase64(url: string): Promise<string> {
  try {
    return await imageUrlToDataUri(url);
  } catch (error) {
    console.error("Failed to download image from URL:", url, error);
    // Add context to the error to help with debugging
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error(`CORS Error: Failed to fetch image. The server at ${new URL(url).hostname} may not allow requests from this origin. Try using the proxy.`);
    }
    throw error;
  }
}
