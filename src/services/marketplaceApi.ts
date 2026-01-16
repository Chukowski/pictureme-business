import { ENV } from "@/config/env";

export interface MarketplaceTemplate {
    id: string;
    _rev?: string;
    name: string;
    description: string;
    template_type: string; // Tier: individual | business
    media_type: 'image' | 'video' | 'workflow';
    category: string;
    tags: string[];
    preview_url?: string;
    preview_images: string[];
    backgrounds: string[];
    ai_model?: string;
    aspectRatio?: string;
    price: number;
    tokens_cost: number;
    is_public: boolean;
    is_premium: boolean;
    is_exportable: boolean;
    downloads: number;
    rating: number;
    is_owned?: boolean;
    prompt?: string;
    negative_prompt?: string;
    pipeline_config?: any;
    business_config?: any;
    creator?: {
        id: string;
        name: string;
        avatar_url?: string;
    };
    status?: 'draft' | 'pending' | 'published' | 'rejected';
}

const getApiUrl = () => ENV.API_URL || "http://localhost:3002";

const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

/**
 * Centered fetch wrapper for marketplace API that handles 401s
 */
async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...options.headers,
        }
    });

    if (response.status === 401) {
        console.warn('🔒 [MarketplaceAPI] Unauthorized (401). logging out.');
        // @ts-ignore
        import('./eventsApi').then(m => m.logoutUser());
    }

    return response;
}

export async function getMarketplaceTemplates(params?: { category?: string; search?: string; limit?: number }): Promise<MarketplaceTemplate[]> {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    if (params?.limit) query.append('limit', params.limit.toString());

    const response = await fetchWithAuth(`${getApiUrl()}/api/marketplace/templates?${query.toString()}`);

    if (!response.ok) throw new Error('Failed to fetch marketplace templates');
    return response.json();
}

export async function getMarketplaceTemplate(id: string): Promise<MarketplaceTemplate> {
    const response = await fetchWithAuth(`${getApiUrl()}/api/marketplace/templates/${id}`);

    if (!response.ok) throw new Error('Failed to fetch template');
    return response.json();
}

// Admin Methods
export async function adminGetTemplates(params?: { category?: string; search?: string }): Promise<MarketplaceTemplate[]> {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);

    const response = await fetchWithAuth(`${getApiUrl()}/api/admin/marketplace/templates?${query.toString()}`);

    if (!response.ok) throw new Error('Failed to fetch admin templates');
    const data = await response.json();
    return data.templates || [];
}

export async function adminCreateTemplate(template: Partial<MarketplaceTemplate>): Promise<MarketplaceTemplate> {
    const response = await fetchWithAuth(`${getApiUrl()}/api/admin/marketplace/templates`, {
        method: 'POST',
        body: JSON.stringify(template)
    });

    if (!response.ok) throw new Error('Failed to create template');
    return response.json();
}

export async function adminUpdateTemplate(id: string, template: Partial<MarketplaceTemplate>): Promise<MarketplaceTemplate> {
    const response = await fetchWithAuth(`${getApiUrl()}/api/admin/marketplace/templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(template)
    });

    if (!response.ok) throw new Error('Failed to update template');
    return response.json();
}

export async function adminDeleteTemplate(id: string): Promise<void> {
    const response = await fetchWithAuth(`${getApiUrl()}/api/admin/marketplace/templates/${id}`, {
        method: 'DELETE'
    });

    if (!response.ok) throw new Error('Failed to delete template');
}

export async function adminAssignTemplate(userId: string, templateId: string): Promise<void> {
    const response = await fetchWithAuth(`${getApiUrl()}/api/admin/marketplace/templates/assign`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, template_id: templateId })
    });

    if (!response.ok) throw new Error('Failed to assign template');
}
