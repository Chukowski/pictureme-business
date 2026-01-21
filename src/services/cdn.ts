/**
 * CDN Media Service - Cloudflare Image Resizing Integration
 * 
 * Architecture:
 * - Viewing/Thumbnails → Cloudflare Image Resizing (compressed, fast)
 * - Downloads → Direct R2 URL (full quality)
 * - Videos → Direct from R2
 * 
 * Cloudflare Image Resizing is done via /cdn-cgi/image/ prefix on the domain.
 */

// ============== CONFIGURATION ==============

// R2 public domain (automatically cached by Cloudflare)
const R2_PUBLIC_URL = 'https://pub-57622ef7fab343e28d70b45859294410.r2.dev';

// Custom domain with Cloudflare proxy (MUST have Image Resizing enabled in Cloudflare dashboard)
// This domain is used for optimized images
const CF_IMAGES_DOMAIN = 'https://pictureme.now';

// R2 Custom Domain (behind Cloudflare, usually more reliable for CF to fetch from)
const R2_STORAGE_DOMAIN = 'https://r2.pictureme.now';

// ============== TYPES ==============

export interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  fit?: 'cover' | 'contain' | 'scale-down' | 'crop';
  format?: 'auto' | 'webp' | 'avif' | 'jpeg';
  preset?: 'thumbnail' | 'feed' | 'view' | 'download';
}

// Preset configurations for consistent sizing
const PRESETS: Record<string, ImageOptions> = {
  thumbnail: { width: 300, height: 400, quality: 75, fit: 'cover', format: 'webp' },
  feed: { width: 600, height: 800, quality: 80, fit: 'cover', format: 'webp' },
  view: { width: 1200, quality: 85, fit: 'scale-down', format: 'auto' },
  download: {}, // No resizing - full quality
};

// ============== HELPER FUNCTIONS ==============

/**
 * Check if a URL is from R2 storage
 */
function isR2Url(url: string): boolean {
  if (!url) return false;
  return url.includes('.r2.dev') ||
    url.includes('r2.pictureme.now') ||
    url.includes('r2.cloudflarestorage.com');
}

/**
 * Check if a URL is from our own domains
 */
function isOwnDomain(url: string): boolean {
  if (!url) return false;
  return url.includes('pictureme.now') ||
    url.includes('.r2.dev') ||
    url.includes('localhost');
}

/**
 * Extract the image path from various URL formats
 */
function extractImagePath(url: string): string {
  if (!url) return '';

  try {
    const parsedUrl = new URL(url);
    let path = parsedUrl.pathname;

    // Remove /cdn-cgi/image/... if present (cleanup from old URLs)
    if (path.includes('/cdn-cgi/image/')) {
      const parts = path.split('/cdn-cgi/image/');
      if (parts.length > 1) {
        const afterParams = parts[1];
        const slashIndex = afterParams.indexOf('/');
        if (slashIndex > -1) {
          path = afterParams.substring(slashIndex);
        }
      }
    }

    // Remove bucket name if present
    if (path.startsWith('/pictureme-media/')) {
      path = path.substring('/pictureme-media/'.length);
    } else if (path.startsWith('/')) {
      path = path.substring(1);
    }

    return path;
  } catch {
    return url;
  }
}

/**
 * Convert any R2 URL to the public .r2.dev format (for full resolution access)
 */
function toPublicR2Url(url: string): string {
  if (!url) return '';

  // Already a public R2 URL
  if (url.includes('.r2.dev/') && !url.includes('/pictureme-media/')) {
    return url;
  }

  // Extract path and build public URL
  const path = extractImagePath(url);
  if (!path) return url;

  return `${R2_PUBLIC_URL}/${path}`;
}

/**
 * Build Cloudflare Image Resizing URL
 * Format: https://domain.com/cdn-cgi/image/options/path
 */
function buildCfImageUrl(sourceUrl: string, options: ImageOptions): string {
  if (!sourceUrl) return '';

  // Get the raw image path
  const path = extractImagePath(sourceUrl);
  if (!path) return sourceUrl;

  // Build options string
  const optionParts: string[] = [];

  if (options.width) optionParts.push(`width=${options.width}`);
  if (options.height) optionParts.push(`height=${options.height}`);
  if (options.quality) optionParts.push(`quality=${options.quality}`);
  if (options.fit) optionParts.push(`fit=${options.fit}`);
  if (options.format) optionParts.push(`format=${options.format}`);

  // If no options, just return the public R2 URL
  if (optionParts.length === 0) {
    return toPublicR2Url(sourceUrl);
  }

  const optionsStr = optionParts.join(',');

  // The source URL MUST be accessible from Cloudflare's perspective
  // Use the custom domain for fetching if possible, as it's usually more reliable
  const fullSourceUrl = `${R2_STORAGE_DOMAIN}/${path}`;

  // Add cache-buster for images less than 10 minutes old to avoid serving cached 524 errors
  let cacheBuster = '';
  const timestampMatch = path.match(/gen_(\d+)_/);
  if (timestampMatch) {
    const imageTimestamp = parseInt(timestampMatch[1], 10);
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    if (now - imageTimestamp < tenMinutes) {
      cacheBuster = `?v=${imageTimestamp}`;
    }
  }

  return `${CF_IMAGES_DOMAIN}/cdn-cgi/image/${optionsStr}/${fullSourceUrl}${cacheBuster}`;
}

// ============== MAIN FUNCTIONS ==============

/**
 * Get optimized image URL with Cloudflare Image Resizing
 * 
 * For R2 images: returns Cloudflare Image Resizing URL (compressed, fast)
 * For external images: returns as-is
 */
export function getImageUrl(sourceUrl: string, options: ImageOptions = {}): string {
  if (!sourceUrl) return '';

  // Don't process data URLs or blob URLs
  if (sourceUrl.startsWith('data:') || sourceUrl.startsWith('blob:')) {
    return sourceUrl;
  }

  // Apply preset if specified
  const finalOptions = options.preset
    ? { ...PRESETS[options.preset], ...options }
    : options;

  // R2 images - use Cloudflare Image Resizing
  if (isR2Url(sourceUrl) || isOwnDomain(sourceUrl)) {
    // For downloads, return full resolution
    if (options.preset === 'download') {
      return toPublicR2Url(sourceUrl);
    }
    return buildCfImageUrl(sourceUrl, finalOptions);
  }

  // External images (Unsplash, etc.) - return as-is
  return sourceUrl;
}

/**
 * Get thumbnail URL (small, compressed)
 */
export function getThumbnailUrl(sourceUrl: string, size: number = 300): string {
  return getImageUrl(sourceUrl, {
    width: size,
    height: Math.round(size * 1.33), // 3:4 aspect
    quality: 75,
    fit: 'cover',
    format: 'webp',
    preset: 'thumbnail'
  });
}

/**
 * Get feed image URL (medium, compressed)
 */
export function getFeedUrl(sourceUrl: string, width: number = 600): string {
  return getImageUrl(sourceUrl, {
    width,
    quality: 80,
    fit: 'scale-down',
    format: 'webp',
    preset: 'feed'
  });
}

/**
 * Get view/preview URL (larger, better quality)
 */
export function getViewUrl(sourceUrl: string, maxWidth: number = 1200): string {
  return getImageUrl(sourceUrl, {
    width: maxWidth,
    quality: 85,
    fit: 'scale-down',
    format: 'auto',
    preset: 'view'
  });
}

/**
 * Get avatar URL (tiny, compressed)
 */
export function getAvatarUrl(sourceUrl: string, size: number = 48): string {
  return getImageUrl(sourceUrl, {
    width: size,
    height: size,
    quality: 75,
    fit: 'cover',
    format: 'webp'
  });
}

/**
 * Get download URL (FULL RESOLUTION - no compression)
 */
export function getDownloadUrl(sourceUrl: string, _tier?: string): string {
  // Always return full resolution for downloads
  return toPublicR2Url(sourceUrl);
}

/**
 * Get video URL (direct from R2 - no optimization possible)
 */
export function getVideoUrl(sourceUrl: string): string {
  if (!sourceUrl) return '';

  if (isR2Url(sourceUrl)) {
    return toPublicR2Url(sourceUrl);
  }

  return sourceUrl;
}

// ============== CONVENIENCE EXPORTS ==============

// Alias for backward compatibility
export { getImageUrl as getProcessingUrl };
export { getFeedUrl as getFeedImageUrl };

// Legacy exports (no-op, kept for compatibility)
export function buildImgproxyUrl(sourceUrl: string, _preset?: string): string {
  console.warn('buildImgproxyUrl is deprecated, using Cloudflare Image Resizing');
  return getImageUrl(sourceUrl);
}

export function getProxyDownloadUrl(sourceUrl: string, _filename?: string): string {
  return getDownloadUrl(sourceUrl);
}

// ============== DEBUG ==============

export function debugImageUrl(sourceUrl: string): void {
  console.log('🔍 Image URL Debug:');
  console.log('  Source:', sourceUrl);
  console.log('  Is R2:', isR2Url(sourceUrl));
  console.log('  Is Own Domain:', isOwnDomain(sourceUrl));
  console.log('  Extracted Path:', extractImagePath(sourceUrl));
  console.log('  Full Res URL:', toPublicR2Url(sourceUrl));
  console.log('  Thumbnail URL:', getThumbnailUrl(sourceUrl));
  console.log('  View URL:', getViewUrl(sourceUrl));
  console.log('  Download URL:', getDownloadUrl(sourceUrl));
}
