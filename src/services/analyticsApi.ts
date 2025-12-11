/**
 * Analytics API Service
 * Provides real-time statistics for tokens, albums, photos, and usage
 */

import { ENV } from "@/config/env";

// Helper function to get API URL with HTTPS enforcement
function getApiUrl(): string {
  let url = ENV.API_URL || '';
  if (url && url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    url = url.replace('http://', 'https://');
  }
  return url;
}

// Get auth token
function getAuthToken(): string | null {
  // Try localStorage first
  const token = localStorage.getItem('auth_token');
  if (token) return token;
  
  // Try session_token cookie for Better Auth
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'session_token' || name === 'better-auth.session_token') {
      return value;
    }
  }
  return null;
}

// ==================== Token Statistics ====================

export interface TokenStats {
  current_tokens: number;
  tokens_used_month: number;
  avg_daily_usage: number;
  forecast_days: number;
  tokens_total: number;
}

export interface TokenTransaction {
  id: number;
  date: string;
  description: string;
  event_name?: string;
  amount: number;
  type: string;
  balance_after: number;
}

export interface TokenUsageByType {
  type: string;
  tokens_used: number;
  transaction_count: number;
}

/**
 * Get token statistics for current user
 */
export async function getTokenStats(): Promise<TokenStats> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${getApiUrl()}/api/tokens/stats`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to load token stats' }));
    throw new Error(error.detail || 'Failed to load token stats');
  }

  return response.json();
}

/**
 * Get token transaction history
 */
export async function getTokenTransactions(limit: number = 50): Promise<TokenTransaction[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${getApiUrl()}/api/tokens/transactions?limit=${limit}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to load transactions' }));
    throw new Error(error.detail || 'Failed to load transactions');
  }

  return response.json();
}

/**
 * Get token usage broken down by type (booth, video, badge, etc.)
 */
export async function getTokenUsageByType(days: number = 30): Promise<TokenUsageByType[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${getApiUrl()}/api/analytics/tokens/usage?days=${days}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to load token usage' }));
    throw new Error(error.detail || 'Failed to load token usage');
  }

  return response.json();
}

// ==================== Album Statistics ====================

export interface AlbumSummary {
  total_albums: number;
  completed_albums: number;
  in_progress_albums: number;
  paid_albums: number;
  total_photos: number;
  period_days: number;
}

export interface StationAnalytics {
  station_type: string;
  photo_count: number;
  album_count: number;
  first_photo: string | null;
  last_photo: string | null;
}

/**
 * Get album summary statistics
 */
export async function getAlbumSummary(eventId?: number, days: number = 30): Promise<AlbumSummary> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  let url = `${getApiUrl()}/api/analytics/albums/summary?days=${days}`;
  if (eventId) {
    url += `&event_id=${eventId}`;
  }

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to load album summary' }));
    throw new Error(error.detail || 'Failed to load album summary');
  }

  return response.json();
}

/**
 * Get station analytics (photos by station type)
 */
export async function getStationAnalytics(eventId?: number, days: number = 30): Promise<StationAnalytics[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  let url = `${getApiUrl()}/api/analytics/stations?days=${days}`;
  if (eventId) {
    url += `&event_id=${eventId}`;
  }

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to load station analytics' }));
    throw new Error(error.detail || 'Failed to load station analytics');
  }

  return response.json();
}

// ==================== Download Analytics ====================

export interface DownloadAnalytics {
  total_downloads: number;
  total_photos_downloaded: number;
  unique_albums: number;
  downloads_by_type: Record<string, number>;
}

/**
 * Get download analytics for an event (staff print/sales tracking)
 */
export async function getDownloadAnalytics(eventId: number, days: number = 30): Promise<DownloadAnalytics> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${getApiUrl()}/api/analytics/downloads?event_id=${eventId}&days=${days}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to load download analytics' }));
    throw new Error(error.detail || 'Failed to load download analytics');
  }

  return response.json();
}

// ==================== Dashboard Overview ====================

export interface DashboardStats {
  tokens: TokenStats;
  albums: AlbumSummary;
  stations: StationAnalytics[];
  tokenUsage: TokenUsageByType[];
  downloads?: DownloadAnalytics;
}

/**
 * Get all dashboard statistics in one call
 */
export async function getDashboardStats(days: number = 30, eventId?: number): Promise<DashboardStats> {
  const [tokens, albums, stations, tokenUsage, downloads] = await Promise.all([
    getTokenStats().catch(() => ({
      current_tokens: 0,
      tokens_used_month: 0,
      avg_daily_usage: 0,
      forecast_days: 0,
      tokens_total: 0,
    })),
    getAlbumSummary(eventId, days).catch(() => ({
      total_albums: 0,
      completed_albums: 0,
      in_progress_albums: 0,
      paid_albums: 0,
      total_photos: 0,
      period_days: days,
    })),
    getStationAnalytics(eventId, days).catch(() => []),
    getTokenUsageByType(days).catch(() => []),
    eventId ? getDownloadAnalytics(eventId, days).catch(() => ({
      total_downloads: 0,
      total_photos_downloaded: 0,
      unique_albums: 0,
      downloads_by_type: {},
    })) : Promise.resolve(undefined),
  ]);

  return { tokens, albums, stations, tokenUsage, downloads };
}

