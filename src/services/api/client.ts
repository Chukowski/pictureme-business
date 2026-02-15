/**
 * Base API Client (LEGACY)
 *
 * @deprecated Use domain-specific clients instead:
 *   - publicClient.ts   → /api/v3/public/*   (no auth)
 *   - sharedClient.ts   → /api/v3/shared/*   (auth, both apps)
 *   - businessClient.ts → /api/v3/business/* (auth, business-only)
 *   - adminClient.ts    → /api/v3/admin/*    (auth, admin-only)
 *
 * This file will be removed after full migration to v3.
 * See: API_MIGRATION_V3.md
 */
import { ENV } from "@/config/env";

// Helper function to get API URL dynamically
export function getApiUrl(): string {
    return ENV.API_URL;
}

// Helper to get API path with version prefix
export function getApiPath(path: string, useV2 = false): string {
    const base = getApiUrl();
    const version = useV2 ? '/api/v2' : '/api';
    return `${base}${version}${path}`;
}

// Get auth token from localStorage
export function getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
}

// Base fetch wrapper with auth handling
interface FetchOptions extends RequestInit {
    skipAuth?: boolean;
    useV2?: boolean;
}

export async function apiFetch(path: string, options: FetchOptions = {}) {
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

    let url = path;
    if (!path.startsWith('http')) {
        // If path starts with /api/, allow it but prefer cleaner paths
        if (path.startsWith('/api/')) {
            url = `${getApiUrl()}${path}`;
        } else {
            // Use getApiPath helper for versioning
            // Strip leading slash if present to avoid double slash if needed?
            // getApiPath expects path starting with slash usually.
            // Let's assume input path like '/users' or 'users'.
            const cleanPath = path.startsWith('/') ? path : `/${path}`;
            url = getApiPath(cleanPath, options.useV2);
        }
    }
    const response = await fetch(url, {
        ...options,
        headers,
    });

    return response;
}
