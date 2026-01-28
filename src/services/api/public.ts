/**
 * Public API Service
 * Handles public-facing functionality: Profiles, Feed, Username checks
 */
import { apiFetch, getAuthToken } from './client';
import { PublicProfileResponse } from './types';

// Check if username is available
export async function checkUsernameAvailability(username: string): Promise<{ available: boolean; message: string }> {
    try {
        const response = await apiFetch(`/users/check-username/${encodeURIComponent(username)}`, {
            method: 'GET',
        });

        if (!response.ok) {
            throw new Error('Failed to check username');
        }

        return await response.json();
    } catch (error) {
        console.error('Error checking username:', error);
        return { available: false, message: 'Wait a moment...' };
    }
}

export async function getPublicUserProfile(usernameOrSlug: string): Promise<PublicProfileResponse | null> {
    try {
        const response = await apiFetch(`/users/profile/${usernameOrSlug}`, { skipAuth: true });
        if (!response.ok) return null;
        const data = await response.json();
        return data; // Return full response { profile, creations }
    } catch (error) {
        console.error("Failed to fetch public profile:", error);
        return null;
    }
}

/**
 * Toggle like on a creation
 */
export async function toggleLike(creationId: number): Promise<{ success: boolean; likes: number; liked: boolean }> {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication required');

    const response = await apiFetch(`/creations/${creationId}/like`, {
        method: 'POST',
    });

    if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to toggle like');
    }

    return response.json();
}
