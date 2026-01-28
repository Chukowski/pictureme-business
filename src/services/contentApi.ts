import { ENV } from "@/config/env";

export interface Announcement {
  id: number;
  title: string;
  type: 'new_feature' | 'update' | 'maintenance' | 'pro_tip' | 'alert';
  content: string;
  image_url?: string;
  cta_label?: string;
  cta_url?: string;
  visibility: 'global' | 'business_only' | 'personal_only';
  published: boolean;
  scheduled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface FeaturedTemplate {
  id: number;
  template_id: string;
  template_name?: string;
  template_type?: string;
  thumbnail_url?: string;
  featured_order: number;
  is_active: boolean;
  created_at: string;
}

export interface TrendingTemplate {
  id: number;
  template_id: string;
  template_name?: string;
  download_count: number;
  use_count: number;
  view_count: number;
  trending_score: number;
  last_calculated: string;
}

export interface PublicCreation {
  id: number;
  template_id?: string;
  template_name?: string;
  creator_username?: string;
  creator_avatar?: string;
  creator_slug?: string;
  creator_user_id?: string | number;
  prompt?: string;
  image_url: string;
  thumbnail_url?: string;
  likes: number;
  views: number;
  visibility: 'public' | 'private' | 'unlisted';
  is_featured: boolean;
  created_at: string;
  is_liked?: boolean;
  type?: 'image' | 'video';
  model?: string;
  parent_id?: number | string;
  parent_username?: string;
  is_adult?: boolean;
}

export interface HomeContentResponse {
  announcements: Announcement[];
  featured_templates: FeaturedTemplate[];
  trending_templates: TrendingTemplate[];
  public_creations: PublicCreation[];
}

const getApiUrl = () => ENV.API_URL || "http://localhost:3002";

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

/**
 * Centered fetch wrapper for content API that handles 401s
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
    console.warn('🔒 [ContentAPI] Unauthorized (401). logging out.');
    // @ts-ignore
    import('./eventsApi').then(m => m.logoutUser());
  }

  return response;
}

// Public / Home Endpoints
export async function getHomeContent(userType: 'personal' | 'business' | 'individual' = 'business'): Promise<HomeContentResponse> {
  const type = userType === 'individual' ? 'personal' : userType;
  const response = await fetchWithAuth(`${getApiUrl()}/api/content/home?user_type=${type}`);
  if (!response.ok) throw new Error('Failed to fetch home content');
  return response.json();
}

export async function getPublicCreations(params: { limit?: number; offset?: number; featured?: boolean } = {}): Promise<PublicCreation[]> {
  const query = new URLSearchParams();
  if (params.limit) query.append('limit', params.limit.toString());
  if (params.offset) query.append('offset', params.offset.toString());
  if (params.featured) query.append('featured', 'true');

  const response = await fetchWithAuth(`${getApiUrl()}/api/creations/public?${query.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch public creations');
  const data = await response.json();
  return data.creations || [];
}

export async function viewTemplate(id: string) {
  return fetchWithAuth(`${getApiUrl()}/api/templates/${id}/view`, { method: 'POST' });
}

export async function likeCreation(id: number) {
  return fetchWithAuth(`${getApiUrl()}/api/creations/${id}/like`, { method: 'POST' });
}

// Admin Endpoints
export async function getAdminAnnouncements() {
  const response = await fetchWithAuth(`${getApiUrl()}/api/admin/content/announcements`);
  if (!response.ok) throw new Error('Failed to fetch announcements');
  return response.json();
}

export async function createAnnouncement(data: Partial<Announcement>) {
  const response = await fetchWithAuth(`${getApiUrl()}/api/admin/content/announcements`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to create announcement');
  return response.json();
}

export async function updateAnnouncement(id: number, data: Partial<Announcement>) {
  const response = await fetchWithAuth(`${getApiUrl()}/api/admin/content/announcements/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to update announcement');
  return response.json();
}

export async function deleteAnnouncement(id: number) {
  const response = await fetchWithAuth(`${getApiUrl()}/api/admin/content/announcements/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete announcement');
  return response.json();
}

export async function publishAnnouncement(id: number, publish: boolean) {
  const response = await fetchWithAuth(`${getApiUrl()}/api/admin/content/announcements/${id}/publish`, {
    method: 'POST',
    body: JSON.stringify({ published: publish })
  });
  if (!response.ok) throw new Error('Failed to update publish state');
  return response.json();
}

// Featured Templates Admin
export async function getAdminFeaturedTemplates() {
  const response = await fetchWithAuth(`${getApiUrl()}/api/admin/content/templates/featured`);
  if (!response.ok) throw new Error('Failed to fetch featured templates');
  return response.json();
}

export async function addFeaturedTemplate(data: Partial<FeaturedTemplate>) {
  const response = await fetchWithAuth(`${getApiUrl()}/api/admin/content/templates/featured`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to add featured template');
  return response.json();
}

export async function removeFeaturedTemplate(id: number) {
  const response = await fetchWithAuth(`${getApiUrl()}/api/admin/content/templates/featured/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to remove featured template');
  return response.json();
}

// Trending Admin
export async function recalculateTrending() {
  const response = await fetchWithAuth(`${getApiUrl()}/api/admin/content/trending/recalculate`, {
    method: 'POST'
  });
  if (!response.ok) throw new Error('Failed to recalculate trending');
  return response.json();
}

