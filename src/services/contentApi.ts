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
  image_url: string;
  thumbnail_url?: string;
  likes: number;
  views: number;
  visibility: 'public' | 'private' | 'unlisted';
  is_featured: boolean;
  created_at: string;
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

// Public / Home Endpoints
export async function getHomeContent(userType: 'personal' | 'business' | 'individual' = 'business'): Promise<HomeContentResponse> {
  // Map individual to personal if needed, or keep consistent with backend expectation
  const type = userType === 'individual' ? 'personal' : userType;
  const response = await fetch(`${getApiUrl()}/api/content/home?user_type=${type}`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch home content');
  return response.json();
}

export async function viewTemplate(id: string) {
  return fetch(`${getApiUrl()}/api/templates/${id}/view`, { method: 'POST', headers: getAuthHeaders() });
}

export async function likeCreation(id: number) {
  return fetch(`${getApiUrl()}/api/creations/${id}/like`, { method: 'POST', headers: getAuthHeaders() });
}

// Admin Endpoints
export async function getAdminAnnouncements() {
  const response = await fetch(`${getApiUrl()}/api/admin/content/announcements`, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to fetch announcements');
  return response.json();
}

export async function createAnnouncement(data: Partial<Announcement>) {
  const response = await fetch(`${getApiUrl()}/api/admin/content/announcements`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to create announcement');
  return response.json();
}

export async function updateAnnouncement(id: number, data: Partial<Announcement>) {
  const response = await fetch(`${getApiUrl()}/api/admin/content/announcements/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to update announcement');
  return response.json();
}

export async function deleteAnnouncement(id: number) {
  const response = await fetch(`${getApiUrl()}/api/admin/content/announcements/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to delete announcement');
  return response.json();
}

export async function publishAnnouncement(id: number, publish: boolean) {
  // Using endpoint from instructions: POST /api/admin/content/announcements/:id/publish
  // Assuming body might need published state or just toggle. Instructions imply publish/despublicar.
  // Let's assume it toggles or takes a body. Often 'publish' action implies true. 
  // If despublicar is needed, maybe a different endpoint or body. 
  // Going with PUT update for explicit control if the specific publish endpoint is just a trigger.
  // Re-reading: "POST .../publish". Let's try that.
  const response = await fetch(`${getApiUrl()}/api/admin/content/announcements/${id}/publish`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ published: publish })
  });
  if (!response.ok) throw new Error('Failed to update publish state');
  return response.json();
}

// Featured Templates Admin
export async function getAdminFeaturedTemplates() {
  const response = await fetch(`${getApiUrl()}/api/admin/content/templates/featured`, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to fetch featured templates');
  return response.json();
}

export async function addFeaturedTemplate(data: Partial<FeaturedTemplate>) {
  const response = await fetch(`${getApiUrl()}/api/admin/content/templates/featured`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to add featured template');
  return response.json();
}

export async function removeFeaturedTemplate(id: number) {
  const response = await fetch(`${getApiUrl()}/api/admin/content/templates/featured/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to remove featured template');
  return response.json();
}

// Trending Admin
export async function recalculateTrending() {
  const response = await fetch(`${getApiUrl()}/api/admin/content/trending/recalculate`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to recalculate trending');
  return response.json();
}

