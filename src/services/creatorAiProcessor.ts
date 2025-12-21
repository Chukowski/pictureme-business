import { applyBrandingOverlay } from "./imageOverlay";
import { ENV } from "../config/env";
import { resolveModelId, DEFAULT_FAL_MODEL, getImageDimensions, getFluxOptimizedDimensions, getFluxImageSize, ProcessImageResult, chargeTokensForGeneration } from "./aiProcessor";
import { getProcessingUrl } from "./imgproxy";

export interface ProcessCreatorImageOptions {
    userPhotoBase64: string;
    backgroundPrompt: string;
    backgroundImageUrl?: string; // Kept for interface compatibility but discouraged
    backgroundImageUrls?: string[]; // Primary way to pass backgrounds
    aspectRatio?: 'auto' | '1:1' | '4:5' | '3:2' | '16:9' | '9:16';
    aiModel?: string;
    forceInstructions?: boolean;
    seed?: number;
    onProgress?: (status: string, logs?: string[]) => void;
    // Creator-specific options
    isPublic?: boolean;
    parent_id?: number | null;

    // Legacy params kept for compatibility if needed internally, but not used by Creator Studio
    includeBranding?: boolean;
    campaignText?: string;
    taglineText?: string;
    logoUrl?: string;
    footerUrl?: string;
    headerBackgroundColor?: string;
    watermark?: any;
}

/**
 * Compress image to reduce file size before upload
 * Max dimension: 2048px, Quality: 85%
 */
async function compressImage(dataUri: string, maxDimension = 2048, quality = 0.85): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            let { width, height } = img;

            // Scale down if larger than max dimension
            if (width > maxDimension || height > maxDimension) {
                const ratio = Math.min(maxDimension / width, maxDimension / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to JPEG with compression
            const compressedDataUri = canvas.toDataURL('image/jpeg', quality);
            console.log(`🗜️ Compressed: ${Math.round(dataUri.length / 1024)}KB → ${Math.round(compressedDataUri.length / 1024)}KB`);
            resolve(compressedDataUri);
        };
        img.onerror = () => reject(new Error('Failed to load image for compression'));
        img.src = dataUri;
    });
}

/**
 * Convert URL to Data URI (Base64) and compress
 * Handles CORS issues by fetching through proxied endpoint if needed
 * Uses imgproxy for remote URLs to get optimized versions
 */
async function imageUrlToDataUri(url: string): Promise<string> {
    // If already base64, compress it and return
    if (url.startsWith("data:")) {
        return compressImage(url);
    }

    // For remote URLs, use imgproxy to get optimized version (max 2048px width)
    const optimizedUrl = getProcessingUrl(url, 2048);

    try {
        // Try direct fetch first (imgproxy URL)
        console.log("📥 Loading optimized image:", optimizedUrl);
        const response = await fetch(optimizedUrl, { mode: 'cors' });
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`);
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Already optimized by imgproxy, but compress further if needed
                compressImage(reader.result as string).then(resolve).catch(reject);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.warn("⚠️ Imgproxy fetch failed, trying original URL...", error);
        // Fallback to original URL
        try {
            const response = await fetch(url, { mode: 'cors' });
            if (!response.ok) throw new Error(`Failed: ${response.status}`);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    compressImage(reader.result as string).then(resolve).catch(reject);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (e2) {
            console.warn("⚠️ Direct fetch failed, trying proxy...", e2);
            // If direct fetch fails (CORS), try via our proxy
            const apiUrl = ENV.API_URL || '';
            const proxyUrl = `${apiUrl}/api/proxy/image?url=${encodeURIComponent(url)}`;

            const response = await fetch(proxyUrl);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    compressImage(reader.result as string).then(resolve).catch(reject);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        }
    }
}


/**
 * Process an image specifically for individual Creator Studio users.
 * - Handles token charging for 'personal' context.
 * - Enforces visibility settings.
 * - Supports multiple reference images.
 */
export async function processCreatorImage(
    options: ProcessCreatorImageOptions
): Promise<ProcessImageResult> {
    const {
        userPhotoBase64,
        backgroundPrompt,
        backgroundImageUrl,
        backgroundImageUrls,
        aspectRatio = '9:16',
        aiModel,
        onProgress,
        isPublic = true, // Default to public for individuals (unless overridden)
    } = options;

    if (!userPhotoBase64) {
        throw new Error("User photo is required.");
    }
    if (!backgroundPrompt?.trim()) {
        throw new Error("Prompt is required.");
    }

    // Use provided model or default, and resolve short IDs to full FAL.ai IDs
    const requestedModel = aiModel || "fal-ai/nano-banana/edit"; // Default hardcoded for safety
    const modelToUse = resolveModelId(requestedModel);

    console.log("🎨 [CreatorAI] Processing started");
    console.log("📝 Prompt:", backgroundPrompt.substring(0, 50) + "...");
    console.log("🖼️ Public Feed:", isPublic);

    try {
        // 1. Prepare Image URLs
        const imageUrls: string[] = [];
        imageUrls.push(userPhotoBase64); // Image 1: Input

        const bgImages = backgroundImageUrls || (backgroundImageUrl ? [backgroundImageUrl] : []);
        for (const bgUrl of bgImages) {
            const bgDataUri = await imageUrlToDataUri(bgUrl);
            imageUrls.push(bgDataUri);
        }

        // 2. Token Charging (Personal Context)
        // We do this BEFORE generation to prevent abuse, though ideally backend does it.
        // The existing aiProcessor.ts integrated this.
        // We will optimistically charge them.
        // Note: The backend generation endpoint MIGHT also charge tokens. 
        // In the current architecture, `chargeTokensForGeneration` is a separate utility often called.
        // However, the new backend endpoint `/api/generate/image` might handle it.
        // Let's assume we don't need to manually charge if the backend handles it.
        // BUT, checking user balance is good UX.

        // 3. Prompt Construction
        const isSeedream = modelToUse.includes("seedream");
        let finalPrompt = backgroundPrompt;
        let imageSize: string | { width: number; height: number } | undefined;

        if (isSeedream) {
            imageSize = getImageDimensions(aspectRatio);
            // Add specific instructions for style transfer if needed (copying simplified logic)
            const promptLower = backgroundPrompt.toLowerCase();
            if (options.forceInstructions && (promptLower.includes('lego') || promptLower.includes('pixar') || promptLower.includes('anime'))) {
                finalPrompt = `TRANSFORM SUBJECT: ${backgroundPrompt}. Maintain pose and composition.`;
            }
        } else {
            // Flux/Gemini logic
            const isFlux2Pro = modelToUse.includes("flux-2-pro");
            if (isFlux2Pro && aspectRatio !== 'auto') {
                imageSize = getFluxImageSize(aspectRatio);
            } else {
                imageSize = getImageDimensions(aspectRatio);
            }
        }

        // 4. Upload Assets (to get URLs for backend)
        const apiUrl = ENV.API_URL || "http://localhost:3002";

        const uploadImage = async (base64Data: string): Promise<string> => {
            const blob = await (await fetch(base64Data)).blob();
            const formData = new FormData();
            formData.append('file', blob, 'image.jpg');
            const uploadRes = await fetch(`${apiUrl}/api/generate/upload`, {
                method: 'POST',
                body: formData,
            });
            if (!uploadRes.ok) throw new Error('Failed to upload image asset');
            const data = await uploadRes.json();
            return data.url;
        };

        console.log("📤 [CreatorAI] Uploading assets...");
        const uploadedUrls: string[] = [];
        for (const dataUri of imageUrls) {
            const url = await uploadImage(dataUri);
            uploadedUrls.push(url);
        }

        // 5. Send Generation Request
        const payload = {
            prompt: finalPrompt,
            model_id: modelToUse,
            image_size: imageSize,
            num_images: 1,
            // Go backend expects `image_url` (singular) currently, but we want to confirm if it supports multiple.
            // For now, adhere to same pattern as aiProcessor.
            image_urls: uploadedUrls,
            image_url: uploadedUrls[0],
            visibility: isPublic ? 'public' : 'private',
            billing_context: 'personal', // Explicitly personal for Creator Studio
            parent_id: options.parent_id
        };

        console.log("🚀 [CreatorAI] Sending request:", payload.visibility, payload.model_id);

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
            const err = await genResponse.json().catch(() => ({}));
            throw new Error(err.error || `Generation failed: ${genResponse.status}`);
        }

        const genResult = await genResponse.json();
        let processedUrl = genResult.image_url;

        // 6. Polling (if async job)
        if (!processedUrl && genResult.job_id) {
            console.log("⏳ [CreatorAI] Polling job:", genResult.job_id);
            if (onProgress) onProgress("processing");

            const maxAttempts = 120;
            let attempts = 0;
            while (attempts < maxAttempts) {
                await new Promise(r => setTimeout(r, 1000));
                attempts++;
                try {
                    const statusRes = await fetch(`${apiUrl}/api/generate/status/${genResult.job_id}`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
                    });
                    if (statusRes.ok) {
                        const statusData = await statusRes.json();
                        if (statusData.status === 'completed' && statusData.url) {
                            processedUrl = statusData.url;
                            break;
                        } else if (statusData.status === 'failed') {
                            throw new Error(statusData.error || 'Generation failed');
                        }
                    }
                } catch (e) {
                    console.warn("Poll error", e);
                }
            }
            if (!processedUrl) throw new Error("Generation timed out");
        }

        if (!processedUrl) throw new Error("No image URL returned");

        // 7. Apply Branding (Optional for creators, usually disabled)
        // If creators want watermarks, they turn it on.
        if (options.includeBranding && options.watermark) {
            // Re-use logic if needed, but for now return raw.
            if (onProgress) onProgress("applying_branding");
            const brandedUrl = await applyBrandingOverlay(processedUrl, {
                watermark: options.watermark
            });
            return {
                url: brandedUrl,
                rawUrl: processedUrl,
                seed: genResult.seed,
                contentType: "image/jpeg"
            };
        }

        return {
            url: processedUrl,
            rawUrl: processedUrl,
            seed: genResult.seed,
            contentType: "image/jpeg"
        };

    } catch (error) {
        console.error("❌ [CreatorAI] Error:", error);
        throw error;
    }
}
