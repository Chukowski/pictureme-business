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
 */
function enforceHttps(url: string): string {
  if (!url) return url;
  
  // Skip localhost and local IPs
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    return url;
  }
  
  // Upgrade http to https for production
  if (url.startsWith('http://')) {
    console.warn('🔒 Upgrading URL to HTTPS:', url);
    return url.replace('http://', 'https://');
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
 * Get environment variable with runtime override support
 * This is called dynamically to ensure window.ENV is available
 * 
 * In production, ONLY use window.ENV (from config.js)
 * In development, fallback to import.meta.env
 */
function getEnv(key: keyof EnvConfig): string {
  let value = '';
  
  // In production, ONLY use window.ENV - never use build-time env vars
  // This prevents localhost:3001 from being used in production
  if (isProduction()) {
    if (typeof window !== 'undefined' && window.ENV && window.ENV[key]) {
      value = window.ENV[key] as string;
    }
    // In production, if window.ENV doesn't have the value, return empty string
    // DO NOT fallback to import.meta.env which may have localhost values
  } else {
    // In development, try window.ENV first, then fallback to build-time env
    if (typeof window !== 'undefined' && window.ENV && window.ENV[key]) {
      value = window.ENV[key] as string;
    } else {
      value = import.meta.env[key] || '';
    }
  }

  // Auto-upgrade http to https for URL-type configs to prevent Mixed Content errors
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

