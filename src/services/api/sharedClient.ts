/**
 * Shared API Client (v3)
 *
 * For endpoints used by BOTH creator and business apps.
 * Maps to: /api/v3/shared/*
 * Auth: Required (Bearer token)
 *
 * Use this for: user profile, tokens, billing, marketplace, SSE
 */
import { ENV } from '@/config/env';

const V3_PREFIX = '/api/v3/shared';

function getBaseUrl(): string {
  return ENV.API_URL;
}

function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

interface SharedFetchOptions extends RequestInit {
  /** Skip auth header (rarely needed) */
  skipAuth?: boolean;
}

/**
 * Fetch from the shared v3 API namespace.
 * @param path - Path relative to /api/v3/shared (e.g., '/users/me', '/tokens/balance')
 */
export async function sharedFetch(path: string, options: SharedFetchOptions = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (!options.skipAuth) {
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
