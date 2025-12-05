// Default configuration for local development
// This file is overwritten at runtime in production by Docker
// NOTE: Sensitive keys (FAL_KEY, etc.) should NOT be in this file
// They are fetched from backend via /api/config endpoint
//
// IMPORTANT: The frontend code auto-derives production URLs from the current
// origin if these values are empty. For local dev, set explicit localhost values.
window.ENV = {
  VITE_API_URL: 'http://localhost:3002',
  VITE_AUTH_URL: 'http://localhost:3002',
  VITE_BASE_URL: 'http://localhost:8080',
  VITE_MINIO_ENDPOINT: 's3.amazonaws.com',
  VITE_MINIO_BUCKET: 'pictureme.now',
  VITE_MINIO_SERVER_URL: 'https://s3.amazonaws.com',
  VITE_STRIPE_PUBLISHABLE_KEY: '',
};

