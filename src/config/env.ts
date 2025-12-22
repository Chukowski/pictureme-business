/**
 * Runtime environment configuration
 * Reads from window.ENV (injected at runtime) or falls back to import.meta.env (build time)
 * 
 * NOTE: Sensitive keys (FAL_KEY, etc.) should NOT be in window.ENV
 * They are fetched from backend via /api/config endpoint
 */

interface EnvConfig {
  VITE_API_URL: string;
  VITE_AUTH_URL: string;
  VITE_BASE_URL: string;
  VITE_MINIO_ENDPOINT: string;
  VITE_MINIO_BUCKET: string;
  VITE_MINIO_SERVER_URL: string;
  VITE_STRIPE_PUBLISHABLE_KEY: string;
}

declare global {
  interface Window {
    ENV?: Partial<EnvConfig>;
  }
}

/**
 * Upgrade HTTP to HTTPS for production URLs
 * This is critical to prevent Mixed Content errors in browsers
 */
function enforceHttps(url: string): string {
  if (!url) return url;

  // Skip localhost and local IPs - these don't need HTTPS
  if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('192.168.')) {
    return url;
  }

  // Always upgrade http:// to https:// for non-local URLs
  // This prevents Mixed Content errors when the site is served over HTTPS
  if (url.startsWith('http://')) {
    const httpsUrl = url.replace('http://', 'https://');
    console.warn('🔒 [ENV] Upgraded URL to HTTPS:', url, '->', httpsUrl);
    return httpsUrl;
  }

  return url;
}

/**
 * Check if we're in production (not localhost)
 */
function isProduction(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return !hostname.includes('localhost') && !hostname.includes('127.0.0.1');
}

/**
 * Derive production URLs from current origin
 * If window.ENV is missing values, we can infer them from the current hostname
 * 
 * NOTE: After Go migration, auth is handled by the same Go backend (go.pictureme.now)
 * so AUTH_URL should point to the Go API, not a separate auth server
 */
function deriveProductionUrl(type: 'api' | 'auth' | 'base'): string {
  if (typeof window === 'undefined') return '';

  const hostname = window.location.hostname;
  const protocol = window.location.protocol; // Should be https: in production

  // For pictureme.now domain
  // Auth is now handled by the Go backend (go.pictureme.now), not a separate auth server
  if (hostname.includes('pictureme.now')) {
    switch (type) {
      case 'api': return `${protocol}//go.pictureme.now`;
      case 'auth': return `${protocol}//go.pictureme.now`; // Same as API - Go handles auth
      case 'base': return `${protocol}//${hostname}`;
    }
  }

  // For akitapr.com domain
  if (hostname.includes('akitapr.com')) {
    switch (type) {
      case 'api': return `${protocol}//photoapi.akitapr.com`;
      case 'auth': return `${protocol}//photoapi.akitapr.com`; // Same as API - Go handles auth
      case 'base': return `${protocol}//${hostname}`;
    }
  }

  // Default: derive from current hostname pattern
  // e.g., if on app.example.com, derive api.example.com
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    const domain = parts.slice(-2).join('.');
    switch (type) {
      case 'api': return `${protocol}//api.${domain}`;
      case 'auth': return `${protocol}//api.${domain}`; // Same as API - Go handles auth
      case 'base': return `${protocol}//${hostname}`;
    }
  }

  return '';
}

/**
 * Get environment variable with runtime override support
 * This is called dynamically to ensure window.ENV is available
 * 
 * In production, ONLY use window.ENV (from config.js)
 * In development, fallback to import.meta.env
 */
function getEnv(key: keyof EnvConfig): string {
  let value = '';

  // 1. Check window.ENV (runtime config)
  if (typeof window !== 'undefined' && window.ENV && window.ENV[key]) {
    value = window.ENV[key] as string;
  }

  // 2. Fallback to derived production URLs or build-time env vars
  if (!value) {
    if (isProduction()) {
      switch (key) {
        case 'VITE_API_URL':
          value = deriveProductionUrl('api');
          break;
        case 'VITE_AUTH_URL':
          value = deriveProductionUrl('auth');
          break;
        case 'VITE_BASE_URL':
          value = deriveProductionUrl('base');
          break;
        default:
          value = import.meta.env[key] || '';
      }
    } else {
      value = import.meta.env[key] || '';
    }
  }

  // 3. FORCE OVERRIDE for pictureme.now domain to use the new Go backend
  if (typeof window !== 'undefined' && window.location.hostname.includes('pictureme.now')) {
    if (key === 'VITE_API_URL' || key === 'VITE_AUTH_URL') {
      // Always enforce HTTPS and use go.pictureme.now
      return 'https://go.pictureme.now';
    }
  }

  // 4. Auto-upgrade http to https for URL-type configs to prevent Mixed Content errors
  const urlKeys: (keyof EnvConfig)[] = ['VITE_API_URL', 'VITE_AUTH_URL', 'VITE_BASE_URL', 'VITE_MINIO_SERVER_URL'];
  if (urlKeys.includes(key)) {
    return enforceHttps(value);
  }

  return value;
}

// Export environment variables as getters to ensure they're evaluated at access time
// This ensures window.ENV is available when the values are read
// NOTE: Sensitive keys like FAL_KEY are NOT included here - they come from backend
export const ENV = {
  get API_URL() { return getEnv('VITE_API_URL'); },
  get AUTH_URL() { return getEnv('VITE_AUTH_URL'); },
  get BASE_URL() { return getEnv('VITE_BASE_URL'); },
  get MINIO_ENDPOINT() { return getEnv('VITE_MINIO_ENDPOINT'); },
  get MINIO_BUCKET() { return getEnv('VITE_MINIO_BUCKET'); },
  get MINIO_SERVER_URL() { return getEnv('VITE_MINIO_SERVER_URL'); },
  get STRIPE_PUBLISHABLE_KEY() { return getEnv('VITE_STRIPE_PUBLISHABLE_KEY'); },
};

// Log config in development (delayed to ensure window.ENV is loaded)
if (import.meta.env.DEV) {
  setTimeout(() => {
    console.log('🔧 Environment Config:', {
      API_URL: ENV.API_URL,
      AUTH_URL: ENV.AUTH_URL,
      BASE_URL: ENV.BASE_URL,
    });
  }, 100);
}

