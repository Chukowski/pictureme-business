/**
 * imgproxy URL Generator
 * 
 * Generates URLs for imgproxy image processing service.
 * Documentation: https://docs.imgproxy.net/
 * 
 * Your imgproxy instance: https://img.pictureme.now/
 */

const IMGPROXY_BASE_URL = 'https://img.pictureme.now';

// Toggle this to enable/disable imgproxy processing
// Set to false until imgproxy server is properly configured
const IMGPROXY_ENABLED = false;

// If you have signing enabled in imgproxy, set these keys
// For now, we use 'insecure' mode (signature = "insecure")
const USE_SIGNATURE = false;

export type ResizeType = 'fit' | 'fill' | 'fill-down' | 'force' | 'auto';
export type Gravity = 'no' | 'so' | 'ea' | 'we' | 'noea' | 'nowe' | 'soea' | 'sowe' | 'ce' | 'sm';
export type Format = 'png' | 'jpg' | 'webp' | 'avif' | 'gif';

export interface ImgproxyOptions {
    // Resize options
    width?: number;
    height?: number;
    resizeType?: ResizeType;
    enlarge?: boolean;
    extend?: boolean;

    // Quality and format
    quality?: number; // 1-100
    format?: Format;

    // Cropping
    gravity?: Gravity;

    // Effects
    blur?: number; // Gaussian blur sigma
    sharpen?: number; // Sharpen sigma

    // Background (for transparent images)
    background?: string; // Hex color without #, e.g., 'ffffff'

    // Device pixel ratio (for retina displays)
    dpr?: number;

    // Strip metadata
    stripMetadata?: boolean;

    // Cache control (for CDN)
    cacheBuster?: string;
}

/**
 * Encode source URL for imgproxy
 * Uses URL-safe Base64 encoding without padding
 */
function encodeSourceUrl(url: string): string {
    // URL-safe Base64 encoding without padding
    const base64 = btoa(url);
    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}


/**
 * Build processing options string from options object
 */
function buildProcessingOptions(options: ImgproxyOptions): string {
    const parts: string[] = [];

    // Resize (rs:type:width:height:enlarge:extend)
    if (options.width || options.height) {
        const resizeType = options.resizeType || 'fit';
        const width = options.width || 0;
        const height = options.height || 0;
        const enlarge = options.enlarge ? 1 : 0;
        const extend = options.extend ? 1 : 0;
        parts.push(`rs:${resizeType}:${width}:${height}:${enlarge}:${extend}`);
    }

    // Gravity (g:type)
    if (options.gravity) {
        parts.push(`g:${options.gravity}`);
    }

    // Quality (q:value)
    if (options.quality) {
        parts.push(`q:${options.quality}`);
    }

    // DPR (dpr:value)
    if (options.dpr && options.dpr > 1) {
        parts.push(`dpr:${options.dpr}`);
    }

    // Blur (bl:sigma)
    if (options.blur) {
        parts.push(`bl:${options.blur}`);
    }

    // Sharpen (sh:sigma)
    if (options.sharpen) {
        parts.push(`sh:${options.sharpen}`);
    }

    // Background (bg:hex)
    if (options.background) {
        parts.push(`bg:${options.background}`);
    }

    // Strip metadata
    if (options.stripMetadata) {
        parts.push('sm:1');
    }

    // Cache buster (cb:value) - useful for cache invalidation
    if (options.cacheBuster) {
        parts.push(`cb:${options.cacheBuster}`);
    }

    return parts.join('/');
}

/**
 * Generate an imgproxy URL for processing an image
 * 
 * @param sourceUrl - The original image URL to process
 * @param options - Processing options
 * @returns The imgproxy URL
 * 
 * @example
 * // Resize to 400px width, maintain aspect ratio, convert to WebP
 * getImgproxyUrl('https://example.com/image.jpg', { width: 400, format: 'webp' })
 * 
 * @example
 * // Create a 200x200 thumbnail with smart cropping
 * getImgproxyUrl('https://example.com/image.jpg', { 
 *   width: 200, 
 *   height: 200, 
 *   resizeType: 'fill',
 *   gravity: 'sm' 
 * })
 */
export function getImgproxyUrl(sourceUrl: string, options: ImgproxyOptions = {}): string {
    // Don't process data URLs or blob URLs
    if (sourceUrl.startsWith('data:') || sourceUrl.startsWith('blob:')) {
        return sourceUrl;
    }

    // Build the URL
    const processingOptions = buildProcessingOptions(options);
    const encodedUrl = encodeSourceUrl(sourceUrl);
    const extension = options.format ? `@${options.format}` : '';

    // URL structure: /{processing_options}/{base64_encoded_url}{@extension}
    // Note: This imgproxy instance doesn't require /insecure prefix
    const path = processingOptions
        ? `/${processingOptions}/${encodedUrl}${extension}`
        : `/${encodedUrl}${extension}`;

    return `${IMGPROXY_BASE_URL}${path}`;
}

/**
 * Convenience function for thumbnails
 */
export function getThumbnailUrl(sourceUrl: string, size: number = 300): string {
    return getImgproxyUrl(sourceUrl, {
        width: size,
        height: size,
        resizeType: 'fill',
        gravity: 'sm', // Smart gravity for best crop
        quality: 80,
        format: 'webp',
        stripMetadata: true
    });
}

/**
 * Convenience function for feed/gallery images
 */
export function getFeedImageUrl(sourceUrl: string, width: number = 600): string {
    return getImgproxyUrl(sourceUrl, {
        width,
        resizeType: 'fit',
        quality: 85,
        format: 'webp',
        stripMetadata: true
    });
}

/**
 * Convenience function for full-resolution optimized images
 */
export function getOptimizedUrl(sourceUrl: string, maxWidth: number = 1920): string {
    return getImgproxyUrl(sourceUrl, {
        width: maxWidth,
        resizeType: 'fit',
        quality: 90,
        format: 'webp',
        stripMetadata: true
    });
}

/**
 * Convenience function for avatar/profile images
 */
export function getAvatarUrl(sourceUrl: string, size: number = 100): string {
    return getImgproxyUrl(sourceUrl, {
        width: size,
        height: size,
        resizeType: 'fill',
        gravity: 'sm',
        quality: 85,
        format: 'webp',
        stripMetadata: true
    });
}

/**
 * Convenience function for blurred placeholder (LQIP - Low Quality Image Placeholder)
 */
export function getPlaceholderUrl(sourceUrl: string): string {
    return getImgproxyUrl(sourceUrl, {
        width: 40,
        resizeType: 'fit',
        quality: 30,
        blur: 5,
        format: 'webp',
        stripMetadata: true
    });
}
