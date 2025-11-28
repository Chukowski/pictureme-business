/**
 * Events API Service
 * Communicates with FastAPI backend for multiuser/multi-event functionality
 * Last updated: 2025-11-28 - Fixed HTTPS enforcement
 */

import { ENV } from "@/config/env";

// Helper function to get API URL dynamically with HTTPS enforcement
// This ensures window.ENV is available when the URL is needed
function getApiUrl(): string {
  // Debug: Log what we're getting
  const windowEnvUrl = typeof window !== 'undefined' && window.ENV?.VITE_API_URL;
  const envApiUrl = ENV.API_URL;
  
  console.log('🔍 [getApiUrl] window.ENV?.VITE_API_URL:', windowEnvUrl);
  console.log('🔍 [getApiUrl] ENV.API_URL:', envApiUrl);
  
  let url = envApiUrl || '';
  
  // Force HTTPS for production (non-localhost) URLs
  if (url && url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    console.warn('🔒 [eventsApi] Forcing HTTPS for API URL:', url);
    url = url.replace('http://', 'https://');
  }
  
  console.log('🔍 [getApiUrl] Final URL:', url);
  return url;
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
}

export type AspectRatio = 'auto' | '1:1' | '4:5' | '3:2' | '16:9' | '9:16';

export interface Template {
  id: string;
  name: string;
  description: string;
  images: string[]; // Background images
  elementImages?: string[]; // Element/prop images for mixing (Seedream, Imagen)
  prompt: string;
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
    imageModel?: string; // e.g., 'seedream-t2i', 'nano-banana', 'flux-realism'
    faceswapEnabled?: boolean;
    faceswapModel?: string;
    videoEnabled?: boolean;
    videoModel?: string; // e.g., 'wan-v2', 'kling-pro', 'veo-3.1'
    badgeEnabled?: boolean;
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
  console.log('   Full URL:', `${getApiUrl()}/api/events`);

  if (!token) {
    throw new Error('Not authenticated - please login again');
  }

  const response = await fetch(`${getApiUrl()}/api/events`, {
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
    const response = await fetch(`${getApiUrl()}/api/events`, {
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
  
  const response = await fetch(`${getApiUrl()}/api/albums`, {
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
  const response = await fetch(`${getApiUrl()}/api/albums/${code}`);
  if (!response.ok) throw new Error('Album not found');
  return response.json();
}

export async function getAlbumPhotos(code: string): Promise<AlbumPhoto[]> {
  const response = await fetch(`${getApiUrl()}/api/albums/${code}/photos`);
  if (!response.ok) return [];
  return response.json();
}

export async function addAlbumPhoto(code: string, photoId: string, stationType: string): Promise<AlbumPhoto> {
  const response = await fetch(`${getApiUrl()}/api/albums/${code}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photo_id: photoId, station_type: stationType })
  });
  
  if (!response.ok) throw new Error('Failed to add photo to album');
  return response.json();
}

export async function getEventAlbums(eventId: number): Promise<Album[]> {
  const token = getAuthToken();
  const response = await fetch(`${getApiUrl()}/api/albums/event/${eventId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) return [];
  return response.json();
}

export async function updateAlbumStatus(albumCode: string, status: 'in_progress' | 'completed' | 'paid' | 'archived'): Promise<void> {
  const token = getAuthToken();
  const response = await fetch(`${getApiUrl()}/api/albums/${albumCode}/status?status=${status}`, {
    method: 'PUT',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Failed to update album status');
}

export async function createAlbumCheckout(albumId: string): Promise<{ checkout_url: string }> {
  const response = await fetch(`${getApiUrl()}/api/billing/albums/${albumId}/checkout`, {
    method: 'POST'
  });
  
  if (!response.ok) throw new Error('Failed to create checkout');
  return response.json();
}
