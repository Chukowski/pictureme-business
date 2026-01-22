import { applyBrandingOverlay } from "./imageOverlay";
import { ENV } from "../config/env";
import { resolveModelId, DEFAULT_FAL_MODEL, getImageDimensions, getFluxOptimizedDimensions, getFluxImageSize, ProcessImageResult, chargeTokensForGeneration } from "./aiProcessor";
import { getProcessingUrl } from "./cdn";
import type { JobUpdateData } from "../hooks/useSSE";

/**
 * Wait for a generation job to complete using SSE events with polling fallback.
 * This eliminates aggressive polling while maintaining reliability.
 * 
 * @param jobId - The job ID to wait for
 * @param apiUrl - The API base URL
 * @param timeoutMs - Maximum time to wait in milliseconds (default: 120000 = 2 minutes)
 * @returns The completed image URL
 * @throws Error if job fails or times out
 */
/**
 * Wait for a generation job to complete using SSE events with polling fallback.
 * This eliminates aggressive polling while maintaining reliability.
 * 
 * @param jobId - The job ID to wait for
 * @param apiUrl - The API base URL
 * @param expectedImages - Number of images expected (for multi-image gen)
 * @param timeoutMs - Maximum time to wait in milliseconds (default: 120000 = 2 minutes)
 * @returns The completed image URLs
 * @throws Error if job fails or times out
 */
async function waitForJobCompletion(
    jobId: number,
    apiUrl: string,
    expectedImages = 1,
    timeoutMs = 120000
): Promise<{ url: string, urls: string[] }> {
    return new Promise((resolve, reject) => {
        let resolved = false;
        let pollInterval: NodeJS.Timeout | null = null;
        const results: string[] = [];

        // Cleanup function
        const cleanup = () => {
            if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
            }
            window.removeEventListener('job-updated', handleJobUpdate as EventListener);
        };

        // Handle SSE job update events
        const handleJobUpdate = (event: CustomEvent<JobUpdateData>) => {
            if (resolved) return;
            const data = event.detail;

            if (data.job_id === jobId) {
                if (data.status === 'completed' && data.url) {
                    console.log(`✅ [CreatorAI] Received image ${results.length + 1}/${expectedImages} via SSE:`, jobId);

                    if (!results.includes(data.url)) {
                        results.push(data.url);
                    }

                    // If we have all expected images
                    if (results.length >= expectedImages) {
                        resolved = true;
                        cleanup();
                        resolve({ url: results[0], urls: results });
                    }
                } else if (data.status === 'failed') {
                    console.error('❌ [CreatorAI] Job failed via SSE:', data.error);
                    resolved = true;
                    cleanup();
                    reject(new Error(data.error || 'Generation failed'));
                }
            }
        };

        // Listen for SSE job update events
        window.addEventListener('job-updated', handleJobUpdate as EventListener);

        // Set up polling as fallback
        const pollForStatus = async () => {
            if (resolved) return;

            try {
                const authToken = localStorage.getItem('auth_token');
                const statusRes = await fetch(`${apiUrl}/api/generate/status/${jobId}`, {
                    headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
                });

                if (statusRes.ok) {
                    const statusData = await statusRes.json();
                    if (statusData.status === 'completed' && (statusData.url || (statusData.urls && statusData.urls.length > 0))) {
                        console.log(`✅ [CreatorAI] Job completed via polling fallback: ${jobId} (${statusData.urls?.length || 1} images)`);

                        const fallbackUrls = statusData.urls || [statusData.url];

                        resolved = true;
                        cleanup();
                        resolve({ url: statusData.url || fallbackUrls[0], urls: fallbackUrls });
                    } else if (statusData.status === 'failed') {
                        console.error('❌ [CreatorAI] Job failed via polling:', statusData.error);
                        resolved = true;
                        cleanup();
                        reject(new Error(statusData.error || 'Generation failed'));
                    }
                }
            } catch (e) {
                console.warn('[CreatorAI] Poll error (will retry):', e);
            }
        };

        pollInterval = setInterval(pollForStatus, 3000);
        pollForStatus();

        // Set timeout safeguard
        setTimeout(() => {
            if (!resolved) {
                if (results.length > 0) {
                    // If we have some images but not all, resolve with what we have
                    console.warn(`⏳ [CreatorAI] Timeout: resolving with ${results.length}/${expectedImages} images`);
                    resolved = true;
                    cleanup();
                    resolve({ url: results[0], urls: results });
                } else {
                    console.error('❌ [CreatorAI] Job timed out:', jobId);
                    cleanup();
                    reject(new Error('Generation timed out - check pending jobs later'));
                }
            }
        }, timeoutMs);
    });
}


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
    numImages?: number;
    resolution?: string;
    skipWait?: boolean;

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
 * Uses direct fetch for R2 URLs (no imgproxy needed)
 */
async function imageUrlToDataUri(url: string): Promise<string> {
    // If already base64, compress it and return
    if (url.startsWith("data:")) {
        return compressImage(url);
    }

    // Convert URL to public R2 format if needed
    const publicUrl = getProcessingUrl(url);

    try {
        // Try direct fetch first
        console.log("📥 Loading image:", publicUrl);
        const response = await fetch(publicUrl, { mode: 'cors' });
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`);
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                compressImage(reader.result as string).then(resolve).catch(reject);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.warn("⚠️ Direct fetch failed, trying proxy...", error);

        // Use our API proxy to bypass CORS for external images
        const apiUrl = ENV.API_URL;
        const safeApiUrl = (apiUrl.startsWith('http://') && !apiUrl.includes('localhost'))
            ? apiUrl.replace('http://', 'https://')
            : apiUrl;

        const proxyUrl = `${safeApiUrl}/api/proxy/image?url=${encodeURIComponent(url)}`;

        console.log("🔄 Fetching via proxy:", proxyUrl);

        try {
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`Proxy fetch failed: ${response.status}`);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    compressImage(reader.result as string).then(resolve).catch(reject);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (proxyError) {
            console.error("❌ All image fetch methods failed:", url, proxyError);
            throw proxyError;
        }
    }
}

/**
 * Check if a URL is already hosted on our platform (R2 or fal.ai)
 */
function isInternalUrl(url: string): boolean {
    if (!url) return false;
    const internalDomains = [
        "r2.dev",
        "r2.pictureme.now",
        "v3b.fal.media",
        "fal.media"
    ];

    // Also check local MinIO if configured
    const apiUrl = ENV.API_URL || "";
    if (apiUrl) {
        const domain = apiUrl.replace(/^https?:\/\//, "").split("/")[0];
        if (domain) internalDomains.push(domain);
    }

    const urlLower = url.toLowerCase();
    return internalDomains.some(domain => urlLower.includes(domain.toLowerCase()));
}

/**
 * Helper to ensure we have a usable URL for the backend.
 * If already internal, return as-is.
 * If base64/remote, upload to our temp storage.
 */
async function ensureBackendUrl(input: string, apiUrl: string): Promise<string> {
    if (isInternalUrl(input)) {
        console.log("♻️ [CreatorAI] Using existing internal URL:", input.substring(0, 50) + "...");
        return input;
    }

    // Convert base64 or external URL to DataURI (with compression)
    const dataUri = await imageUrlToDataUri(input);

    // Upload to our temp storage
    const blob = await (await fetch(dataUri)).blob();
    const formData = new FormData();
    formData.append('file', blob, 'image.jpg');

    const uploadRes = await fetch(`${apiUrl}/api/generate/upload`, {
        method: 'POST',
        body: formData,
        headers: {
            ...(localStorage.getItem('auth_token')
                ? { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
                : {})
        }
    });

    if (!uploadRes.ok) throw new Error('Failed to upload image asset');
    const data = await uploadRes.json();
    return data.url;
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
        isPublic = true,
        numImages = 1,
        resolution,
    } = options;

    if (!backgroundPrompt?.trim()) {
        throw new Error("Prompt is required.");
    }

    // console.log("🤖 Model requested:", aiModel || "(default)"); // Hidden for privacy

    console.log("🎨 [CreatorAI] Processing started", { aiModel, isPublic });
    console.log("📝 Prompt:", backgroundPrompt.substring(0, 50) + "...");

    try {
        // 1. Prepare Backend-Ready URLs
        const rawApiUrl = ENV.API_URL || "http://localhost:3002";
        const apiUrl = (rawApiUrl.startsWith('http://') && !rawApiUrl.includes('localhost'))
            ? rawApiUrl.replace('http://', 'https://')
            : rawApiUrl;

        console.log("📤 [CreatorAI] Preparing assets...");
        const uploadedUrls: string[] = [];

        // Primary Input - Only prepare if provided
        if (userPhotoBase64) {
            const mainUrl = await ensureBackendUrl(userPhotoBase64, apiUrl);
            uploadedUrls.push(mainUrl);
        }

        // Reference Images / Backgrounds
        const bgImages = backgroundImageUrls || (backgroundImageUrl ? [backgroundImageUrl] : []);
        for (const bgUrl of bgImages) {
            const resolvedBgUrl = await ensureBackendUrl(bgUrl, apiUrl);
            uploadedUrls.push(resolvedBgUrl);
        }

        // 3. Resolve Model ID and handle auto-switching for T2I
        let modelToUse = resolveModelId(aiModel);

        // Auto-switch to Text-to-Image version if no user photo is provided
        // This makes it seamless for the user
        if (!userPhotoBase64 && modelToUse === 'fal-ai/flux-2/klein/9b/base/edit/lora') {
            modelToUse = 'fal-ai/flux-2/klein/9b/base/lora';
            console.log("📝 No user photo provided, switching to Text-to-Image model (T2I)");
        }
        if (!userPhotoBase64 && modelToUse === 'fal-ai/bytedance/seedream/v4.5/edit') {
            modelToUse = 'seedream-v4.5-t2i';
            console.log("📝 No user photo provided, switching to Seedream T2I");
        }
        if (!userPhotoBase64 && modelToUse === 'fal-ai/nano-banana/edit') {
            modelToUse = 'fal-ai/nano-banana';
            console.log("📝 No user photo provided, switching to Nano Banana T2I");
        }
        if (!userPhotoBase64 && modelToUse === 'fal-ai/nano-banana-pro/edit') {
            modelToUse = 'fal-ai/nano-banana-pro';
            console.log("📝 No user photo provided, switching to Nano Banana Pro T2I");
        }

        // 4. Prepare Generation Strategy
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

        // 5. Send Generation Request
        const isT2I = !userPhotoBase64;

        const payload: any = {
            prompt: finalPrompt,
            model_id: modelToUse,
            image_size: imageSize,
            resolution: resolution, // Pass resolution explicitly if provided
            num_images: numImages,
            visibility: isPublic ? 'public' : 'private',
            billing_context: 'personal',
            parent_id: options.parent_id
        };

        // Only add image inputs if we are NOT in T2I mode OR if the model specifically supports them
        // For most T2I models, sending image_urls might cause an error
        if (!isT2I) {
            payload.image_urls = uploadedUrls;
            payload.image_url = uploadedUrls[0];
        }

        console.log("🚀 [CreatorAI] Sending request:", {
            model: payload.model_id,
            isT2I,
            images: uploadedUrls.length,
            visibility: payload.visibility
        });

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
        let finalUrls: string[] = [];

        if (!processedUrl && genResult.job_id) {
            if (options.skipWait) {
                console.log("⏩ [CreatorAI] skipWait: true. Returning job_id:", genResult.job_id);
                return {
                    url: '',
                    urls: [],
                    jobId: genResult.job_id,
                    status: 'processing'
                };
            }

            console.log("⏳ [CreatorAI] Waiting for job:", genResult.job_id);
            if (onProgress) onProgress("processing");

            // Wait for job completion via SSE or polling fallback
            const results = await waitForJobCompletion(genResult.job_id, apiUrl, numImages, 120000);
            processedUrl = results.url;
            finalUrls = results.urls;
        } else if (processedUrl) {
            finalUrls = [processedUrl];
        }

        if (!processedUrl && !options.skipWait) throw new Error("No image URL returned");

        // 7. Apply Branding (Optional for creators, usually disabled)
        // If creators want watermarks, they turn it on.
        if (options.includeBranding && options.watermark) {
            if (onProgress) onProgress("applying_branding");
            const brandedUrl = await applyBrandingOverlay(processedUrl, {
                watermark: options.watermark
            });
            return {
                url: brandedUrl,
                urls: finalUrls,
                rawUrl: processedUrl,
                seed: genResult.seed,
                contentType: "image/jpeg"
            };
        }

        return {
            url: processedUrl,
            urls: finalUrls,
            rawUrl: processedUrl,
            seed: genResult.seed,
            contentType: "image/jpeg"
        };

    } catch (error) {
        console.error("❌ [CreatorAI] Error:", error);
        throw error;
    }
}
