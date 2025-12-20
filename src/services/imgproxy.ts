/**
 * imgproxy URL Generator - Full Implementation
 * 
 * Generates URLs for imgproxy image processing service.
 * Documentation: https://docs.imgproxy.net/
 * 
 * Your imgproxy instance: https://img.pictureme.now/
 */

const IMGPROXY_BASE_URL = 'https://img.pictureme.now';

// Toggle this to enable/disable imgproxy processing globally
const IMGPROXY_ENABLED = true;

// If you have signing enabled in imgproxy, set these keys
const USE_SIGNATURE = false;

// ============== TYPES ==============

export type ResizeType = 'fit' | 'fill' | 'fill-down' | 'force' | 'auto';
export type Gravity = 'no' | 'so' | 'ea' | 'we' | 'noea' | 'nowe' | 'soea' | 'sowe' | 'ce' | 'sm' | 'fp';
export type Format = 'png' | 'jpg' | 'webp' | 'avif' | 'gif' | 'best';

export type QualityTier = 'free' | 'pro' | 'studio' | 'original';

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
        stripColorProfile: true,
        sharpen: 0.3,
    },
    pro: {
        quality: 85,
        format: 'webp',
        stripMetadata: true,
        sharpen: 0.4,
    },
    studio: {
        quality: 92,
        format: 'webp',
        stripMetadata: false,
        keepCopyright: true,
        sharpen: 0.5,
    },
    original: {
        // No compression, just serve optimized format
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
    const base64 = btoa(url);
    // Convert to URL-safe Base64
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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
    if (options.dpr && options.dpr > 1) {
        parts.push(`dpr:${options.dpr}`);
    }

    // Strip metadata
    if (options.stripMetadata) {
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

    // Format (always last before URL)
    if (options.format) {
        parts.push(`format:${options.format}`);
    }

    return parts.join('/');
}

// ============== MAIN URL GENERATOR ==============

/**
 * Generate an imgproxy URL for any source image
 */
export function getImgproxyUrl(sourceUrl: string, options: ImgproxyOptions = {}): string {
    // If imgproxy is disabled, return original URL
    if (!IMGPROXY_ENABLED) {
        return sourceUrl;
    }

    // Don't process data URLs or blob URLs
    if (sourceUrl.startsWith('data:') || sourceUrl.startsWith('blob:')) {
        return sourceUrl;
    }

    // Don't double-process imgproxy URLs
    if (sourceUrl.startsWith(IMGPROXY_BASE_URL)) {
        return sourceUrl;
    }

    // Build the URL
    const processingOptions = buildProcessingOptions(options);
    const encodedUrl = encodeSourceUrl(sourceUrl);

    // URL structure: /{processing}}/{base64_encoded_url}
    const path = processingOptions
        ? `/${processingOptions}/${encodedUrl}`
        : `/${encodedUrl}`;

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
 * Get download URL - always highest quality for the tier
 */
export function getDownloadUrl(sourceUrl: string, tier: QualityTier = 'pro'): string {
    const config = tier === 'original'
        ? { quality: 100, format: 'webp' as Format }
        : { ...TIER_CONFIG[tier], quality: Math.max(TIER_CONFIG[tier].quality || 80, 90) };

    return getImgproxyUrl(sourceUrl, {
        ...config,
        stripMetadata: false, // Keep metadata for downloads
        keepCopyright: true,
    });
}

// ============== CONVENIENCE FUNCTIONS ==============

/**
 * Thumbnail for grids and previews
 */
export function getThumbnailUrl(sourceUrl: string, size: number = 300): string {
    return getImgproxyUrl(sourceUrl, {
        width: size,
        height: size,
        resizeType: 'fill',
        gravity: 'sm', // Smart gravity for best crop
        quality: 80,
        format: 'webp',
        stripMetadata: true,
        stripColorProfile: true,
        sharpen: 0.3,
    });
}

/**
 * Feed/gallery images (medium quality, fast loading)
 */
export function getFeedImageUrl(sourceUrl: string, width: number = 600): string {
    return getImgproxyUrl(sourceUrl, {
        width,
        resizeType: 'fit',
        quality: 82,
        format: 'webp',
        stripMetadata: true,
        sharpen: 0.4,
    });
}

/**
 * Full-resolution optimized images (for detail views)
 */
export function getOptimizedUrl(sourceUrl: string, maxWidth: number = 1920): string {
    return getImgproxyUrl(sourceUrl, {
        width: maxWidth,
        resizeType: 'fit',
        quality: 90,
        format: 'webp',
        stripMetadata: true,
        sharpen: 0.5,
    });
}

/**
 * Avatar/profile images (small, square, smart crop)
 */
export function getAvatarUrl(sourceUrl: string, size: number = 100): string {
    return getImgproxyUrl(sourceUrl, {
        width: size,
        height: size,
        resizeType: 'fill',
        gravity: 'sm',
        quality: 85,
        format: 'webp',
        stripMetadata: true,
        stripColorProfile: true,
    });
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
    return getImgproxyUrl(sourceUrl, {
        width,
        resizeType: 'fit',
        quality: 88,
        format: 'webp',
        stripMetadata: true,
        sharpen: 0.4,
    });
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
