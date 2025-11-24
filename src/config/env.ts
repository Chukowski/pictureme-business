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
 * Get environment variable with runtime override support
 */
function getEnv(key: keyof EnvConfig): string {
  // Try runtime config first (from config.js)
  if (window.ENV && window.ENV[key]) {
    return window.ENV[key] as string;
  }
  
  // Fallback to build-time env
  return import.meta.env[key] || '';
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

