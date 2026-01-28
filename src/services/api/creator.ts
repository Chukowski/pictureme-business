/**
 * Creator API Service
 * Handles AI generation, assets, and Creator Studio logic
 */
import { apiFetch } from './client';
import { Template } from './types';

/**
 * Upload an asset (image, video, etc.)
 */
export async function uploadAsset(
    file: File,
    type: 'image' | 'video' | 'mask' | 'lora',
    onProgress?: (progress: number) => void
): Promise<{ url: string; id: string; type: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    // Note: Standard fetch doesn't support progress events easily.
    // For file uploads with progress, we might want to stick with axios or XMLHttpRequest
    // But for now, we'll use the consistent apiFetch wrapper
    const response = await apiFetch('/assets/upload', {
        method: 'POST',
        body: formData,
        // Note: Content-Type header should NOT be set manually for FormData
        // The browser sets it automatically with the boundary
    });

    if (!response.ok) {
        throw new Error('Asset upload failed');
    }

    return response.json();
}

/**
 * List user assets
 */
export async function listAssets(type?: string): Promise<any[]> {
    let url = '/assets/';
    if (type) {
        url += `?type=${type}`;
    }
    const response = await apiFetch(url);
    if (!response.ok) return [];
    return response.json();
}

/**
 * Generate an image using AI
 */
export async function generateImage(
    prompt: string,
    modelId: string,
    params: any
): Promise<{ url: string; seed: number; cost: number }> {
    const response = await apiFetch('/ai/generate', {
        method: 'POST',
        body: JSON.stringify({
            prompt,
            model_id: modelId,
            ...params,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Generation failed');
    }

    return response.json();
}

/**
 * Get available AI models
 */
export async function getAiModels(): Promise<any[]> {
    const response = await apiFetch('/ai/models');
    if (!response.ok) return [];
    return response.json();
}

/**
 * Save user template
 */
export async function saveTemplate(template: Template): Promise<Template> {
    const response = await apiFetch('/templates/', {
        method: 'POST',
        body: JSON.stringify(template),
    });

    if (!response.ok) {
        throw new Error('Failed to save template');
    }

    return response.json();
}

/**
 * Delete user template
 */
export async function deleteTemplate(templateId: string): Promise<void> {
    const response = await apiFetch(`/templates/${templateId}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        throw new Error('Failed to delete template');
    }
}
