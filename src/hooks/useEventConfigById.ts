import { useState, useEffect } from 'react';
import { getEventConfigById, EventConfig } from '@/services/eventsApi';

export function useEventConfigById(eventId: number | null, eventSlug: string | null) {
  const [config, setConfig] = useState<EventConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId || !eventSlug) {
      setLoading(false);
      return;
    }

    async function loadConfig() {
      try {
        setLoading(true);
        setError(null);
        
        const eventConfig = await getEventConfigById(eventId!, eventSlug!);
        setConfig(eventConfig);
      } catch (err: any) {
        console.error('❌ Failed to load event config by ID:', err);
        setError(err.message || 'Failed to load event');
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, [eventId, eventSlug]);

  return { config, loading, error };
}

