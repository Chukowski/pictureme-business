/**
 * Auth API Service
 * Handles login, registration, and user session management
 */
import { apiFetch, getAuthToken } from './client';
import { User } from './types';

/**
 * Login user
 */
export async function loginUser(username: string, password: string): Promise<{ token: string; user: User }> {
    const response = await apiFetch('/auth/login', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Login failed' }));
        throw new Error(error.detail || 'Invalid credentials');
    }

    const data = await response.json();
    const token = data.token || data.access_token;

    // Store token in localStorage
    localStorage.setItem('auth_token', token);
    localStorage.setItem('current_user', JSON.stringify(data.user));

    return {
        token: token,
        user: data.user,
    };
}

/**
 * Register new user
 */
export async function registerUser(
    username: string,
    email: string,
    password: string,
    fullName?: string
): Promise<{ token: string; user: User }> {
    const response = await apiFetch('/auth/register', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({
            username,
            email,
            password,
            full_name: fullName,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Registration failed' }));
        throw new Error(error.detail || 'Registration failed');
    }

    const data = await response.json();
    const token = data.token || data.access_token;

    // Store token in localStorage
    localStorage.setItem('auth_token', token);
    localStorage.setItem('current_user', JSON.stringify(data.user));

    return {
        token: token,
        user: data.user,
    };
}

/**
 * Get current user from storage
 */
export function getCurrentUser(): User | null {
    // Check if auth token exists - if not, user is not logged in
    const authToken = getAuthToken();
    if (!authToken) {
        return null;
    }

    // Try Better Auth user first
    const betterAuthUser = localStorage.getItem('user');
    if (betterAuthUser) {
        try {
            return JSON.parse(betterAuthUser);
        } catch (e) {
            console.error('Failed to parse Better Auth user', e);
        }
    }

    // Fallback to old auth
    const userStr = localStorage.getItem('current_user');
    if (!userStr) return null;

    try {
        return JSON.parse(userStr);
    } catch {
        return null;
    }
}

/**
 * Fetch fresh user profile from backend
 * Useful for updating subscription status/tokens without relogin
 */
export async function getCurrentUserProfile(): Promise<User | null> {
    try {
        const response = await apiFetch('/users/me');

        if (response.status === 401) {
            logoutUser();
            return null;
        }

        if (!response.ok) {
            // If 404/401, maybe token is invalid, but let caller handle
            return null;
        }

        const userData = await response.json();

        // Update local storage if valid
        if (userData && userData.id) {
            // Merge with existing user to keep any local-only flags if any? 
            // Actually safer to overwrite if backend is truth
            localStorage.setItem('user', JSON.stringify(userData));
        }

        return userData;
    } catch (error) {
        console.error("Failed to fetch user profile", error);
        return null;
    }
}

export function logoutUser(): void {
    // Clear all storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    localStorage.removeItem('user'); // Better Auth user data
    localStorage.removeItem('better-auth.session_token');

    // Dispatch storage event for same-tab listeners (like AssistantWidget)
    window.dispatchEvent(new StorageEvent('storage', {
        key: 'user',
        oldValue: null,
        newValue: null,
    }));

    console.log('🚪 User logged out - all auth data cleared');

    // Hard redirect to clear any sensitive state and go to landing
    if (typeof window !== 'undefined') {
        window.location.href = '/?logout=success';
    }
}

export const updateUser = async (data: Partial<User> & { password?: string }): Promise<User> => {
    // Try to get token from localStorage (old auth) or use credentials for Better Auth
    const token = getAuthToken();

    const headers: HeadersInit = {};

    // Add Authorization header if token exists (old auth)
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await apiFetch('/users/me', {
        method: 'PUT',
        headers, // apiFetch does not automatically add 'Authorization' if skipAuth is not true? Wait, apiFetch ADDS it if not skipAuth.
        // But apiFetch assumes 'application/json' by default.
        // Let's rely on apiFetch's default behavior for token if we don't pass anything, but here we might want to be explicit?
        // Actually, apiFetch handles tokens. 'credentials: include' is default in apiFetch?
        // Let's check apiFetch default.
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update profile');
    }

    return response.json();
};
