/**
 * Events API Service
 * Communicates with FastAPI backend for multiuser/multi-event functionality
 * Last updated: 2025-11-28 - Fixed HTTPS enforcement
 */

import { ENV } from "@/config/env";
import type { BadgeTemplateConfig } from "@/components/templates/BadgeTemplateEditor";

// Helper function to get API URL dynamically
// Uses ENV.API_URL which already handles:
// - Reading from window.ENV
// - Deriving production URLs from current origin
// - Enforcing HTTPS for non-localhost URLs
function getApiUrl(): string {
  return ENV.API_URL;
}

// Helper to get API path with version prefix
function getApiPath(path: string, useV2 = false): string {
  const base = getApiUrl();
  const version = useV2 ? '/api/v2' : '/api';
  return `${base}${version}${path}`;
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  name?: string;
  slug: string;
  role?: 'individual' | 'business_pending' | 'business_starter' | 'business_eventpro' | 'business_masters' | 'superadmin';
  birth_date?: string;
  avatar_url?: string;
  cover_image_url?: string;
  bio?: string;
  social_links?: {
    x?: string;
    instagram?: string;
    youtube?: string;
    tiktok?: string;
  };
  is_public?: boolean;
  publish_to_explore?: boolean;
  tokens_remaining?: number;
  tokens_total?: number;
  subscription_tier?: string;
  // Business plan fields
  plan_id?: string;
  plan_name?: string;
  plan_started_at?: string;
  plan_renewal_date?: string;
  max_concurrent_events?: number;
}

export interface WatermarkConfig {
  enabled: boolean;
  type: "image" | "text";
  imageUrl?: string;
  text?: string;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  size: number; // Percentage of image width
  opacity: number; // 0-1
}

// Album Tracking Types
export interface AlbumStation {
  id: string;
  name: string;
  description: string;
  type: 'registration' | 'booth' | 'playground' | 'viewer';
  requiresScanner: boolean;  // true if this station must scan badge QR
  order: number;
}

export interface AlbumRules {
  maxPhotosPerAlbum: number;
  allowReEntry: boolean;
  requireStaffApproval: boolean;
  printReady: boolean;
}

export interface BadgeIntegration {
  autoGenerateBadge: boolean;
  badgeLayout: 'portrait' | 'landscape' | 'square';
  includeQR: boolean;
  includeName: boolean;
  includeDateTime: boolean;
  customFields?: string[];
  saveBadgePhotoToAlbum: boolean; // Save the AI-generated badge photo to the visitor's album
}

export interface AlbumTrackingConfig {
  enabled: boolean;
  albumType: 'individual' | 'group';
  stations: AlbumStation[];
  rules: AlbumRules;
  badgeIntegration: BadgeIntegration;
}

export interface SharingOverrides {
  enabled: boolean;
  defaultAspectRatio: 'auto' | '1:1' | '3:2' | '4:5' | '16:9' | '9:16';
  availableRatios: string[];
  shareTemplateId?: string; // ID of template/frame to apply on export
}

export interface EventConfig {
  _id: string;  // CouchDB document ID (was: id: number)
  _rev?: string;  // CouchDB revision
  user_id: string;  // Now a string (UUID from PostgreSQL, was: number)
  user_slug?: string;
  username?: string;
  user_full_name?: string;
  slug: string;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  postgres_event_id?: number;
  theme: {
    brandName?: string;
    primaryColor?: string;
    secondaryColor?: string;
    tagline?: string;
    mode?: 'light' | 'dark'; // Theme mode for the photo booth
  };
  templates: Template[];
  branding: {
    logoPath?: string;
    footerPath?: string;
    headerBackgroundColor?: string;
    footerBackgroundColor?: string;
    taglineText?: string;
    watermark?: WatermarkConfig;
  };
  settings: {
    aiModel?: string;
    imageSize?: { width: number; height: number };
    feedEnabled?: boolean;
    moderationEnabled?: boolean;
    maxPhotosPerSession?: number;
    staffAccessCode?: string;
  };
  // Album Tracking (Business: Event Pro+)
  albumTracking?: AlbumTrackingConfig;
  // Sharing Overrides (Business: Event Pro+)
  sharingOverrides?: SharingOverrides;
  // Badge Template (for Registration stations)
  badgeTemplate?: BadgeTemplateConfig;
  // Event Mode
  eventMode?: 'free' | 'lead_capture' | 'pay_per_photo' | 'pay_per_album';
  // Pricing Configuration (for paid modes)
  pricing?: {
    albumPricing?: {
      packages: Array<{
        id: string;
        name: string;
        description?: string;
        price: number;
        includesDigital: boolean;
        printQuantity?: number;
        isDefault?: boolean;
      }>;
    };
    photoPricing?: {
      digitalPrice: number;
      printPrice: number;
    };
    taxRate?: number;
    taxName?: string;
    currency: string;
    businessInfo?: {
      name: string;
      address?: string;
      taxId?: string;
      phone?: string;
      email?: string;
    };
  };
}

export type AspectRatio = 'auto' | '1:1' | '4:5' | '3:2' | '16:9' | '9:16';

export interface Template {
  id: string;
  name: string;
  description: string;
  images: string[]; // Background images
  elementImages?: string[]; // Element/prop images for mixing (Seedream, Imagen)
  prompt: string;
  negativePrompt?: string; // What to avoid in the generated image
  groupPrompt?: string; // Alternative prompt for group photos
  active: boolean;
  // Individual branding controls per template
  includeHeader?: boolean;
  campaignText?: string;
  includeBranding?: boolean; // Master toggle for all overlays
  includeTagline?: boolean; // Show tagline
  includeWatermark?: boolean; // Show watermark
  isCustomPrompt?: boolean; // Special template that allows user to write custom prompts
  
  // Aspect Ratio for generated images
  aspectRatio?: AspectRatio;
  
  // Pipeline Configuration
  pipelineConfig?: {
    imageModel?: string; // e.g., 'nano-banana', 'seedream-v4', 'flux-realism'
    groupImageModel?: string; // Separate model for group photos (optional)
    forceInstructions?: boolean; // Add extra context to help AI understand images
    seed?: number; // Seed for reproducible results (same seed = similar output)
    strength?: number; // Control how much the AI changes the image (0-1)
    steps?: number; // Number of inference steps
    faceswapEnabled?: boolean;
    faceswapModel?: string;
    videoEnabled?: boolean;
    videoModel?: string; // e.g., 'wan-v2', 'kling-pro', 'veo-3.1'
  };
  
  // Access & Monetization Overrides
  overrideEventSettings?: boolean;
  accessOverrides?: {
    leadCaptureRequired?: boolean;
    requirePayment?: boolean;
    hardWatermark?: boolean;
    disableDownloads?: boolean;
    allowFreePreview?: boolean;
  };
  
  // Station Assignment (Business: Event Pro+)
  // "all" = available at all stations, or array of specific station IDs
  stationsAssigned?: 'all' | string[];
}

export interface PhotoFeed {
  id: string;
  processed_image_url: string;
  original_image_url?: string;
  background_name: string;
  share_code: string;
  created_at: number;
  meta: any;
}

/**
 * Get event configuration by user slug and event slug
 */
export async function getEventConfig(userSlug: string, eventSlug: string): Promise<EventConfig> {
  const response = await fetch(`${getApiUrl()}/api/events/${userSlug}/${eventSlug}`);

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
  const response = await fetch(`${getApiUrl()}/api/e/${eventId}/${eventSlug}`);

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
  const response = await fetch(`${getApiUrl()}/api/events/${userSlug}/${eventSlug}/photos?limit=${limit}&offset=${offset}`);

  if (!response.ok) {
    throw new Error(`Failed to load photos: ${response.statusText}`);
  }

  const data = await response.json();
  return data.map((photo: any) => ({
    id: photo.id ?? photo._id ?? photo.share_code,
    processed_image_url: photo.processed_image_url ?? photo.processedImageUrl,
    original_image_url: photo.original_image_url ?? photo.originalImageUrl,
    background_name: photo.background_name ?? photo.backgroundName,
    share_code: photo.share_code ?? photo.shareCode,
    created_at: photo.created_at,
    meta: photo.meta ?? {},
  }));
}

/**
 * Login user
 */
export async function loginUser(username: string, password: string): Promise<{ token: string; user: User }> {
  const response = await fetch(`${getApiUrl()}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Login failed' }));
    throw new Error(error.detail || 'Invalid credentials');
  }

  const data = await response.json();

  // Store token in localStorage
  localStorage.setItem('auth_token', data.access_token);
  localStorage.setItem('current_user', JSON.stringify(data.user));

  return {
    token: data.access_token,
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
  const response = await fetch(`${getApiUrl()}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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

  // Store token in localStorage
  localStorage.setItem('auth_token', data.access_token);
  localStorage.setItem('current_user', JSON.stringify(data.user));

  return {
    token: data.access_token,
    user: data.user,
  };
}

/**
 * Get current user
 */
export function getCurrentUser(): User | null {
  // Check if auth token exists - if not, user is not logged in
  const authToken = localStorage.getItem('auth_token');
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
 * Get auth token from localStorage
 * Better Auth stores session in cookies, but we also store token in localStorage for API calls
 */
export function getAuthToken(): string | null {
  // Try auth_token first (set during login)
  const token = localStorage.getItem('auth_token');
  if (token) return token;
  
  // Try to get from Better Auth session cookie (fallback)
  // Note: This won't work for cross-origin requests due to cookie restrictions
  // The main auth mechanism should be the token stored in localStorage
  
  return null;
}

/**
 * Logout user - clears ALL auth-related data from localStorage
 */
export function logoutUser(): void {
  // Clear all auth-related keys
  localStorage.removeItem('auth_token');
  localStorage.removeItem('current_user');
  localStorage.removeItem('user'); // Better Auth user data
  localStorage.removeItem('better-auth.session_token');
  
  // Dispatch storage event for same-tab listeners (like AkitoWidget)
  window.dispatchEvent(new StorageEvent('storage', {
    key: 'user',
    oldValue: null,
    newValue: null,
  }));
  
  console.log('🚪 User logged out - all auth data cleared');
}

/**
 * Create new event
 */
export async function createEvent(eventData: {
  slug: string;
  title: string;
  description?: string;
  theme?: any;
  templates?: Template[];
  branding?: any;
  settings?: any;
  is_active?: boolean;
}): Promise<EventConfig> {
  const token = getAuthToken();

  console.log('🔐 Creating event...');
  console.log('   Token exists:', !!token);
  console.log('   API URL:', getApiUrl());
  console.log('   Full URL:', `${getApiUrl()}/api/events/`);

  if (!token) {
    throw new Error('Not authenticated - please login again');
  }

  // Note: trailing slash required to avoid 307 redirect
  const response = await fetch(`${getApiUrl()}/api/events/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(eventData),
  });

  console.log('   Response status:', response.status);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to create event' }));
    console.error('   Error:', error);
    throw new Error(error.detail || 'Failed to create event');
  }

  const result = await response.json();
  console.log('✅ Event created:', result._id);

  return result;
}

/**
 * Get all events for current user
 */
export async function getUserEvents(): Promise<EventConfig[]> {
  const token = getAuthToken();
  if (!token) {
    console.warn('No auth token found, returning empty events list');
    return []; // Return empty array instead of throwing error for new users
  }

  try {
    // Note: trailing slash required to avoid 307 redirect
    const response = await fetch(`${getApiUrl()}/api/events/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include', // Include cookies for Better Auth
    });

    if (response.status === 401) {
      console.warn('Unauthorized - token may be expired');
      return []; // Return empty instead of throwing
    }

    if (!response.ok) {
      console.error(`Failed to load events: ${response.statusText}`);
      return []; // Return empty instead of throwing
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error loading events:', error);
    return []; // Return empty on network errors
  }
}

/**
 * Update event
 */
export async function updateEvent(eventId: string, eventData: Partial<EventConfig>): Promise<EventConfig> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${getApiUrl()}/api/events/${eventId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(eventData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to update event' }));
    throw new Error(error.detail || 'Failed to update event');
  }

  return await response.json();
}

/**
 * Delete event
 */
export async function deleteEvent(eventId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${getApiUrl()}/api/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to delete event' }));
    throw new Error(error.detail || 'Failed to delete event');
  }
}

/**
 * Upload photo to event
 */
export async function uploadPhotoToEvent(
  eventId: number,
  originalImageBase64: string,
  processedImageBase64: string,
  backgroundId?: string,
  backgroundName?: string,
  prompt?: string,
  meta?: any
): Promise<{ id: string; processedImageUrl: string; shareCode: string; createdAt: number }> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${getApiUrl()}/api/photos/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      event_id: eventId,
      original_image_base64: originalImageBase64,
      processed_image_base64: processedImageBase64,
      background_id: backgroundId,
      background_name: backgroundName,
      prompt,
      meta,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail || 'Failed to upload photo');
  }

  return await response.json();
}

export const updateUser = async (data: Partial<User> & { password?: string }): Promise<User> => {
  // Try to get token from localStorage (old auth) or use credentials for Better Auth
  const token = getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add Authorization header if token exists (old auth)
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${getApiUrl()}/api/users/me`, {
    method: 'PUT',
    headers,
    credentials: 'include', // Important for Better Auth cookies
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update profile');
  }

  return response.json();
};

/**
 * Get user token statistics
 */
export async function getTokenStats(): Promise<{ current_tokens: number; tokens_total?: number; plan_tokens?: number }> {
  const token = getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${getApiUrl()}/api/tokens/stats`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch token stats');
  }

  return response.json();
}

// Organization Types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_user_id: number;
  plan: string;
  created_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: number;
  role: 'owner' | 'admin' | 'staff';
  status: 'active' | 'invited' | 'removed';
  created_at: string;
}

// Album Types (Backend)
export interface Album {
  id: string;
  event_id: number;
  organization_id?: string;
  code: string;
  status: 'in_progress' | 'completed' | 'paid' | 'archived';
  payment_status: 'unpaid' | 'processing' | 'paid';
  owner_name?: string;
  owner_email?: string;
  created_at: string;
  photo_count?: number;
}

export interface AlbumPhoto {
  id: string;
  album_id: string;
  photo_id: string;
  station_type: string;
  created_at: string;
}

// Organization API
export async function getUserOrganizations(): Promise<Organization[]> {
  const token = getAuthToken();
  if (!token) return [];
  
  const response = await fetch(`${getApiUrl()}/api/organizations/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error('Failed to fetch organizations');
  return response.json();
}

export async function getOrganizationMembers(orgId: string): Promise<OrganizationMember[]> {
  const token = getAuthToken();
  const response = await fetch(`${getApiUrl()}/api/organizations/${orgId}/members`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}

export async function inviteMember(orgId: string, email: string, role: string = 'staff'): Promise<void> {
  const token = getAuthToken();
  const response = await fetch(`${getApiUrl()}/api/organizations/${orgId}/invite`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify({ email, role })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to invite member');
  }
}

// Album API
export async function createAlbum(eventId: number, orgId?: string, ownerName?: string, ownerEmail?: string): Promise<Album> {
  // Can be public or authenticated
  const token = getAuthToken();
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  // Validate eventId
  if (!eventId || eventId <= 0) {
    throw new Error('Invalid event ID');
  }
  
  // Use v2 endpoint
  const response = await fetch(getApiPath('/albums', true), {
    method: 'POST',
    headers,
    body: JSON.stringify({ 
      event_id: eventId, 
      organization_id: orgId,
      owner_name: ownerName,
      owner_email: ownerEmail
    })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to create album' }));
    console.error('Create album error:', error);
    throw new Error(error.detail || 'Failed to create album');
  }
  return response.json();
}

export async function getAlbum(code: string): Promise<Album> {
  const response = await fetch(getApiPath(`/albums/${code}`, true));
  if (!response.ok) throw new Error('Album not found');
  return response.json();
}

export async function getAlbumPhotos(code: string): Promise<AlbumPhoto[]> {
  const response = await fetch(getApiPath(`/albums/${code}/photos`, true));
  if (!response.ok) return [];
  const data = await response.json();
  // Ensure we always return an array, even if backend returns null
  return Array.isArray(data) ? data : [];
}

export async function addAlbumPhoto(code: string, photoId: string, stationType: string): Promise<AlbumPhoto> {
  const response = await fetch(getApiPath(`/albums/${code}/photos`, true), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photo_id: photoId, station_type: stationType })
  });
  
  if (!response.ok) throw new Error('Failed to add photo to album');
  return response.json();
}

export async function deleteAlbumPhoto(albumCode: string, photoId: string, staffPin?: string): Promise<void> {
  const token = getAuthToken();
  
  // Build URL with optional PIN parameter
  let url = getApiPath(`/albums/${albumCode}/photos/${photoId}`, true);
  if (staffPin) {
    url += `?pin=${encodeURIComponent(staffPin)}`;
  }
  
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Delete photo failed:', response.status, errorText);
    const error = JSON.parse(errorText || '{}');
    throw new Error(error.detail || error.error || 'Failed to delete photo');
  }
}

/**
 * Delete an entire album and all its photos
 * @param albumCode - The album code to delete
 * @param staffPin - Optional staff PIN for non-authenticated staff access
 */
export async function deleteAlbum(albumCode: string, staffPin?: string): Promise<{ photosDeleted: number }> {
  const token = getAuthToken();
  
  // Build URL with optional PIN parameter
  let url = getApiPath(`/albums/${albumCode}`, true);
  if (staffPin) {
    url += `?pin=${encodeURIComponent(staffPin)}`;
  }
  
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to delete album' }));
    throw new Error(error.detail || 'Failed to delete album');
  }
  
  const result = await response.json();
  return { photosDeleted: result.photos_deleted || 0 };
}

/**
 * Track album photo download for analytics (print/sales tracking)
 * @param albumCode - The album code
 * @param photoCount - Number of photos downloaded (1 for single, N for all)
 * @param downloadType - 'zip' for all photos, 'single' for individual photo
 */
export async function trackAlbumDownload(
  albumCode: string, 
  photoCount: number, 
  downloadType: 'zip' | 'single' | 'print'
): Promise<void> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    await fetch(getApiPath(`/albums/${albumCode}/track-download`, true), {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        photo_count: photoCount, 
        download_type: downloadType 
      })
    });
    // Fire and forget - don't block on analytics
  } catch (error) {
    console.warn('Failed to track download:', error);
  }
}

export async function getEventAlbums(eventId: number): Promise<Album[]> {
  const token = getAuthToken();
  const response = await fetch(getApiPath(`/albums/event/${eventId}`, true), {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get event albums using staff PIN (no auth required)
 * Used by Staff Dashboard when accessed via direct link
 */
export async function getEventAlbumsWithPin(eventId: number, pin: string): Promise<Album[]> {
  const response = await fetch(`${getApiUrl()}/api/albums/event/${eventId}/staff?pin=${encodeURIComponent(pin)}`);
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Invalid staff PIN');
    }
    return [];
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export interface EventAlbumStats {
  totalAlbums: number;
  completedAlbums: number;
  inProgressAlbums: number;
  paidAlbums: number;
  totalPhotos: number;
  pendingApproval: number;
}

export async function getEventAlbumStats(eventId: number): Promise<EventAlbumStats> {
  const token = getAuthToken();
  const response = await fetch(`${getApiUrl()}/api/albums/event/${eventId}/stats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) {
    return {
      totalAlbums: 0,
      completedAlbums: 0,
      inProgressAlbums: 0,
      paidAlbums: 0,
      totalPhotos: 0,
      pendingApproval: 0
    };
  }
  return response.json();
}

export async function updateAlbumStatus(albumCode: string, status: 'in_progress' | 'completed' | 'paid' | 'archived'): Promise<void> {
  const token = getAuthToken();
  const response = await fetch(getApiPath(`/albums/${albumCode}/status?status=${status}`, true), {
    method: 'PUT',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Failed to update album status');
}

export async function createAlbumCheckout(albumCode: string): Promise<{ checkout_url: string }> {
  const response = await fetch(`${getApiUrl()}/api/billing/albums/${albumCode}/checkout/`, {
    method: 'POST'
  });
  
  if (!response.ok) throw new Error('Failed to create checkout');
  return response.json();
}

export async function requestAlbumPayment(albumCode: string): Promise<{ status: string; message: string }> {
  const response = await fetch(`${getApiUrl()}/api/albums/${albumCode}/request-payment`, {
    method: 'POST'
  });
  
  if (!response.ok) throw new Error('Failed to request payment');
  return response.json();
}

export async function requestBigScreen(albumCode: string): Promise<{ status: string; message: string }> {
  const response = await fetch(`${getApiUrl()}/api/albums/${albumCode}/request-bigscreen`, {
    method: 'POST'
  });
  
  if (!response.ok) throw new Error('Failed to request big screen');
  return response.json();
}

export interface PaymentRequest {
  id: string;
  code: string;
  owner_name?: string;
  owner_email?: string;
  status: string;
  payment_status: string;
  created_at: string;
  photo_count: number;
}

export async function getPaymentRequests(eventId: number): Promise<PaymentRequest[]> {
  const token = getAuthToken();
  const response = await fetch(`${getApiUrl()}/api/albums/event/${eventId}/payment-requests/`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) return [];
  return response.json();
}

// ==================== Email API ====================

export interface EmailStatus {
  configured: boolean;
  message: string;
}

/**
 * Check if email service is configured
 */
export async function getEmailStatus(): Promise<EmailStatus> {
  const response = await fetch(`${getApiUrl()}/api/email/status`);
  if (!response.ok) {
    return { configured: false, message: 'Email service unavailable' };
  }
  return response.json();
}

/**
 * Send a photo share email
 */
export async function sendPhotoEmail(
  toEmail: string,
  photoUrl: string,
  shareUrl: string,
  eventName?: string,
  brandName?: string,
  primaryColor?: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${getApiUrl()}/api/email/send/photo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to_email: toEmail,
      photo_url: photoUrl,
      share_url: shareUrl,
      event_name: eventName,
      brand_name: brandName,
      primary_color: primaryColor,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to send email' }));
    throw new Error(error.detail || 'Failed to send email');
  }
  return response.json();
}

/**
 * Send an album share email
 */
export async function sendAlbumEmail(
  toEmail: string,
  albumUrl: string,
  eventName: string,
  visitorName?: string,
  brandName?: string,
  primaryColor?: string,
  photosCount?: number,
  eventLogoUrl?: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${getApiUrl()}/api/email/send/album`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to_email: toEmail,
      album_url: albumUrl,
      event_name: eventName,
      visitor_name: visitorName,
      brand_name: brandName,
      primary_color: primaryColor,
      photos_count: photosCount,
      event_logo_url: eventLogoUrl,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to send email' }));
    throw new Error(error.detail || 'Failed to send email');
  }
  return response.json();
}

/**
 * Send album email by album code (uses stored email from album record)
 */
export async function sendAlbumEmailByCode(
  albumCode: string,
  eventName: string,
  baseUrl: string,
  brandName?: string,
  primaryColor?: string
): Promise<{ success: boolean; message: string }> {
  const params = new URLSearchParams({
    event_name: eventName,
    base_url: baseUrl,
  });
  if (brandName) params.append('brand_name', brandName);
  if (primaryColor) params.append('primary_color', primaryColor);
  
  const response = await fetch(`${getApiUrl()}/api/email/send/album/${albumCode}?${params}`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to send email' }));
    throw new Error(error.detail || 'Failed to send email');
  }
  return response.json();
}

/**
 * Send bulk emails to all albums in an event
 */
export async function sendBulkAlbumEmails(
  eventId: number,
  baseUrl: string,
  brandName?: string,
  primaryColor?: string
): Promise<{ sent: number; failed: number; skipped: number; message: string }> {
  const token = getAuthToken();
  const response = await fetch(`${getApiUrl()}/api/email/send/bulk-albums`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
    body: JSON.stringify({
      event_id: eventId,
      base_url: baseUrl,
      brand_name: brandName,
      primary_color: primaryColor,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to send emails' }));
    throw new Error(error.detail || 'Failed to send emails');
  }
  return response.json();
}

/**
 * Send a test email to verify configuration
 */
export async function sendTestEmail(toEmail: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${getApiUrl()}/api/email/test?to_email=${encodeURIComponent(toEmail)}`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Email test failed' }));
    throw new Error(error.detail || 'Email test failed');
  }
  return response.json();
}

// ========== Album Transaction APIs (POS/Sales) ==========

export interface AlbumTransaction {
  id: string;
  album_id?: string;
  event_id: number;
  package_id?: string;
  package_name?: string;
  item_count: number;
  amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  payment_method?: string;
  status: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  invoice_number?: string;
  invoice_generated: boolean;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  album_code?: string;
  visitor_name?: string;
}

export interface TransactionSummary {
  total_revenue: number;
  total_tax: number;
  transaction_count: number;
  paid_albums_count: number;
  today_revenue: number;
  today_transactions: number;
}

export interface CreateTransactionRequest {
  album_code: string;
  package_id?: string;
  package_name: string;
  item_count: number;
  amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  payment_method: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  generate_invoice: boolean;
  notes?: string;
}

/**
 * Create a POS transaction (Charge POS)
 */
export async function createTransaction(
  eventId: number,
  data: CreateTransactionRequest
): Promise<{ success: boolean; transaction: AlbumTransaction }> {
  const token = getAuthToken();
  if (!token) throw new Error('Not authenticated');
  
  const response = await fetch(getApiPath(`/events/${eventId}/transactions`, true), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create transaction' }));
    throw new Error(error.error || 'Failed to create transaction');
  }
  return response.json();
}

/**
 * Get all transactions for an event
 */
export async function getEventTransactions(
  eventId: number,
  filters?: { status?: string; from?: string; to?: string }
): Promise<{ transactions: AlbumTransaction[] }> {
  const token = getAuthToken();
  if (!token) throw new Error('Not authenticated');
  
  let url = getApiPath(`/events/${eventId}/transactions`, true);
  if (filters) {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (params.toString()) url += `?${params}`;
  }
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch transactions');
  }
  return response.json();
}

/**
 * Get transaction summary for an event
 */
export async function getTransactionSummary(eventId: number): Promise<TransactionSummary> {
  const token = getAuthToken();
  if (!token) throw new Error('Not authenticated');
  
  const response = await fetch(getApiPath(`/events/${eventId}/transactions/summary`, true), {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch transaction summary');
  }
  return response.json();
}

/**
 * Get a specific transaction (for invoice)
 */
export async function getTransaction(transactionId: string): Promise<AlbumTransaction> {
  const token = getAuthToken();
  if (!token) throw new Error('Not authenticated');
  
  const response = await fetch(getApiPath(`/transactions/${transactionId}`, true), {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch transaction');
  }
  return response.json();
}
