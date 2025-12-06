import { useState, useEffect, useRef, useCallback } from 'react';
import { Album, getEventAlbums, getEventAlbumStats, EventAlbumStats } from '@/services/eventsApi';

interface UseLiveAlbumsOptions {
  eventId: number;
  enabled?: boolean;
  pollInterval?: number; // in milliseconds, default 15 seconds
}

export function useLiveAlbums({
  eventId,
  enabled = true,
  pollInterval = 15000, // 15 seconds default
}: UseLiveAlbumsOptions) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [stats, setStats] = useState<EventAlbumStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Load data
  const loadData = useCallback(async (showLoading = false) => {
    if (!eventId || !isMountedRef.current) return;
    
    try {
      if (showLoading) setIsLoading(true);
      setError(null);
      
      const [albumsData, statsData] = await Promise.all([
        getEventAlbums(eventId),
        getEventAlbumStats(eventId),
      ]);
      
      if (isMountedRef.current) {
        setAlbums(albumsData || []);
        setStats(statsData);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to load albums:', err);
      if (isMountedRef.current) {
        setError('Failed to load albums');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [eventId]);

  // Initial load and polling
  useEffect(() => {
    isMountedRef.current = true;
    
    if (!eventId || !enabled) {
      return;
    }

    // Initial load
    loadData(true);

    // Set up polling
    intervalRef.current = setInterval(() => {
      loadData(false); // Don't show loading spinner on poll
    }, pollInterval);

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [eventId, enabled, pollInterval, loadData]);

  // Manual refresh
  const refresh = useCallback(() => {
    loadData(false);
  }, [loadData]);

  return {
    albums,
    stats,
    isLoading,
    error,
    lastUpdated,
    refresh,
    setAlbums,
    setStats,
  };
}
