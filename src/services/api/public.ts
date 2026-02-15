/**
 * Public API Service
 * Handles public-facing functionality: Profiles, Feed, Username checks
 *
 * Uses v3 domain clients:
 *   - publicFetch  → /api/v3/public/* (profiles, username checks)
 *   - sharedFetch  → /api/v3/shared/* (like creation - requires auth)
 */
import { publicFetch, getAuthToken } from './publicClient';
import { sharedFetch } from './sharedClient';
import { PublicProfileResponse } from './types';

// Check if username is available
export async function checkUsernameAvailability(username: string): Promise<{ available: boolean; message: string }> {
    try {
        const response = await publicFetch(`/users/check-username/${encodeURIComponent(username)}`);

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
        const response = await publicFetch(`/users/profile/${usernameOrSlug}`);
        if (!response.ok) return null;
        const data = await response.json();
        return data;
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

    const response = await sharedFetch(`/creations/${creationId}/like`, {
        method: 'POST',
    });

    if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to toggle like');
    }

    return response.json();
}
