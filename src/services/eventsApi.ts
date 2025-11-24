/**
 * Events API Service
 * Communicates with FastAPI backend for multiuser/multi-event functionality
 * Last updated: 2025-11-02 13:00 - Fixed proxy routing
 */

import { ENV } from "@/config/env";

// Use empty string to use Vite proxy (configured in vite.config.ts)
// This will route /api/* to http://localhost:3001/api/*
const API_URL = ENV.API_URL || '';

// Verify API_URL is correct
if (API_URL && API_URL.includes('localhost:3001')) {
  console.error('❌ ERROR: API_URL should be empty to use proxy, but got:', API_URL);
  console.error('   Please clear browser cache and reload');
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  slug: string;
  role?: 'individual' | 'business_pending' | 'business_eventpro' | 'business_masters' | 'superadmin';
  birth_date?: string;
  avatar_url?: string;
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
  };
}

export interface Template {
  id: string;
  name: string;
  description: string;
  images: string[];
  prompt: string;
  active: boolean;
  // Individual branding controls per template
  includeHeader?: boolean;
  campaignText?: string;
  includeBranding?: boolean; // Master toggle for all overlays
  includeTagline?: boolean; // Show tagline
  includeWatermark?: boolean; // Show watermark
  isCustomPrompt?: boolean; // Special template that allows user to write custom prompts
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
  const response = await fetch(`${API_URL}/api/events/${userSlug}/${eventSlug}`);

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
  const response = await fetch(`${API_URL}/api/events/${userSlug}/${eventSlug}/photos?limit=${limit}&offset=${offset}`);

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
  const response = await fetch(`${API_URL}/api/auth/login`, {
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
  const response = await fetch(`${API_URL}/api/auth/register`, {
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
 * Get auth token
 */
export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

/**
 * Logout user
 */
export function logoutUser(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('current_user');
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
  console.log('   API URL:', API_URL);
  console.log('   Full URL:', `${API_URL}/api/events`);

  if (!token) {
    throw new Error('Not authenticated - please login again');
  }

  const response = await fetch(`${API_URL}/api/events`, {
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
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/api/events`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load events: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Update event
 */
export async function updateEvent(eventId: string, eventData: Partial<EventConfig>): Promise<EventConfig> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/api/events/${eventId}`, {
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

  const response = await fetch(`${API_URL}/api/events/${eventId}`, {
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

  const response = await fetch(`${API_URL}/api/photos/upload`, {
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
  
  const response = await fetch(`${API_URL}/api/users/me`, {
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
