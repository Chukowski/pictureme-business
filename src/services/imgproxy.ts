/**
 * imgproxy URL Generator - Full Implementation
 * 
 * Generates URLs for imgproxy image processing service.
 * Documentation: https://docs.imgproxy.net/
 * 
 * Your imgproxy instance: https://img.pictureme.now/
 */

import { ENV } from '@/config/env';

const IMGPROXY_BASE_URL = 'https://img.pictureme.now';

// Toggle this to enable/disable imgproxy processing globally
const IMGPROXY_ENABLED = true;

// If you have signing enabled in imgproxy, set these keys
const USE_SIGNATURE = false;

// ============== TYPES ==============

export type ResizeType = 'fit' | 'fill' | 'fill-down' | 'force' | 'auto';
export type Gravity = 'no' | 'so' | 'ea' | 'we' | 'noea' | 'nowe' | 'soea' | 'sowe' | 'ce' | 'sm' | 'fp';
export type Format = 'png' | 'jpg' | 'webp' | 'avif' | 'gif' | 'best';
export type Preset = 'feed' | 'thumbnail' | 'view' | 'free_download' | 'spark_download' | 'vibe_download' | 'studio_download' | 'watermark';

export type QualityTier = 'free' | 'spark' | 'vibe' | 'studio' | 'business' | 'original';

export interface ImgproxyOptions {
    // Resize options
    width?: number;
    height?: number;
    resizeType?: ResizeType;
    enlarge?: boolean;  // Don't upscale small images
    extend?: boolean;

    // Quality and format
    quality?: number; // 1-100
    format?: Format;
    maxBytes?: number; // Auto-degrade quality to meet size limit

    // Cropping
    gravity?: Gravity;

    // Effects
    blur?: number; // Gaussian blur sigma
    sharpen?: number; // Sharpen sigma (0.5-1 recommended after resize)

    // Background (for transparent images)
    background?: string; // Hex color without #, e.g., 'ffffff'

    // Device pixel ratio (for retina displays)
    dpr?: number;

    // Metadata handling
    stripMetadata?: boolean;
    stripColorProfile?: boolean;
    keepCopyright?: boolean;

    // Preset
    preset?: Preset;
}

// ============== TIER CONFIGURATIONS ==============

/**
 * Quality configurations by user tier
 * Free users get compressed images, Pro/Studio get higher quality
 */
export const TIER_CONFIG: Record<QualityTier, Partial<ImgproxyOptions>> = {
    free: {
        quality: 75,
        format: 'webp',
        stripMetadata: true,
        sharpen: 0.3,
    },
    spark: {
        quality: 85,
        format: 'webp',
        stripMetadata: true,
        sharpen: 0.4,
    },
    vibe: {
        quality: 90,
        format: 'webp',
        stripMetadata: false,
        sharpen: 0.5,
    },
    studio: { // El tier "Pro" real
        quality: 95, // Visualización muy alta calidad
        format: 'webp',
        stripMetadata: false,
        sharpen: 0.5,
    },
    business: { // Igual que Studio para visualización
        quality: 95,
        format: 'webp',
        stripMetadata: false,
        sharpen: 0.5,
    },
    original: {
        quality: 100,
        format: 'webp',
        stripMetadata: false,
    }
};

// ============== URL ENCODING ==============

/**
 * Encode the source URL in Base64 (URL-safe variant)
 */
function encodeSourceUrl(url: string): string {
    if (!url) return '';
    try {
        // Standard Base64 can fail with non-Latin1 characters, 
        // but source URLs should be properly escaped already.
        // We use the simpler btoa as recommended in the setup guide
        // to avoid double-encoding characters like ':' and '/'.
        const base64 = btoa(url);
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (e) {
        // If there are non-Latin1 characters, we still need to handle them
        // but without breaking the URL structure.
        try {
            const base64 = btoa(unescape(encodeURIComponent(url).replace(/%([0-9A-F]{2})/g, (match, p1) => {
                // Keep ASCII characters literal for btoa
                return String.fromCharCode(parseInt(p1, 16));
            })));
            return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        } catch (err) {
            return '';
        }
    }
}

// ============== PROCESSING OPTIONS BUILDER ==============

/**
 * Build the processing options string following imgproxy URL format
 * Format: rs:type:w:h:enlarge:extend/g:gravity/q:quality/sm:t/format:webp/...
 */
function buildProcessingOptions(options: ImgproxyOptions): string {
    const parts: string[] = [];

    // Resize: rs:type:width:height:enlarge:extend
    if (options.width || options.height) {
        const resizeType = options.resizeType || 'fit';
        const w = options.width || 0;
        const h = options.height || 0;
        const enlarge = options.enlarge ? 1 : 0;
        const extend = options.extend ? 1 : 0;
        parts.push(`rs:${resizeType}:${w}:${h}:${enlarge}:${extend}`);
    }

    // Gravity
    if (options.gravity) {
        parts.push(`g:${options.gravity}`);
    }

    // Quality
    if (options.quality) {
        parts.push(`q:${options.quality}`);
    }

    // Max bytes (auto quality degradation)
    if (options.maxBytes) {
        parts.push(`mb:${options.maxBytes}`);
    }

    // DPR (Device Pixel Ratio)
    const dpr = options.dpr || (typeof window !== 'undefined' ? window.devicePixelRatio : 1);
    if (dpr > 1) {
        parts.push(`dpr:${Math.min(dpr, 3).toFixed(1)}`);
    }

    // Strip metadata
    if (options.stripMetadata !== false) { // Default to true for performance
        parts.push('sm:t');
    }

    // Strip color profile
    if (options.stripColorProfile) {
        parts.push('scp:t');
    }

    // Keep copyright
    if (options.keepCopyright) {
        parts.push('kcr:t');
    }

    // Blur
    if (options.blur) {
        parts.push(`bl:${options.blur}`);
    }

    // Sharpen
    if (options.sharpen) {
        parts.push(`sh:${options.sharpen}`);
    }

    // Background color
    if (options.background) {
        parts.push(`bg:${options.background}`);
    }

    // Format negotiation: Prefer AVIF > WebP > Auto
    // If format is not specified, we use 'best' or 'webp'
    const format = options.format || 'webp';
    parts.push(`format:${format}`);

    return parts.join('/');
}

// ============== MAIN URL GENERATOR ==============

/**
 * Generate an imgproxy URL for any source image
 */
export function getImgproxyUrl(sourceUrl: string, options: ImgproxyOptions = {}): string {
    // If imgproxy is disabled or no URL, return original URL
    if (!IMGPROXY_ENABLED || !sourceUrl) {
        return sourceUrl;
    }

    // Don't process data URLs or blob URLs
    if (sourceUrl.startsWith('data:') || sourceUrl.startsWith('blob:')) {
        return sourceUrl;
    }

    // If it's already an imgproxy URL from our instance, don't double process
    if (sourceUrl.startsWith(IMGPROXY_BASE_URL)) {
        // Only return if it already has a preset or complex options
        if (sourceUrl.includes('/preset:') || sourceUrl.includes('/insecure/')) {
            return sourceUrl;
        }
    }

    // Build the URL
    const processingOptions = buildProcessingOptions(options);
    const encodedUrl = encodeSourceUrl(sourceUrl);
    if (!encodedUrl) return sourceUrl;

    // Use /insecure/ for development, in production this should be signed
    const prefix = "/insecure";

    let path = "";
    if (options.preset) {
        path = `/preset:${options.preset}/${encodedUrl}`;
    } else {
        path = processingOptions
            ? `${prefix}/${processingOptions}/${encodedUrl}`
            : `${prefix}/${encodedUrl}`;
    }

    return `${IMGPROXY_BASE_URL}${path}`;
}

// ============== TIER-BASED FUNCTIONS ==============

/**
 * Get image URL with tier-based quality settings
 */
export function getImageByTier(
    sourceUrl: string,
    tier: QualityTier = 'free',
    additionalOptions: Partial<ImgproxyOptions> = {}
): string {
    const tierConfig = TIER_CONFIG[tier];
    return getImgproxyUrl(sourceUrl, { ...tierConfig, ...additionalOptions });
}

/**
 * Get download URL - always highest quality for the tier using presets
 */
export function getDownloadUrl(sourceUrl: string, tier: QualityTier = 'free'): string {
    // Si piden explícitamente original, damos la vista de máxima calidad
    if (tier === 'original') {
        return getImgproxyUrl(sourceUrl, { preset: 'view' });
    }

    const presetMap: Record<string, Preset> = {
        'free': 'free_download',      // 1024px, q70
        'spark': 'spark_download',    // 2048px, q90
        'vibe': 'vibe_download',      // 4096px, q95

        // Studio y Business usan el mismo preset de máxima calidad
        'studio': 'studio_download',  // 4096px, q100 (Full Res)
        'business': 'studio_download' // 4096px, q100 (Full Res)
    };

    // Fallback seguro: Si el tier no existe, damos calidad Spark (media/alta)
    const preset = presetMap[tier] || 'spark_download';

    return getImgproxyUrl(sourceUrl, { preset });
}

/**
 * Get a URL that proxies through the backend to bypass CORS and force download.
 * Usage: getProxyDownloadUrl(getDownloadUrl(item.url, userTier), "my-image.webp")
 */
export function getProxyDownloadUrl(targetUrl: string, fileName: string): string {
    // Use the centralized ENV.API_URL which already handles HTTPS enforcement and domain overrides
    const apiUrl = ENV.API_URL;

    // Ensure we have a valid URL, otherwise fallback to a safe derivation
    const finalApiUrl = apiUrl || (window.location.hostname.includes('localhost')
        ? 'http://localhost:3002'
        : `https://go.pictureme.now`);

    return `${finalApiUrl}/api/proxy/image?url=${encodeURIComponent(targetUrl)}&download=${encodeURIComponent(fileName)}`;
}

// ============== CONVENIENCE FUNCTIONS ==============

/**
 * Thumbnail for grids and previews
 */
export function getThumbnailUrl(sourceUrl: string, size: number = 300): string {
    // We prefer presets for performance and Cloudflare compatibility
    if (size <= 300) {
        return getImgproxyUrl(sourceUrl, { preset: 'thumbnail' });
    }
    if (size <= 600) {
        return getImgproxyUrl(sourceUrl, { preset: 'feed' });
    }

    return getImgproxyUrl(sourceUrl, { preset: 'view' });
}

/**
 * Feed/gallery images (medium quality, fast loading)
 */
export function getFeedImageUrl(sourceUrl: string, width: number = 600): string {
    if (width <= 600) {
        return getImgproxyUrl(sourceUrl, { preset: 'feed' });
    }
    return getImgproxyUrl(sourceUrl, { preset: 'view' });
}

/**
 * Full-resolution optimized images (for detail views)
 */
export function getOptimizedUrl(sourceUrl: string, maxWidth: number = 1920): string {
    return getImgproxyUrl(sourceUrl, { preset: 'view' });
}

/**
 * Avatar/profile images (small, square, smart crop)
 */
export function getAvatarUrl(sourceUrl: string, size: number = 100): string {
    return getImgproxyUrl(sourceUrl, { preset: 'thumbnail' });
}

/**
 * Blurred placeholder (LQIP - Low Quality Image Placeholder)
 */
export function getPlaceholderUrl(sourceUrl: string): string {
    return getImgproxyUrl(sourceUrl, {
        width: 40,
        resizeType: 'fit',
        quality: 30,
        blur: 5,
        format: 'webp',
        stripMetadata: true,
        stripColorProfile: true,
    });
}

/**
 * Cover/banner images (wide, high quality)
 */
export function getCoverUrl(sourceUrl: string, width: number = 1400): string {
    return getImgproxyUrl(sourceUrl, { preset: 'view' });
}

/**
 * For remix/AI processing - optimized for upload (compressed but high enough quality)
 */
export function getProcessingUrl(sourceUrl: string, maxDimension: number = 2048): string {
    return getImgproxyUrl(sourceUrl, {
        width: maxDimension,
        height: maxDimension,
        resizeType: 'fit',
        enlarge: false,
        quality: 88,
        format: 'webp',
        stripMetadata: true,
        stripColorProfile: true,
    });
}

/**
 * For immersive/background use (lower quality, for blur backgrounds)
 */
export function getBackgroundUrl(sourceUrl: string): string {
    return getImgproxyUrl(sourceUrl, {
        width: 1200,
        resizeType: 'fit',
        quality: 60,
        blur: 20,
        format: 'webp',
        stripMetadata: true,
    });
}

/**
 * Video thumbnail extraction (if imgproxy Pro is available)
 * Falls back to original URL if not supported
 */
export function getVideoThumbnailUrl(videoUrl: string, second: number = 1): string {
    // For now, return original - would need Pro features
    return videoUrl;
}
