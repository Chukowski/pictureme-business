import { useState, useEffect, useCallback } from 'react';
import { getEventPhotos, PhotoFeed } from '@/services/eventsApi';

export function useEventPhotos(userSlug?: string, eventSlug?: string, pollInterval: number = 5000) {
  const [photos, setPhotos] = useState<PhotoFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPhotos = useCallback(async () => {
    if (!userSlug || !eventSlug) {
      setLoading(false);
      return;
    }

    try {
      const fetchedPhotos = await getEventPhotos(userSlug, eventSlug, 50, 0);
      setPhotos(fetchedPhotos);
      setError(null);
    } catch (err) {
      console.error('❌ Failed to load photos:', err);
      const message = err instanceof Error ? err.message : 'Failed to load photos';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [userSlug, eventSlug]);

  // Initial load
  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // Polling for new photos
  useEffect(() => {
    if (!userSlug || !eventSlug || pollInterval <= 0) return;

    const interval = setInterval(() => {
      loadPhotos();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [userSlug, eventSlug, pollInterval, loadPhotos]);

  const refresh = useCallback(() => {
    setLoading(true);
    loadPhotos();
  }, [loadPhotos]);

  return { photos, loading, error, refresh };
}

