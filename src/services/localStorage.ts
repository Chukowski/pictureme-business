/**
 * Local Storage Service for Photo Booth
 * Stores processed photos in browser localStorage with metadata
 */

export interface ProcessedPhoto {
  id: string;
  originalImageBase64: string;
  processedImageBase64: string;
  backgroundId: string;
  backgroundName: string;
  shareCode: string;
  createdAt: number;
  prompt: string;
}

const STORAGE_KEY = "photobooth_photos";
const MAX_PHOTOS = 50; // Limit to prevent localStorage overflow

/**
 * Save a processed photo to localStorage
 */
export function saveProcessedPhoto(photo: Omit<ProcessedPhoto, "id" | "createdAt" | "shareCode">): ProcessedPhoto {
  const photos = getAllPhotos();
  
  const newPhoto: ProcessedPhoto = {
    ...photo,
    id: generateId(),
    shareCode: generateShareCode(),
    createdAt: Date.now(),
  };

  photos.unshift(newPhoto);

  // Keep only the latest MAX_PHOTOS
  const limitedPhotos = photos.slice(0, MAX_PHOTOS);
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedPhotos));
    console.log("💾 Photo saved to localStorage:", newPhoto.id);
    return newPhoto;
  } catch (error) {
    // localStorage might be full, try removing old photos
    console.warn("⚠️ localStorage full, removing old photos");
    const reducedPhotos = photos.slice(0, Math.floor(MAX_PHOTOS / 2));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reducedPhotos));
    throw new Error("Storage limit reached. Some old photos were removed.");
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
 * Get a photo by share code
 */
export function getPhotoByShareCode(shareCode: string): ProcessedPhoto | null {
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
  const baseUrl = import.meta.env.VITE_BASE_URL || window.location.origin;
  return `${baseUrl}/share/${shareCode}`;
}

