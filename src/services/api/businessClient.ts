/**
 * Business API Client (v3)
 *
 * For business-specific endpoints (events, booths, albums, POS, analytics).
 * Maps to: /api/v3/business/*
 * Auth: Required (Bearer token)
 *
 * Use this for: events, booths, albums, POS, analytics, email, organizations
 */
import { ENV } from '@/config/env';

const V3_PREFIX = '/api/v3/business';

function getBaseUrl(): string {
  return ENV.API_URL;
}

function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

interface BusinessFetchOptions extends RequestInit {
  /** Skip auth header */
  skipAuth?: boolean;
}

/**
 * Fetch from the business v3 API namespace.
 * @param path - Path relative to /api/v3/business (e.g., '/events', '/booths')
 */
export async function businessFetch(path: string, options: BusinessFetchOptions = {}): Promise<Response> {
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
