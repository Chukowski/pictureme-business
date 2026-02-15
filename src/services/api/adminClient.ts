/**
 * Admin API Client (v3)
 *
 * For admin/superadmin panel endpoints.
 * Maps to: /api/v3/admin/*
 * Auth: Required + Role (admin or superadmin)
 *
 * Use this for: system stats, user management, enterprise, Al-e CRM, content mgmt
 */
import { ENV } from '@/config/env';

const V3_PREFIX = '/api/v3/admin';

function getBaseUrl(): string {
  return ENV.API_URL;
}

function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

interface AdminFetchOptions extends RequestInit {
  /** Skip auth header (never for admin) */
  skipAuth?: boolean;
}

/**
 * Fetch from the admin v3 API namespace.
 * @param path - Path relative to /api/v3/admin (e.g., '/stats', '/users')
 */
export async function adminFetch(path: string, options: AdminFetchOptions = {}): Promise<Response> {
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
