/**
 * Public API Client (v3)
 *
 * For endpoints that require NO authentication.
 * Maps to: /api/v3/public/*
 *
 * Use this for: auth, public profiles, public content, visitor features
 */
import { ENV } from '@/config/env';

const V3_PREFIX = '/api/v3/public';

function getBaseUrl(): string {
  return ENV.API_URL;
}

export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

interface PublicFetchOptions extends RequestInit {
  /** Send auth token if available (for optional-auth endpoints) */
  withOptionalAuth?: boolean;
}

/**
 * Fetch from the public v3 API namespace.
 * @param path - Path relative to /api/v3/public (e.g., '/tiers', '/auth/login')
 */
export async function publicFetch(path: string, options: PublicFetchOptions = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Some public endpoints accept optional auth (e.g., public profiles with like status)
  if (options.withOptionalAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${getBaseUrl()}${V3_PREFIX}${cleanPath}`;

  return fetch(url, {
    ...options,
    headers,
  });
}
