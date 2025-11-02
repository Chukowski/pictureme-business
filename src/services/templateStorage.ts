/**
 * Template Storage Service
 * Handles uploading template images to MinIO and exporting/importing templates as JSON
 */

import type { Template } from './eventsApi';

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Upload an image file to MinIO and return the public URL
 */
export async function uploadTemplateImage(file: File): Promise<string> {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('No authentication token found. Please log in again.');
  }

  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_URL}/api/templates/upload-image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail || 'Failed to upload image');
  }
  
  const data = await response.json();
  return data.url; // MinIO public URL
}

/**
 * Export templates to JSON file
 */
export function exportTemplates(templates: Template[], eventName: string): void {
  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    eventName,
    templates,
  };
  
  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `templates-${eventName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import templates from JSON file
 */
export async function importTemplates(file: File): Promise<Template[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // Validate structure
        if (!data.templates || !Array.isArray(data.templates)) {
          throw new Error('Invalid template file format');
        }
        
        // Validate each template
        const templates: Template[] = data.templates.map((t: any) => ({
          id: crypto.randomUUID(), // Generate new IDs
          name: t.name || 'Imported Template',
          description: t.description || '',
          images: Array.isArray(t.images) ? t.images : [],
          prompt: t.prompt || '',
          active: t.active !== false, // Default to true
          includeHeader: t.includeHeader || false,
          campaignText: t.campaignText || '',
        }));
        
        resolve(templates);
      } catch (error: any) {
        reject(new Error(`Failed to parse template file: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Upload multiple images for a template
 */
export async function uploadTemplateImages(files: FileList | File[]): Promise<string[]> {
  const urls: string[] = [];
  
  for (const file of Array.from(files)) {
    try {
      const url = await uploadTemplateImage(file);
      urls.push(url);
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
      throw error;
    }
  }
  
  return urls;
}

