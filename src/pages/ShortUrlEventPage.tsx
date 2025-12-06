import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useEventConfigById } from '@/hooks/useEventConfigById';
import { Loader2 } from 'lucide-react';
import { PhotoBoothPage } from './PhotoBoothPage';
import { EventNotFound } from '@/components/EventNotFound';
import { EventFeedPage } from './EventFeedPage';
import AlbumFeedPage from './AlbumFeedPage';
import StaffDashboard from './StaffDashboard';
import ViewerDisplayPage from './ViewerDisplayPage';
import ViewerStationPage from './ViewerStationPage';
import BigScreenPage from './BigScreenPage';
import { EventProvider } from '@/contexts/EventContext';

/**
 * ShortUrlEventPage handles short URLs in the format /e/:eventId/:eventSlug
 * It loads the event config by ID and renders the appropriate page directly
 * without redirecting (so the user never sees the userSlug in the URL)
 */
export const ShortUrlEventPage = () => {
  const { eventId, eventSlug } = useParams<{ eventId: string; eventSlug: string; '*': string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  
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

  // Get userSlug from config for passing to components
  const userSlug = config.user_slug || config.userSlug || '';
  const resolvedEventSlug = config.slug || eventSlug || '';
  
  // Determine which page to render based on the path
  const pathname = location.pathname;
  const basePath = `/e/${eventId}/${eventSlug}`;
  const subPath = pathname.replace(basePath, '').replace(/^\//, '');

  // Wrap the component in EventProvider so child components can access config
  const renderWithProvider = (component: React.ReactNode) => (
    <EventProvider 
      config={config} 
      userSlug={userSlug} 
      eventSlug={resolvedEventSlug}
    >
      {component}
    </EventProvider>
  );

  // Route to the appropriate component based on subpath
  switch (subPath) {
    case 'feed':
      return renderWithProvider(<EventFeedPage />);
    
    case 'staff':
      return renderWithProvider(<StaffDashboard />);
    
    case 'display':
      return renderWithProvider(<ViewerDisplayPage />);
    
    case 'viewer':
      return renderWithProvider(<ViewerStationPage />);
    
    case 'bigscreen':
      return renderWithProvider(<BigScreenPage />);
    
    case 'registration':
    case 'booth':
    case 'playground':
    case '':
    default:
      // For album routes like /album/:albumId
      if (subPath.startsWith('album/')) {
        return renderWithProvider(<AlbumFeedPage />);
      }
      // Default to PhotoBoothPage with config override
      return renderWithProvider(
        <PhotoBoothPage 
          configOverride={config} 
          userSlugOverride={userSlug}
          eventSlugOverride={resolvedEventSlug}
        />
      );
  }
};

export default ShortUrlEventPage;
