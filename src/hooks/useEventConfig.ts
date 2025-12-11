import { useState, useEffect } from 'react';
import { getEventConfig, EventConfig } from '@/services/eventsApi';

export function useEventConfig(userSlug: string, eventSlug: string) {
  const [config, setConfig] = useState<EventConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userSlug || !eventSlug) {
      setLoading(false);
      return;
    }

    async function loadConfig() {
      try {
        setLoading(true);
        setError(null);
        
        const eventConfig = await getEventConfig(userSlug, eventSlug);
        setConfig(eventConfig);
      } catch (err: any) {
        console.error('❌ Failed to load event config:', err);
        setError(err.message || 'Failed to load event');
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, [userSlug, eventSlug]);

  return { config, loading, error };
}

