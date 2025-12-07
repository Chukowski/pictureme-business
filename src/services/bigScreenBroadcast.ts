/**
 * BigScreen Broadcast Service
 * 
 * Enables cross-device communication for the Big Screen feature.
 * Uses backend API to store featured album so it works across different devices/browsers.
 */

import { ENV } from '@/config/env';

// Get API base URL
function getApiUrl(): string {
  return ENV.API_URL;
}

export interface FeaturedAlbum {
  album_code: string;
  event_id: number;
  user_slug: string;
  event_slug: string;
  timestamp: number;
}

/**
 * Broadcast an album to the Big Screen via API
 */
export async function broadcastToBigScreen(data: {
  albumCode: string;
  eventId: number | string;
  userSlug: string;
  eventSlug: string;
}): Promise<boolean> {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${getApiUrl()}/api/events/${data.eventId}/bigscreen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        album_code: data.albumCode,
        user_slug: data.userSlug,
        event_slug: data.eventSlug,
      }),
    });

    if (!response.ok) {
      console.error('Failed to broadcast to big screen:', response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error broadcasting to big screen:', error);
    return false;
  }
}

/**
 * Clear the featured album from Big Screen
 */
export async function clearBigScreen(eventId: number | string): Promise<boolean> {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${getApiUrl()}/api/events/${eventId}/bigscreen`, {
      method: 'DELETE',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      console.error('Failed to clear big screen:', response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error clearing big screen:', error);
    return false;
  }
}

/**
 * Get the currently featured album for an event
 */
export async function getFeaturedAlbum(eventId: number | string): Promise<FeaturedAlbum | null> {
  try {
    const response = await fetch(`${getApiUrl()}/api/events/${eventId}/bigscreen`);
    
    if (!response.ok) {
      // Silently return null for 404 (endpoint not deployed yet) or other errors
      return null;
    }

    const data = await response.json();
    return data.featured || null;
  } catch {
    // Silently fail - endpoint might not be deployed yet
    return null;
  }
}

/**
 * Hook-friendly polling function for BigScreen updates
 * Returns a cleanup function
 */
export function pollBigScreen(
  eventId: number | string,
  callback: (album: FeaturedAlbum | null) => void,
  intervalMs: number = 3000
): () => void {
  let active = true;

  const poll = async () => {
    if (!active) return;
    
    const album = await getFeaturedAlbum(eventId);
    if (active) {
      callback(album);
    }
  };

  // Initial fetch
  poll();

  // Set up polling
  const interval = setInterval(poll, intervalMs);

  // Return cleanup function
  return () => {
    active = false;
    clearInterval(interval);
  };
}
