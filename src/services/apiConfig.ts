/**
 * API Service Configuration
 * Routes requests between Go (v2) and Python (v1) backends
 */

import { ENV } from "@/config/env";

// API version configuration
const USE_GO_BACKEND = true; // Toggle this to switch between backends

// Go backend endpoints (high performance)
const GO_ENDPOINTS = {
  albums: true,
  events: true,
  tokens: true,
};

/**
 * Get API URL based on endpoint and configuration
 */
export function getApiUrl(endpoint?: string): string {
  const baseUrl = ENV.API_URL;
  
  if (!USE_GO_BACKEND || !endpoint) {
    return baseUrl;
  }

  // Check if endpoint should use Go backend
  const endpointType = endpoint.split('/')[1]; // Get 'albums', 'events', etc.
  
  if (GO_ENDPOINTS[endpointType as keyof typeof GO_ENDPOINTS]) {
    // Use Go backend with /api/v2 prefix
    return baseUrl.replace(':3001', ':3002');
  }

  return baseUrl;
}

/**
 * Fetch wrapper that automatically routes to correct backend
 */
export async function apiFetch(endpoint: string, options?: RequestInit) {
  const url = `${getApiUrl(endpoint)}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  // Add /api/v2 prefix for Go endpoints
  const finalUrl = url.includes(':3002') && !endpoint.includes('/api/v2')
    ? url.replace(endpoint, `/api/v2${endpoint}`)
    : url;

  console.log(`📡 API Request: ${finalUrl}`);
  
  return fetch(finalUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}

