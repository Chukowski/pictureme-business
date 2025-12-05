/**
 * Cloud Storage Service using PostgreSQL + MinIO
 * Frontend service - communicates with backend API
 * Backend handles MinIO uploads and PostgreSQL operations
 */

import { ENV } from '@/config/env';

// Helper to get API URL dynamically with HTTPS enforcement
function getApiUrl(): string {
  let url = ENV.API_URL || '';
  
  // Force HTTPS for production (non-localhost) URLs
  if (url && url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    url = url.replace('http://', 'https://');
  }
  
  return url;
}

export interface CloudPhoto {
  id: string;
  originalImageUrl: string;
  processedImageUrl: string;
  backgroundId?: string;
  backgroundName?: string;
  shareCode: string;
  createdAt: number;
  prompt?: string;
  userSlug?: string;
  eventSlug?: string;
}

/**
 * Save a processed photo to cloud storage via backend API
 * Backend will handle MinIO upload and PostgreSQL storage
 */
export async function savePhotoToCloud(photo: {
  originalImageBase64: string;
  processedImageBase64: string;
  backgroundId: string;
  backgroundName: string;
  prompt: string;
  userSlug?: string;
  eventSlug?: string;
}): Promise<CloudPhoto> {
  try {
    // Note: trailing slash required to avoid 307 redirect
    const uploadUrl = `${getApiUrl()}/api/photos/upload/public/`;
    console.log('☁️ Uploading to:', uploadUrl);
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        originalImageBase64: photo.originalImageBase64,
        processedImageBase64: photo.processedImageBase64,
        backgroundId: photo.backgroundId,
        backgroundName: photo.backgroundName,
        prompt: photo.prompt,
        userSlug: photo.userSlug,
        eventSlug: photo.eventSlug,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('☁️ Upload failed:', response.status, errorText);
      const error = JSON.parse(errorText).catch?.(() => ({ detail: response.statusText })) || { detail: errorText };
      throw new Error(error.detail || error.error || `Upload failed: ${response.status} ${errorText}`);
    }
    
    const cloudPhoto = await response.json();
    console.log('☁️ Photo saved to cloud:', cloudPhoto.id);
    const createdAtValue = typeof cloudPhoto.createdAt === 'number'
      ? cloudPhoto.createdAt
      : Number(cloudPhoto.createdAt);
    return {
      id: cloudPhoto.id,
      originalImageUrl: cloudPhoto.originalImageUrl,
      processedImageUrl: cloudPhoto.processedImageUrl,
      backgroundId: cloudPhoto.backgroundId ?? photo.backgroundId,
      backgroundName: cloudPhoto.backgroundName ?? photo.backgroundName,
      shareCode: cloudPhoto.shareCode,
      createdAt: Number.isFinite(createdAtValue) ? createdAtValue : Date.now(),
      prompt: cloudPhoto.prompt ?? photo.prompt,
      userSlug: cloudPhoto.userSlug ?? photo.userSlug,
      eventSlug: cloudPhoto.eventSlug ?? photo.eventSlug,
    } as CloudPhoto;
  } catch (error) {
    console.error('Failed to save to cloud storage:', error);
    throw error;
  }
}

/**
 * Get photo by share code from PostgreSQL
 */
export async function getPhotoByShareCode(shareCode: string): Promise<CloudPhoto | null> {
  try {
    const response = await fetch(`${getApiUrl()}/api/photos/${shareCode}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch photo: ${response.statusText}`);
    }

    const data = await response.json();
    const createdAtValue = typeof data.createdAt === 'number'
      ? data.createdAt
      : Number(data.createdAt);
    return {
      id: data.id,
      originalImageUrl: data.originalImageUrl,
      processedImageUrl: data.processedImageUrl,
      backgroundName: data.backgroundName,
      shareCode: data.shareCode,
      createdAt: Number.isFinite(createdAtValue) ? createdAtValue : Date.now(),
      backgroundId: data.backgroundId,
      prompt: data.prompt,
      userSlug: data.userSlug,
      eventSlug: data.eventSlug,
    } as CloudPhoto;
  } catch (error) {
    console.error('Failed to fetch from cloud:', error);
    return null;
  }
}

/**
 * Get all photos from PostgreSQL
 */
export async function getAllPhotosFromCloud(): Promise<CloudPhoto[]> {
  try {
    const response = await fetch(`${getApiUrl()}/api/photos`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch photos: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch from cloud:', error);
    return [];
  }
}

/**
 * Delete photo from cloud (MinIO + PostgreSQL)
 */
export async function deletePhotoFromCloud(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${getApiUrl()}/api/photos/${id}`, {
      method: 'DELETE',
    });
    
    return response.ok;
  } catch (error) {
    console.error('Failed to delete from cloud:', error);
    return false;
  }
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `photo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a 6-character share code
 */
function generateShareCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Get the share URL for a photo
 */
export function getCloudShareUrl(shareCode: string): string {
  const baseUrl = import.meta.env.VITE_BASE_URL || window.location.origin;
  return `${baseUrl}/share/${shareCode}`;
}

