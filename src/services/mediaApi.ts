import { ENV } from "@/config/env";

const API_URL = ENV.API_URL;

export interface MediaItem {
    name: string;
    url: string;
    path?: string;
    size: number;
    category?: string;
    modified?: string;
    uploaded_at?: string | null;
    type?: string;
}

export async function getMediaLibrary(category?: string): Promise<MediaItem[]> {
    const token = localStorage.getItem("auth_token");
    if (!token) throw new Error("No authentication token found");

    const url = new URL(`${API_URL}/api/media/library`);
    if (category) url.searchParams.append("category", category);

    const response = await fetch(url.toString(), {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) throw new Error("Failed to load media library");

    const data = await response.json();
    return data.items || data.media || [];
}

export async function uploadMedia(file: File, category?: string): Promise<MediaItem> {
    const token = localStorage.getItem("auth_token");
    if (!token) throw new Error("No authentication token found");

    const formData = new FormData();
    formData.append("file", file);
    if (category) formData.append("category", category);

    const response = await fetch(`${API_URL}/api/media/upload`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData,
    });

    if (!response.ok) throw new Error("Failed to upload media");

    return await response.json();
}

/**
 * Upload an image from a URL to the media library
 * Since we don't have a direct backend endpoint for this yet,
 * we'll download it in the frontend and upload as a file
 */
export async function uploadMediaFromUrl(imageUrl: string, filename: string, category: string = 'assets'): Promise<MediaItem> {
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
        return await uploadMedia(file, category);
    } catch (error) {
        console.error("Failed to upload from URL:", error);
        throw error;
    }
}

export async function deleteMedia(filename: string): Promise<void> {
    const token = localStorage.getItem("auth_token");
    if (!token) throw new Error("No authentication token found");

    const response = await fetch(`${API_URL}/api/media/${filename}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) throw new Error("Failed to delete media");
}
