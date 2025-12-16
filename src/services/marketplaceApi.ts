import { ENV } from "@/config/env";

export interface MarketplaceTemplate {
    id: string;
    name: string;
    description: string;
    template_type: string;
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
    creator?: {
        id: string;
        name: string;
        avatar_url?: string;
    };
}

const getApiUrl = () => ENV.API_URL || "http://localhost:3002";

const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

export async function getMarketplaceTemplates(params?: { category?: string; search?: string; limit?: number }): Promise<MarketplaceTemplate[]> {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    if (params?.limit) query.append('limit', params.limit.toString());

    const response = await fetch(`${getApiUrl()}/api/marketplace/templates?${query.toString()}`, {
        headers: getAuthHeaders()
    });

    if (!response.ok) throw new Error('Failed to fetch marketplace templates');
    return response.json();
}

export async function getMarketplaceTemplate(id: string): Promise<MarketplaceTemplate> {
    const response = await fetch(`${getApiUrl()}/api/marketplace/templates/${id}`, {
        headers: getAuthHeaders()
    });

    if (!response.ok) throw new Error('Failed to fetch template');
    return response.json();
}
