/**
 * CDN Media Service - Simplified for R2 Direct Delivery
 * 
 * Architecture:
 * - ALL images → Cloudflare R2 public domain (zero egress fees)
 * - Downloads → Backend endpoint with authentication
 * - Videos → Direct from R2
 * 
 * No imgproxy needed - R2 is fast enough and we control the source images.
 */

// ============== CONFIGURATION ==============

// R2 public domain (automatically cached by Cloudflare)
const R2_PUBLIC_URL = 'https://pub-57622ef7fab343e28d70b45859294410.r2.dev';

// Custom domain (may not have public access configured)
const R2_CUSTOM_DOMAIN = 'https://r2.pictureme.now';

// ============== TYPES ==============

export interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  preset?: 'thumbnail' | 'feed' | 'view' | 'download';
}

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
 * Convert any R2 URL to the public .r2.dev format
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

// ============== MAIN FUNCTIONS ==============

/**
 * Get optimized image URL
 * 
 * For R2 images: returns public R2 URL (fast, cached by Cloudflare)
 * For external images: returns as-is (Unsplash, etc.)
 */
export function getImageUrl(sourceUrl: string, _options: ImageOptions = {}): string {
  if (!sourceUrl) return '';
  
  // Don't process data URLs or blob URLs
  if (sourceUrl.startsWith('data:') || sourceUrl.startsWith('blob:')) {
    return sourceUrl;
  }
  
  // R2 images - convert to public URL
  if (isR2Url(sourceUrl)) {
    return toPublicR2Url(sourceUrl);
  }
  
  // Own domain images - return as-is
  if (isOwnDomain(sourceUrl)) {
    return sourceUrl;
  }
  
  // External images (Unsplash, etc.) - return as-is
  return sourceUrl;
}

/**
 * Get thumbnail URL (same as getImageUrl, R2 serves fast)
 */
export function getThumbnailUrl(sourceUrl: string, size: number = 300): string {
  return getImageUrl(sourceUrl, { width: size, height: size, preset: 'thumbnail' });
}

/**
 * Get feed image URL
 */
export function getFeedUrl(sourceUrl: string, width: number = 600): string {
  return getImageUrl(sourceUrl, { width, preset: 'feed' });
}

/**
 * Get view/preview URL
 */
export function getViewUrl(sourceUrl: string): string {
  return getImageUrl(sourceUrl, { preset: 'view' });
}

/**
 * Get avatar URL
 */
export function getAvatarUrl(sourceUrl: string, size: number = 48): string {
  return getImageUrl(sourceUrl, { width: size, height: size });
}

/**
 * Get download URL (for high-res downloads)
 * Note: Downloads are handled via backend endpoint with auth
 */
export function getDownloadUrl(sourceUrl: string, _tier?: string): string {
  return getImageUrl(sourceUrl, { preset: 'download' });
}

/**
 * Get video URL (direct from R2)
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
  console.warn('buildImgproxyUrl is deprecated, using direct R2 URL');
  return getImageUrl(sourceUrl);
}

export function getProxyDownloadUrl(sourceUrl: string, _filename?: string): string {
  console.warn('getProxyDownloadUrl is deprecated, downloads handled via backend');
  return getImageUrl(sourceUrl);
}

// ============== DEBUG ==============

export function debugImageUrl(sourceUrl: string): void {
  console.log('🔍 Image URL Debug:');
  console.log('  Source:', sourceUrl);
  console.log('  Is R2:', isR2Url(sourceUrl));
  console.log('  Is Own Domain:', isOwnDomain(sourceUrl));
  console.log('  Extracted Path:', extractImagePath(sourceUrl));
  console.log('  Public URL:', toPublicR2Url(sourceUrl));
  console.log('  Final URL:', getImageUrl(sourceUrl));
}
