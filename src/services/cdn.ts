/**
 * CDN Media Service - Optimized for Edge Delivery
 * 
 * Architecture:
 * - PUBLIC content → Cloudflare Image Resizing (edge-processed, < 100ms TTFB)
 * - PRIVATE content → imgproxy (watermarks, auth, custom crops)
 * - VIDEO content → CDN direct (no processing, range requests)
 * 
 * Rule of thumb:
 * - If media can be seen without authentication → Cloudflare Image Resizing
 * - If media requires logic or protection → imgproxy behind Cloudflare
 * - If media is video → CDN only, no processing
 * 
 * NOTE: Cloudflare Image Resizing requires Pro plan ($20/month) or higher.
 * Set USE_CLOUDFLARE_IMAGE_RESIZING to false to use imgproxy for all images.
 */

// ============== CONFIGURATION ==============

// Toggle: Set to true when you have Cloudflare Pro plan or higher
// Set to false to use imgproxy for everything (Free plan compatible)
const USE_CLOUDFLARE_IMAGE_RESIZING = true; // ✅ Enabled - Pro plan detected

// Primary CDN domain (serves images through Cloudflare)
const CDN_DOMAIN = 'https://pictureme.now';

// imgproxy instance for private/authenticated content
const IMGPROXY_BASE_URL = 'https://img.pictureme.now';

// Video CDN subdomain
const VIDEO_CDN_DOMAIN = 'https://cdn.pictureme.now';

// R2/Storage origin (for direct references)
// Migrated from S3 to Cloudflare R2 for zero egress fees and CF integration
const R2_DEV_URL = 'https://pub-57622ef7fab343e28d70b45859294410.r2.dev';
// Custom domain with Cloudflare Image Resizing enabled
const R2_CUSTOM_DOMAIN = 'https://r2.pictureme.now';

// ============== TYPES ==============

export type ImageFit = 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
export type ImageFormat = 'auto' | 'avif' | 'webp' | 'jpeg' | 'png';
export type ImageGravity = 'auto' | 'center' | 'north' | 'south' | 'east' | 'west' | 'face';

export interface CloudflareImageOptions {
  width?: number;
  height?: number;
  fit?: ImageFit;
  format?: ImageFormat;
  quality?: number;
  dpr?: number;
  gravity?: ImageGravity;
  blur?: number;
  sharpen?: number;
  background?: string;
  metadata?: 'keep' | 'copyright' | 'none';
}

export interface MediaUrlOptions extends CloudflareImageOptions {
  // Content visibility
  isPublic?: boolean;
  
  // Auth/protection
  requiresAuth?: boolean;
  watermark?: boolean;
  
  // Preset shortcuts
  preset?: 'thumbnail' | 'feed' | 'hero' | 'view' | 'download' | 'placeholder';
  
  // Tier-based quality (for downloads)
  tier?: 'free' | 'spark' | 'vibe' | 'studio' | 'business';
}

// ============== CLOUDFLARE IMAGE RESIZING ==============

/**
 * Standard breakpoints for responsive images
 * Match Tailwind's default breakpoints for consistency
 */
export const BREAKPOINTS = {
  xs: 160,    // Tiny thumbnails, avatars
  sm: 320,    // Small cards
  md: 384,    // Medium cards, mobile full-width
  lg: 640,    // Desktop cards
  xl: 1024,   // Desktop large
  '2xl': 1280, // Hero images
  '4k': 1920, // Full resolution displays
} as const;

/**
 * Preset configurations for common use cases
 */
const PRESETS: Record<string, CloudflareImageOptions> = {
  thumbnail: {
    width: 300,
    height: 300,
    fit: 'cover',
    format: 'auto',
    quality: 80,
    gravity: 'face',
  },
  feed: {
    width: 600,
    fit: 'scale-down',
    format: 'auto',
    quality: 75,
  },
  hero: {
    width: 1280,
    fit: 'scale-down',
    format: 'auto',
    quality: 85,
  },
  view: {
    width: 2048,
    fit: 'scale-down',
    format: 'auto',
    quality: 90,
  },
  placeholder: {
    width: 40,
    fit: 'scale-down',
    format: 'auto',
    quality: 30,
    blur: 5,
  },
};

/**
 * Build Cloudflare Image Resizing URL
 * Format: /cdn-cgi/image/fit=scale-down,format=auto,width={W},quality={Q}/{ORIGIN_URL}
 */
function buildCloudflareImageUrl(sourceUrl: string, options: CloudflareImageOptions = {}): string {
  if (!sourceUrl) return '';
  
  // Don't process data URLs or blob URLs
  if (sourceUrl.startsWith('data:') || sourceUrl.startsWith('blob:')) {
    return sourceUrl;
  }
  
  // Don't double-process Cloudflare URLs
  if (sourceUrl.includes('/cdn-cgi/image/')) {
    return sourceUrl;
  }
  
  // Build transformation parameters
  const params: string[] = [];
  
  // Fit mode (default: scale-down for best quality)
  params.push(`fit=${options.fit || 'scale-down'}`);
  
  // Format (auto for best compression with browser support)
  params.push(`format=${options.format || 'auto'}`);
  
  // Width (required for resizing)
  if (options.width) {
    params.push(`width=${options.width}`);
  }
  
  // Height (optional, usually auto-calculated)
  if (options.height) {
    params.push(`height=${options.height}`);
  }
  
  // Quality (75 for feeds, 85 for heroes, 90+ for downloads)
  if (options.quality) {
    params.push(`quality=${options.quality}`);
  }
  
  // Device Pixel Ratio for retina displays
  if (options.dpr && options.dpr > 1) {
    params.push(`dpr=${Math.min(options.dpr, 3)}`);
  }
  
  // Gravity for cropping
  if (options.gravity && options.gravity !== 'auto') {
    params.push(`gravity=${options.gravity}`);
  }
  
  // Blur effect
  if (options.blur) {
    params.push(`blur=${options.blur}`);
  }
  
  // Sharpen
  if (options.sharpen) {
    params.push(`sharpen=${options.sharpen}`);
  }
  
  // Background color for padding
  if (options.background) {
    params.push(`background=${options.background}`);
  }
  
  // Metadata handling
  if (options.metadata) {
    params.push(`metadata=${options.metadata}`);
  }
  
  // Normalize the source URL
  const normalizedUrl = normalizeSourceUrl(sourceUrl);
  
  // Build the final Cloudflare URL
  // The CDN domain routes through Cloudflare which applies the transformations
  return `${CDN_DOMAIN}/cdn-cgi/image/${params.join(',')}/${normalizedUrl}`;
}

/**
 * Normalize source URL to ensure consistent caching
 * Remove timestamps, random tokens, etc.
 */
function normalizeSourceUrl(url: string): string {
  if (!url) return '';
  
  try {
    const parsedUrl = new URL(url);
    
    // Remove cache-busting parameters that break deterministic URLs
    const paramsToRemove = ['t', 'ts', 'timestamp', 'v', 'version', 'random', 'cb', '_'];
    paramsToRemove.forEach(param => parsedUrl.searchParams.delete(param));
    
    // Return the cleaned URL
    // For same-origin, return path only
    if (parsedUrl.origin === CDN_DOMAIN || parsedUrl.hostname.includes('pictureme.now')) {
      return parsedUrl.pathname + parsedUrl.search;
    }
    
    // For external URLs, return full URL
    return parsedUrl.toString();
  } catch {
    // If URL parsing fails, return as-is
    return url;
  }
}

// ============== IMGPROXY (PRIVATE CONTENT) ==============

/**
 * Encode URL for imgproxy (Base64 URL-safe)
 */
function encodeForImgproxy(url: string): string {
  if (!url) return '';
  try {
    const base64 = btoa(url);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return '';
  }
}

/**
 * Build imgproxy URL for private/authenticated content
 * 
 * Uses preset mode (only mode that works with ALLOWED_SOURCES)
 */
function buildImgproxyUrl(sourceUrl: string, preset: string = 'view'): string {
  if (!sourceUrl) return '';
  
  if (sourceUrl.startsWith('data:') || sourceUrl.startsWith('blob:')) {
    return sourceUrl;
  }
  
  const encodedUrl = encodeForImgproxy(sourceUrl);
  if (!encodedUrl) return sourceUrl;
  
  // Use preset mode (only mode that works with current imgproxy config)
  return `${IMGPROXY_BASE_URL}/preset:${preset}/${encodedUrl}`;
}

// ============== R2 + CLOUDFLARE IMAGE RESIZING ==============

/**
 * Build Cloudflare Image Resizing URL for R2 images
 * 
 * Uses the r2.pictureme.now custom domain which has CF Image Resizing enabled
 * Format: https://r2.pictureme.now/cdn-cgi/image/{params}/{path}
 * 
 * This gives us:
 * - 98%+ compression (2MB → 24KB)
 * - Automatic WebP/AVIF conversion
 * - Edge caching globally
 * - $0 egress fees (R2)
 */
function buildR2CloudflareImageUrl(sourceUrl: string, options: CloudflareImageOptions = {}): string {
  if (!sourceUrl) return '';
  
  // Don't process data URLs or blob URLs
  if (sourceUrl.startsWith('data:') || sourceUrl.startsWith('blob:')) {
    return sourceUrl;
  }
  
  // Don't double-process
  if (sourceUrl.includes('/cdn-cgi/image/')) {
    return sourceUrl;
  }
  
  // Extract the path from the R2 URL
  let imagePath = '';
  try {
    const url = new URL(sourceUrl);
    imagePath = url.pathname;
  } catch {
    // If URL parsing fails, try to extract path manually
    if (sourceUrl.includes('.r2.dev/')) {
      imagePath = '/' + sourceUrl.split('.r2.dev/')[1];
    } else if (sourceUrl.includes('r2.pictureme.now/')) {
      imagePath = '/' + sourceUrl.split('r2.pictureme.now/')[1];
    } else {
      return sourceUrl; // Can't parse, return as-is
    }
  }
  
  // Clean up path: remove /pictureme-media/ prefix if present (old URLs)
  imagePath = imagePath.replace('/pictureme-media/', '/');
  
  // Build transformation parameters
  const params: string[] = [];
  
  // Width (required for resizing)
  if (options.width) {
    params.push(`width=${options.width}`);
  }
  
  // Height (optional)
  if (options.height) {
    params.push(`height=${options.height}`);
  }
  
  // Fit mode
  if (options.fit) {
    params.push(`fit=${options.fit}`);
  } else if (options.width && options.height) {
    params.push('fit=cover'); // Default to cover when both dimensions specified
  }
  
  // Quality (default 80 for good balance)
  params.push(`quality=${options.quality || 80}`);
  
  // Format (auto for best compression)
  params.push(`format=${options.format || 'auto'}`);
  
  // Gravity for cropping
  if (options.gravity) {
    params.push(`gravity=${options.gravity}`);
  }
  
  // If no params, just return direct URL (no resizing needed)
  if (params.length === 0) {
    return `${R2_CUSTOM_DOMAIN}${imagePath}`;
  }
  
  // Build the Cloudflare Image Resizing URL
  // Format: https://r2.pictureme.now/cdn-cgi/image/width=300,quality=80,format=auto/path/to/image.png
  return `${R2_CUSTOM_DOMAIN}/cdn-cgi/image/${params.join(',')}${imagePath}`;
}

// ============== VIDEO CDN ==============

/**
 * Build video CDN URL for direct delivery
 * No processing - videos are pre-encoded
 */
function buildVideoCdnUrl(videoPath: string): string {
  if (!videoPath) return '';
  
  // If already a full URL, normalize it
  if (videoPath.startsWith('http')) {
    const url = new URL(videoPath);
    // Extract just the path for CDN routing
    return `${VIDEO_CDN_DOMAIN}${url.pathname}`;
  }
  
  // Ensure path starts with /
  const normalizedPath = videoPath.startsWith('/') ? videoPath : `/${videoPath}`;
  return `${VIDEO_CDN_DOMAIN}${normalizedPath}`;
}

// ============== ORIGIN DETECTION ==============

// R2 public URLs (already defined at top of file)

/**
 * Check if a URL is from Cloudflare R2
 * Note: r2.dev URLs are in a different zone than pictureme.now, so they need
 * to go through imgproxy. Only the custom domain (r2.pictureme.now) can use
 * Cloudflare Image Resizing directly.
 */
function isR2Origin(url: string): boolean {
  if (!url) return false;
  return url.startsWith(R2_DEV_URL) || 
         url.startsWith(R2_CUSTOM_DOMAIN) ||
         url.includes('.r2.dev/') ||
         url.includes('r2.pictureme.now');
}

/**
 * Check if R2 URL uses our custom domain (same zone, can use CF Image Resizing)
 */
function isR2CustomDomain(url: string): boolean {
  if (!url) return false;
  return url.includes('r2.pictureme.now');
}

/**
 * Check if a URL is from an external origin that Cloudflare can't resize
 * Cloudflare Image Resizing only works with:
 * 1. Images on your own domain
 * 2. Images in Cloudflare R2
 * 
 * External origins (S3, fal.media, etc.) must use imgproxy
 */
function isExternalOrigin(url: string): boolean {
  if (!url) return false;
  
  // R2 custom domain (same zone) - can use CF Image Resizing
  if (isR2CustomDomain(url)) {
    return false;
  }
  
  // R2.dev URLs are a different zone - treat as external (use imgproxy)
  if (isR2Origin(url) && !isR2CustomDomain(url)) {
    return true;
  }
  
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    
    // These are external origins that Cloudflare can't resize
    const externalOrigins = [
      's3.amazonaws.com',
      'pictureme.now.s3.amazonaws.com',
      's3.us-east-1.amazonaws.com',
      'fal.media',
      'v3.fal.media',
      'v3b.fal.media',
      'storage.googleapis.com',
      'cloudinary.com',
      'imgix.net',
      'unsplash.com',
      'images.unsplash.com',
    ];
    
    return externalOrigins.some(origin => 
      hostname === origin || hostname.endsWith('.' + origin)
    );
  } catch {
    return false;
  }
}

// ============== UNIFIED API ==============

/**
 * Get optimized image URL based on content type and visibility
 * 
 * Decision tree:
 * 1. R2 images (r2.dev or r2.pictureme.now) → serve directly (already on CF edge)
 * 2. If Cloudflare Image Resizing disabled → use imgproxy for everything
 * 3. If source URL is external origin → use imgproxy (CF can't fetch external)
 * 4. Public content from own origin → Cloudflare Image Resizing
 * 5. Private/auth content → imgproxy
 * 6. Watermarked content → imgproxy with watermark preset
 */
export function getImageUrl(sourceUrl: string, options: MediaUrlOptions = {}): string {
  if (!sourceUrl) return '';
  
  // Handle preset shortcuts
  if (options.preset) {
    const presetOptions = PRESETS[options.preset];
    options = { ...presetOptions, ...options };
  }
  
  // R2 images - use public R2 domain with Cloudflare Image Resizing
  // For visualization: use public .r2.dev URLs (no auth needed)
  // For downloads: use backend endpoint with auth (handled separately)
  if (isR2Origin(sourceUrl)) {
    // Convert r2.pictureme.now URLs to public .r2.dev URLs
    let publicUrl = sourceUrl;
    if (sourceUrl.includes('r2.pictureme.now')) {
      // Extract path and convert to public domain
      try {
        const url = new URL(sourceUrl);
        let path = url.pathname;
        // Remove bucket name if present
        if (path.startsWith('/pictureme-media/')) {
          path = path.substring('/pictureme-media/'.length);
        } else if (path.startsWith('/')) {
          path = path.substring(1);
        }
        publicUrl = `${R2_DEV_URL}/${path}`;
      } catch {
        // Fallback to original URL
      }
    }
    
    // Use Cloudflare Image Resizing on public R2 URL
    return buildR2CloudflareImageUrl(publicUrl, options);
  }
  
  // Determine which service to use
  // Key insight: Cloudflare Image Resizing can ONLY resize images from:
  // 1. Your own domain (same zone)
  // 2. Cloudflare R2 (with proper binding)
  // External origins (S3, fal.media) MUST use imgproxy
  const isExternal = isExternalOrigin(sourceUrl);
  
  const useImgproxy = 
    !USE_CLOUDFLARE_IMAGE_RESIZING ||  // Fallback to imgproxy if CF not available
    isExternal ||                       // External origins require imgproxy
    options.requiresAuth === true || 
    options.watermark === true ||
    options.isPublic === false;
  
  if (useImgproxy) {
    // Use imgproxy for external origins or private/protected content
    let preset = 'view';
    
    if (options.watermark) {
      preset = 'watermark';
    } else if (options.preset === 'thumbnail') {
      preset = 'thumbnail';
    } else if (options.preset === 'feed') {
      preset = 'feed';
    } else if (options.preset === 'hero' || options.preset === 'view') {
      preset = 'view';
    } else if (options.tier) {
      // Tier-based download presets
      const tierPresets: Record<string, string> = {
        free: 'free_download',
        spark: 'spark_download',
        vibe: 'vibe_download',
        studio: 'studio_download',
        business: 'studio_download',
      };
      preset = tierPresets[options.tier] || 'view';
    }
    
    return buildImgproxyUrl(sourceUrl, preset);
  }
  
  // Use Cloudflare Image Resizing for public content from own origin
  return buildCloudflareImageUrl(sourceUrl, options);
}

/**
 * Get video URL for CDN delivery
 * Videos are always served directly, no processing
 */
export function getVideoUrl(videoPath: string): string {
  return buildVideoCdnUrl(videoPath);
}

// ============== CONVENIENCE FUNCTIONS ==============

/**
 * Thumbnail for grids (300x300, face-focused)
 */
export function getThumbnailUrl(sourceUrl: string, size: number = 300): string {
  return getImageUrl(sourceUrl, {
    preset: 'thumbnail',
    width: size,
    height: size,
  });
}

/**
 * Feed image (600px wide, optimized for scrolling)
 */
export function getFeedUrl(sourceUrl: string, width: number = 600): string {
  return getImageUrl(sourceUrl, {
    preset: width <= 600 ? 'feed' : 'hero',
    width,
  });
}

/**
 * Hero/banner image (1280px wide, high quality)
 */
export function getHeroUrl(sourceUrl: string): string {
  return getImageUrl(sourceUrl, { preset: 'hero' });
}

/**
 * Full view image (2048px, detail view)
 */
export function getViewUrl(sourceUrl: string): string {
  return getImageUrl(sourceUrl, { preset: 'view' });
}

/**
 * Placeholder image (tiny, blurred for LQIP)
 */
export function getPlaceholderUrl(sourceUrl: string): string {
  return getImageUrl(sourceUrl, { preset: 'placeholder' });
}

/**
 * Avatar image (small, face-focused)
 */
export function getAvatarUrl(sourceUrl: string, size: number = 80): string {
  return getImageUrl(sourceUrl, {
    width: size,
    height: size,
    fit: 'cover',
    gravity: 'face',
    quality: 80,
    format: 'auto',
  });
}

/**
 * Responsive srcset for <img srcset="">
 * Returns a srcset string with multiple sizes for responsive loading
 */
export function getResponsiveSrcSet(
  sourceUrl: string, 
  sizes: number[] = [320, 640, 1024, 1280]
): string {
  if (!sourceUrl) return '';
  
  return sizes
    .map(width => `${getImageUrl(sourceUrl, { width, quality: 80 })} ${width}w`)
    .join(', ');
}

// ============== DOWNLOAD URLs (imgproxy) ==============

/**
 * Get download URL based on user tier
 * Always uses imgproxy for quality control
 */
export function getDownloadUrl(sourceUrl: string, tier: 'free' | 'spark' | 'vibe' | 'studio' | 'business' = 'free'): string {
  return getImageUrl(sourceUrl, { tier, isPublic: false });
}

/**
 * Get watermarked image URL
 */
export function getWatermarkedUrl(sourceUrl: string): string {
  return getImageUrl(sourceUrl, { watermark: true, isPublic: false });
}

// ============== MIGRATION HELPERS ==============

/**
 * Check if a URL is using the old imgproxy format
 */
export function isLegacyImgproxyUrl(url: string): boolean {
  return url.includes('img.pictureme.now') && !url.includes('/cdn-cgi/');
}

/**
 * Convert legacy imgproxy URL to Cloudflare (for public content)
 * Note: This should only be used during migration
 */
export function migrateLegacyUrl(legacyUrl: string, options: MediaUrlOptions = {}): string {
  if (!legacyUrl) return '';
  
  // Extract original URL from imgproxy format
  // Format: https://img.pictureme.now/preset:xxx/{base64_url}
  // or: https://img.pictureme.now/insecure/{options}/{base64_url}
  
  const match = legacyUrl.match(/\/([A-Za-z0-9_-]+)$/);
  if (!match) return legacyUrl;
  
  try {
    // Decode base64 URL
    const base64 = match[1].replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const originalUrl = atob(base64 + padding);
    
    // Return new Cloudflare URL
    return getImageUrl(originalUrl, options);
  } catch {
    return legacyUrl;
  }
}

// ============== EXPORTS ==============

export {
  buildCloudflareImageUrl,
  buildImgproxyUrl,
  buildVideoCdnUrl,
  buildR2CloudflareImageUrl,
  normalizeSourceUrl,
  CDN_DOMAIN,
  IMGPROXY_BASE_URL,
  VIDEO_CDN_DOMAIN,
  R2_DEV_URL,
  R2_CUSTOM_DOMAIN,
};
