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
  const baseUrl = getApiUrl(endpoint);
  const isGoBackend = baseUrl.includes(':3002') || baseUrl.includes('go.pictureme.now');

  // Ensure endpoint starts with a slash for consistent path joining
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Determine the correct prefix (/api or /api/v2)
  let prefix = '/api';
  if (isGoBackend && !cleanEndpoint.includes('/api/v2')) {
    prefix = '/api/v2';
  }

  // Build the final URL
  // If the endpoint already contains /api, don't add another prefix
  const finalUrl = cleanEndpoint.startsWith('/api')
    ? `${baseUrl}${cleanEndpoint}`
    : `${baseUrl}${prefix}${cleanEndpoint}`;

  console.log(`📡 API Request: ${finalUrl}`);

  // Perform the fetch
  const response = await fetch(finalUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  // Global 401 Unauthorized handler
  if (response.status === 401) {
    console.warn('🔒 [API] Unauthorized (401). Your session may have expired.');

    // Import dynamically to avoid circular dependency
    // @ts-ignore
    import('./eventsApi').then(module => {
      module.logoutUser();
      // Force a redirect to landing page
      window.location.href = '/?error=session_expired';
    }).catch(err => {
      console.error('Failed to logout user', err);
      // Fallback: clear local storage and redirect anyway
      localStorage.clear();
      window.location.href = '/';
    });
  }

  return response;
}

