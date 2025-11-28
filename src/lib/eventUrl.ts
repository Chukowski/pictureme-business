/**
 * Event URL Helpers
 * 
 * Generate station-specific URLs for events
 */

export interface StationUrlParams {
  userSlug: string;
  eventSlug: string;
  stationId?: string;
  stationType: 'registration' | 'booth' | 'playground' | 'viewer';
}

/**
 * Get the base URL for the application
 */
export function getBaseUrl(): string {
  // In browser, use window.location.origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Fallback for SSR or other environments
  return process.env.VITE_APP_URL || 'https://app.pictureme.now';
}

/**
 * Generate a station URL
 */
export function getStationUrl(params: StationUrlParams): string {
  const { userSlug, eventSlug, stationId, stationType } = params;
  const baseUrl = getBaseUrl();
  
  switch (stationType) {
    case 'registration':
      // Registration doesn't need station ID - it creates badges
      return `${baseUrl}/${userSlug}/${eventSlug}/registration`;
    
    case 'booth':
      // Booth stations need station ID to filter templates
      return stationId 
        ? `${baseUrl}/${userSlug}/${eventSlug}/booth?station=${stationId}`
        : `${baseUrl}/${userSlug}/${eventSlug}/booth`;
    
    case 'playground':
      // Playground stations need station ID
      return stationId 
        ? `${baseUrl}/${userSlug}/${eventSlug}/playground?station=${stationId}`
        : `${baseUrl}/${userSlug}/${eventSlug}/playground`;
    
    case 'viewer':
      // Viewer stations need station ID
      return stationId 
        ? `${baseUrl}/${userSlug}/${eventSlug}/viewer?station=${stationId}`
        : `${baseUrl}/${userSlug}/${eventSlug}/viewer`;
    
    default:
      return `${baseUrl}/${userSlug}/${eventSlug}`;
  }
}

/**
 * Generate all station URLs for an event
 */
export function getAllStationUrls(
  userSlug: string, 
  eventSlug: string, 
  stations: Array<{ id: string; type: 'registration' | 'booth' | 'playground' | 'viewer' }>
): Array<{ stationId: string; url: string; type: string }> {
  return stations.map(station => ({
    stationId: station.id,
    url: getStationUrl({
      userSlug,
      eventSlug,
      stationId: station.id,
      stationType: station.type,
    }),
    type: station.type,
  }));
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

/**
 * Open URL in new tab
 */
export function openInNewTab(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

