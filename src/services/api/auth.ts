/**
 * Auth API Service
 * Handles login, registration, and user session management
 *
 * Uses v3 domain clients:
 *   - publicFetch  → /api/v3/public/auth/*  (login, register, session)
 *   - sharedFetch  → /api/v3/shared/*       (user profile, password)
 */
import { publicFetch, getAuthToken } from './publicClient';
import { sharedFetch } from './sharedClient';
import { User } from './types';

// Re-export for backward compatibility
export { getAuthToken };

/**
 * Login user
 */
export async function loginUser(username: string, password: string): Promise<{ token: string; user: User }> {
    const response = await publicFetch('/auth/login', {
        method: 'POST',
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
    const response = await publicFetch('/auth/register', {
        method: 'POST',
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
        const response = await sharedFetch('/users/me');

        if (response.status === 401) {
            logoutUser();
            return null;
        }

        if (!response.ok) {
            return null;
        }

        const userData = await response.json();

        // Update local storage if valid
        if (userData && userData.id) {
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
    const response = await sharedFetch('/users/me', {
        method: 'PUT',
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update profile');
    }

    return response.json();
};
