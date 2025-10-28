/**
 * Cloud Storage Service using PostgreSQL + MinIO
 * Frontend service - communicates with backend API
 * Backend handles MinIO uploads and PostgreSQL operations
 */

export interface CloudPhoto {
  id: string;
  originalImageUrl: string;
  processedImageUrl: string;
  backgroundId: string;
  backgroundName: string;
  shareCode: string;
  createdAt: number;
  prompt: string;
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
}): Promise<CloudPhoto> {
  try {
    const response = await fetch('/api/photos/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(photo),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || 'Failed to upload to cloud');
    }
    
    const cloudPhoto = await response.json();
    console.log('☁️ Photo saved to cloud:', cloudPhoto.id);
    return cloudPhoto;
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
    const response = await fetch(`/api/photos/${shareCode}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch photo: ${response.statusText}`);
    }
    
    return await response.json();
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
    const response = await fetch('/api/photos');
    
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
    const response = await fetch(`/api/photos/${id}`, {
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

