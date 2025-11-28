/**
 * Runtime environment configuration
 * Reads from window.ENV (injected at runtime) or falls back to import.meta.env (build time)
 */

interface EnvConfig {
  VITE_API_URL: string;
  VITE_AUTH_URL: string;
  VITE_BASE_URL: string;
  VITE_MINIO_ENDPOINT: string;
  VITE_MINIO_BUCKET: string;
  VITE_MINIO_SERVER_URL: string;
  VITE_STRIPE_PUBLISHABLE_KEY: string;
  VITE_FAL_KEY: string;
  VITE_COUCHDB_URL: string;
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
 * Get environment variable with runtime override support
 */
function getEnv(key: keyof EnvConfig): string {
  let value = '';
  
  // Try runtime config first (from config.js)
  if (window.ENV && window.ENV[key]) {
    value = window.ENV[key] as string;
  } else {
    // Fallback to build-time env
    value = import.meta.env[key] || '';
  }

  // Auto-upgrade http to https for URL-type configs to prevent Mixed Content errors
  const urlKeys: (keyof EnvConfig)[] = ['VITE_API_URL', 'VITE_AUTH_URL', 'VITE_BASE_URL', 'VITE_MINIO_SERVER_URL', 'VITE_COUCHDB_URL'];
  if (urlKeys.includes(key)) {
    return enforceHttps(value);
  }
  
  return value;
}

// Export environment variables
export const ENV = {
  API_URL: getEnv('VITE_API_URL'),
  AUTH_URL: getEnv('VITE_AUTH_URL'),
  BASE_URL: getEnv('VITE_BASE_URL'),
  MINIO_ENDPOINT: getEnv('VITE_MINIO_ENDPOINT'),
  MINIO_BUCKET: getEnv('VITE_MINIO_BUCKET'),
  MINIO_SERVER_URL: getEnv('VITE_MINIO_SERVER_URL'),
  STRIPE_PUBLISHABLE_KEY: getEnv('VITE_STRIPE_PUBLISHABLE_KEY'),
  FAL_KEY: getEnv('VITE_FAL_KEY'),
  COUCHDB_URL: getEnv('VITE_COUCHDB_URL'),
};

// Log config in development
if (import.meta.env.DEV) {
  console.log('🔧 Environment Config:', ENV);
}

