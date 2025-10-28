/**
 * Storage Service for Photo Booth
 * Primary: PostgreSQL + MinIO (cloud storage)
 * Fallback: Browser localStorage
 */

import { savePhotoToCloud, getPhotoByShareCode as getCloudPhoto, getAllPhotosFromCloud, deletePhotoFromCloud } from './cloudStorage';

export interface ProcessedPhoto {
  id: string;
  originalImageBase64?: string; // Optional for cloud photos (use URL instead)
  processedImageBase64?: string; // Optional for cloud photos (use URL instead)
  originalImageUrl?: string; // Cloud URL
  processedImageUrl?: string; // Cloud URL
  backgroundId: string;
  backgroundName: string;
  shareCode: string;
  createdAt: number;
  prompt: string;
}

const STORAGE_KEY = "photobooth_photos";
const MAX_PHOTOS = 10; // Reduced limit to prevent localStorage overflow with large branded images
const COMPRESSION_QUALITY = 0.8; // JPEG compression quality (0.0 - 1.0)

/**
 * Compress a base64 image to reduce storage size
 */
async function compressImage(base64: string, quality: number = COMPRESSION_QUALITY): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedBase64);
    };
    
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = base64;
  });
}

/**
 * Save a processed photo (tries cloud storage first, falls back to localStorage)
 */
export async function saveProcessedPhoto(photo: Omit<ProcessedPhoto, "id" | "createdAt" | "shareCode">): Promise<ProcessedPhoto> {
  // Try cloud storage first
  try {
    if (photo.originalImageBase64 && photo.processedImageBase64) {
      console.log("☁️ Attempting to save to cloud storage...");
      const cloudPhoto = await savePhotoToCloud({
        originalImageBase64: photo.originalImageBase64,
        processedImageBase64: photo.processedImageBase64,
        backgroundId: photo.backgroundId,
        backgroundName: photo.backgroundName,
        prompt: photo.prompt,
      });
      
      console.log("✅ Photo saved to cloud storage:", cloudPhoto.id);
      return cloudPhoto;
    }
  } catch (cloudError) {
    console.warn("⚠️ Cloud storage failed, falling back to localStorage:", cloudError);
  }
  
  // Fallback to localStorage
  const photos = getAllPhotos();
  
  const newPhoto: ProcessedPhoto = {
    ...photo,
    id: generateId(),
    shareCode: generateShareCode(),
    createdAt: Date.now(),
  };

  photos.unshift(newPhoto);

  // Keep only the latest MAX_PHOTOS
  let limitedPhotos = photos.slice(0, MAX_PHOTOS);
  
  try {
    // Try to save with compression
    const compressedPhoto = {
      ...newPhoto,
      processedImageBase64: newPhoto.processedImageBase64 ? await compressImage(newPhoto.processedImageBase64, COMPRESSION_QUALITY) : undefined,
      originalImageBase64: newPhoto.originalImageBase64 ? await compressImage(newPhoto.originalImageBase64, COMPRESSION_QUALITY) : undefined,
    };
    
    const compressedPhotos = [compressedPhoto, ...limitedPhotos.slice(1)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(compressedPhotos));
    console.log("💾 Photo saved to localStorage (compressed):", compressedPhoto.id);
    return compressedPhoto;
  } catch (error) {
    console.error("❌ Failed to save photo:", error);
    
    // If still fails, try with fewer photos
    try {
      const reducedPhotos = photos.slice(0, 5); // Keep only 5 most recent
      const compressedPhoto = {
        ...newPhoto,
        processedImageBase64: newPhoto.processedImageBase64 ? await compressImage(newPhoto.processedImageBase64, 0.6) : undefined,
        originalImageBase64: newPhoto.originalImageBase64 ? await compressImage(newPhoto.originalImageBase64, 0.6) : undefined,
      };
      
      const finalPhotos = [compressedPhoto, ...reducedPhotos.slice(1)];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(finalPhotos));
      console.warn("⚠️ Saved with reduced storage (5 photos max, higher compression)");
      return compressedPhoto;
    } catch (finalError) {
      console.error("❌ Failed to save even with reduced storage:", finalError);
      throw new Error("Storage limit reached. Unable to save photo. Please clear some old photos.");
    }
  }
}

/**
 * Get a photo by ID
 */
export function getPhotoById(id: string): ProcessedPhoto | null {
  const photos = getAllPhotos();
  return photos.find(photo => photo.id === id) || null;
}

/**
 * Get a photo by share code (tries cloud first, then localStorage)
 */
export async function getPhotoByShareCode(shareCode: string): Promise<ProcessedPhoto | null> {
  // Try cloud first
  try {
    const cloudPhoto = await getCloudPhoto(shareCode);
    if (cloudPhoto) {
      return cloudPhoto;
    }
  } catch (error) {
    console.warn("⚠️ Cloud fetch failed, checking localStorage:", error);
  }
  
  // Fallback to localStorage
  const photos = getAllPhotos();
  return photos.find(photo => photo.shareCode === shareCode) || null;
}

/**
 * Get all photos from localStorage
 */
export function getAllPhotos(): ProcessedPhoto[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to parse photos from localStorage:", error);
    return [];
  }
}

/**
 * Delete a photo by ID
 */
export function deletePhoto(id: string): boolean {
  const photos = getAllPhotos();
  const filteredPhotos = photos.filter(photo => photo.id !== id);
  
  if (filteredPhotos.length === photos.length) {
    return false; // Photo not found
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredPhotos));
  console.log("🗑️ Photo deleted:", id);
  return true;
}

/**
 * Clear all photos from localStorage
 */
export function clearAllPhotos(): void {
  localStorage.removeItem(STORAGE_KEY);
  console.log("🗑️ All photos cleared");
}

/**
 * Get storage usage stats
 */
export function getStorageStats(): {
  photoCount: number;
  storageUsed: number;
  storageLimit: number;
  percentUsed: number;
} {
  const photos = getAllPhotos();
  const data = localStorage.getItem(STORAGE_KEY) || "";
  const storageUsed = new Blob([data]).size;
  const storageLimit = 5 * 1024 * 1024; // ~5MB typical limit
  
  return {
    photoCount: photos.length,
    storageUsed,
    storageLimit,
    percentUsed: (storageUsed / storageLimit) * 100,
  };
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
export function getShareUrl(shareCode: string): string {
  // Use photo.akitapr.com for production share URLs
  const baseUrl = import.meta.env.VITE_BASE_URL || 'https://photo.akitapr.com';
  return `${baseUrl}/share/${shareCode}`;
}

