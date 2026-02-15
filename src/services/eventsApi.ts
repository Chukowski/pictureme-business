/**
 * Events API Service (LEGACY)
 * Handles event configuration and photo feeds
 *
 * @deprecated Migrate to publicClient.ts for public event endpoints.
 * See: API_MIGRATION_V3.md
 */

// Import shared types
import { EventConfig, User, UserCreation, PhotoFeed } from './api/types';
export * from './api/types';

import { ENV } from "@/config/env";
import type { BadgeTemplateConfig } from "@/components/templates/BadgeTemplateEditor";


// Helper function to get API URL dynamically
// Uses ENV.API_URL which already handles:
// - Reading from window.ENV
// - Deriving production URLs from current origin
// - Enforcing HTTPS for non-localhost URLs
export { getApiUrl } from './api/client';


// Helper to get API path with version prefix
function getApiPath(path: string, useV2 = false): string {
  const base = getApiUrl();
  const version = useV2 ? '/api/v2' : '/api';
  return `${base}${version}${path}`;
}

// Import base helpers for local use
import { getApiUrl, getAuthToken, apiFetch } from './api/client';
import { logoutUser } from './api/auth';


export { checkUsernameAvailability, getPublicUserProfile, toggleLike } from './api/public';


// Export all shared types
export * from './api/types';


/**
 * Get event configuration by user slug and event slug
 */
export async function getEventConfig(userSlug: string, eventSlug: string): Promise<EventConfig> {
  const response = await apiFetch(`/events/${userSlug}/${eventSlug}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Event not found');
    }
    throw new Error(`Failed to load event: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.postgres_event_id !== undefined) {
    data.postgres_event_id = Number(data.postgres_event_id);
  }
  return data;
}

/**
 * Get event configuration by event ID (short URL format)
 * URL format: /e/:eventId/:eventSlug
 */
export async function getEventConfigById(eventId: number, eventSlug: string): Promise<EventConfig> {
  const response = await apiFetch(`/e/${eventId}/${eventSlug}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Event not found');
    }
    throw new Error(`Failed to load event: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.postgres_event_id !== undefined) {
    data.postgres_event_id = Number(data.postgres_event_id);
  }
  return data;
}

/**
 * Get photos for event feed
 */
export async function getEventPhotos(userSlug: string, eventSlug: string, limit: number = 20, offset: number = 0): Promise<PhotoFeed[]> {
  const response = await apiFetch(`/events/${userSlug}/${eventSlug}/photos?limit=${limit}&offset=${offset}`);

  if (!response.ok) {
    throw new Error(`Failed to load photos: ${response.statusText}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) return [];

  return data.map((photo: any) => ({
    id: photo.id ?? photo._id ?? photo.share_code,
    processed_image_url: photo.processed_image_url ?? photo.processedImageUrl,
    original_image_url: photo.original_image_url ?? photo.originalImageUrl,
    background_name: photo.background_name ?? photo.backgroundName,
    share_code: photo.share_code ?? photo.shareCode,
    created_at: photo.created_at,
    is_adult: photo.is_adult ?? photo.meta?.is_adult,
    meta: photo.meta ?? {},
  }));
}

export { loginUser, registerUser, getCurrentUser, getCurrentUserProfile, logoutUser } from './api/auth';

/**
 * Get auth token from localStorage
 * Better Auth stores session in cookies, but we also store token in localStorage for API calls
 */
export { getAuthToken } from './api/client';


/**
 * Create new event
 */


/**
 * Get all events for current user
 */


/**
 * Update event
 */


/**
 * Delete event
 */


/**
 * Upload photo to event
 */


/**
 * Get public event configuration (Alias for getEventConfig)
 */
export const getPublicEvent = getEventConfig;

// Re-export updateUser from auth
export { updateUser } from './api/auth';

/**
 * Toggle like on a creation
 */


/**
 * Get user token statistics
 */






export {
  getUserOrganizations, getOrganizationMembers, inviteMember,
  getEmailStatus, sendPhotoEmail, sendAlbumEmail, sendAlbumEmailByCode, sendBulkAlbumEmails, sendTestEmail,
  createTransaction, getEventTransactions, getTransactionSummary, getTransaction,
  updateBoothPhotoVisibility, getBoothPhotos,
  trackAlbumDownload, getEventAlbums, getEventAlbumsWithPin, getEventAlbumStats, updateAlbumStatus,
  createAlbumCheckout, requestAlbumPayment, requestBigScreen, getPaymentRequests,
  createEvent, getUserEvents, updateEvent, deleteEvent, uploadPhotoToEvent, getTokenStats,
  createAlbum, getAlbum, getAlbumPhotos, addAlbumPhoto, deleteAlbumPhoto, deleteAlbum,
  createBooth, getUserBooths
} from './api/business';


