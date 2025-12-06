import { useParams, useSearchParams, Navigate } from 'react-router-dom';
import { useEventConfigById } from '@/hooks/useEventConfigById';
import { Loader2, AlertTriangle } from 'lucide-react';
import { PhotoBoothPage } from './PhotoBoothPage';
import { EventNotFound } from '@/components/EventNotFound';

/**
 * ShortUrlEventPage handles short URLs in the format /e/:eventId/:eventSlug
 * It loads the event config by ID and renders the PhotoBoothPage with the correct context
 */
export const ShortUrlEventPage = () => {
  const { eventId, eventSlug } = useParams<{ eventId: string; eventSlug: string }>();
  const [searchParams] = useSearchParams();
  
  const eventIdNum = eventId ? parseInt(eventId, 10) : null;
  const { config, loading, error } = useEventConfigById(eventIdNum, eventSlug || null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-white mx-auto mb-4" />
          <p className="text-white/60">Loading event...</p>
        </div>
      </div>
    );
  }

  if (error || !config) {
    return <EventNotFound />;
  }

  // Build the full URL path for PhotoBoothPage
  // It expects /:userSlug/:eventSlug format
  const userSlug = config.user_slug || config.userSlug || 'unknown';
  const fullPath = `/${userSlug}/${config.slug}`;
  
  // Preserve query params
  const queryString = searchParams.toString();
  const redirectUrl = queryString ? `${fullPath}?${queryString}` : fullPath;

  // Redirect to the canonical URL format
  return <Navigate to={redirectUrl} replace />;
};

export default ShortUrlEventPage;

