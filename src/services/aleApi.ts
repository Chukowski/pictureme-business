import { ENV } from "@/config/env";

const API_BASE = ENV.API_URL;

// Types
export interface AlESettings {
  id: string;
  is_enabled: boolean;
  signature: string;
  brand_color: string;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  description?: string;
  subject: string;
  body: string;
  token_reward: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Trigger {
  id: string;
  name: string;
  description?: string;
  trigger_type: string;
  is_enabled: boolean;
  send_email: boolean;
  grant_tokens: boolean;
  token_amount: number;
  automation_mode: string;
  delay_minutes: number;
  audience_scope: string;
  max_per_user_per_day: number;
  template_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CommunicationLog {
  id: string;
  user_id: string;
  email: string;
  subject: string;
  body: string;
  token_reward: number;
  trigger_type?: string;
  trigger_id?: string;
  template_id?: string;
  sent_by: string;
  sent_at: string;
  delivery_status: string;
  opened_at?: string;
  clicked_at?: string;
}

export interface SendEmailRequest {
  recipient_type: 'single' | 'segment' | 'all';
  recipient_id?: string;
  recipient_segment?: {
    roles?: string[];
    tiers?: string[];
    min_tokens?: number;
    max_tokens?: number;
  };
  subject: string;
  body: string;
  token_reward: number;
  template_id?: string;
  notify_by_email: boolean;
}

function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

// Settings
export async function getAlESettings(): Promise<AlESettings> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}/api/admin/ale/settings`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch Al-e settings');
  return response.json();
}

export async function updateAlESettings(updates: Partial<AlESettings>): Promise<AlESettings> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}/api/admin/ale/settings`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update Al-e settings');
  return response.json();
}

// Templates
export async function getTemplates(activeOnly = false): Promise<EmailTemplate[]> {
  const token = getAuthToken();
  const url = activeOnly ? `${API_BASE}/api/admin/ale/templates?active=true` : `${API_BASE}/api/admin/ale/templates`;
  const response = await fetch(url, { 
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch templates');
  return response.json();
}

export async function createTemplate(template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'is_active'>): Promise<EmailTemplate> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}/api/admin/ale/templates`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(template),
  });
  if (!response.ok) throw new Error('Failed to create template');
  return response.json();
}

export async function updateTemplate(id: string, template: Partial<EmailTemplate>): Promise<EmailTemplate> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}/api/admin/ale/templates/${id}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(template),
  });
  if (!response.ok) throw new Error('Failed to update template');
  return response.json();
}

export async function deleteTemplate(id: string): Promise<void> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}/api/admin/ale/templates/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to delete template');
}

// Triggers
export async function getTriggers(): Promise<Trigger[]> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}/api/admin/ale/triggers`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch triggers');
  return response.json();
}

export async function updateTrigger(id: string, updates: Partial<Trigger>): Promise<Trigger> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}/api/admin/ale/triggers/${id}`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update trigger');
  return response.json();
}

// Email Sending
export async function sendEmail(request: SendEmailRequest): Promise<{ success: boolean; recipients_sent: number; log_ids: string[] }> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}/api/admin/ale/send`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send email');
  }
  return response.json();
}

export async function sendTestEmail(subject: string, body: string): Promise<{ success: boolean; log_id: string }> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}/api/admin/ale/test`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ subject, body }),
  });
  if (!response.ok) throw new Error('Failed to send test email');
  return response.json();
}

export async function previewEmail(subject: string, body: string, userId?: string): Promise<{ subject: string; body: string; body_html: string }> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}/api/admin/ale/preview`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ subject, body, user_id: userId }),
  });
  if (!response.ok) throw new Error('Failed to preview email');
  return response.json();
}

// Communication Logs
export async function getCommunicationLogs(params: { user_id?: string; limit?: number; offset?: number } = {}): Promise<{ logs: CommunicationLog[]; total: number; limit: number; offset: number }> {
  const token = getAuthToken();
  const searchParams = new URLSearchParams();
  if (params.user_id) searchParams.append('user_id', params.user_id);
  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.offset) searchParams.append('offset', params.offset.toString());

  const response = await fetch(`${API_BASE}/api/admin/ale/logs?${searchParams}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch communication logs');
  return response.json();
}

// Drafts
export async function getDrafts(): Promise<any[]> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}/api/admin/ale/drafts`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch drafts');
  return response.json();
}

export async function createDraft(draft: any): Promise<any> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}/api/admin/ale/drafts`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(draft),
  });
  if (!response.ok) throw new Error('Failed to create draft');
  return response.json();
}

export async function updateDraft(id: string, draft: any): Promise<any> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}/api/admin/ale/drafts/${id}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(draft),
  });
  if (!response.ok) throw new Error('Failed to update draft');
  return response.json();
}

export async function deleteDraft(id: string): Promise<void> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}/api/admin/ale/drafts/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to delete draft');
}

// Metrics
export async function getAlEMetrics(startDate: string, endDate: string, triggerType?: string): Promise<any> {
  const token = getAuthToken();
  const searchParams = new URLSearchParams();
  searchParams.append('start_date', startDate);
  searchParams.append('end_date', endDate);
  if (triggerType) searchParams.append('trigger_type', triggerType);

  const response = await fetch(`${API_BASE}/api/admin/ale/metrics?${searchParams}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch metrics');
  return response.json();
}

export async function toggleTemplateActive(id: string, isActive: boolean): Promise<void> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}/api/admin/ale/templates/${id}/toggle`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ is_active: isActive }),
  });
  if (!response.ok) throw new Error('Failed to toggle template active status');
}

// User Search
export async function searchUsers(search: string, limit = 10): Promise<any[]> {
  const token = getAuthToken();
  const searchParams = new URLSearchParams();
  searchParams.append('search', search);
  searchParams.append('limit', limit.toString());

  const response = await fetch(`${API_BASE}/api/admin/users?${searchParams}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to search users');
  const data = await response.json();
  return data.users || [];
}
