import { useParams } from 'react-router-dom';
import { useEventConfig } from '@/hooks/useEventConfig';
import { useEventPhotos } from '@/hooks/useEventPhotos';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const EventFeedPage = () => {
  const { userSlug, eventSlug } = useParams<{ userSlug: string; eventSlug: string }>();
  const { config, loading: configLoading, error: configError } = useEventConfig(userSlug!, eventSlug!);
  const { photos, loading: photosLoading, error: photosError, refresh } = useEventPhotos(
    userSlug,
    eventSlug,
    5000 // Poll every 5 seconds
  );

  if (configLoading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-white text-lg">Loading event feed...</p>
        </div>
      </div>
    );
  }

  if (configError || !config) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-24 h-24 rounded-full bg-red-500/20 mx-auto flex items-center justify-center">
            <span className="text-5xl">😕</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Event Not Found</h1>
          <p className="text-gray-400 text-lg">
            {configError || "This event doesn't exist or is no longer active."}
          </p>
        </div>
      </div>
    );
  }

  if (!config.settings?.feedEnabled) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <h1 className="text-3xl font-bold text-white">Feed Not Available</h1>
          <p className="text-gray-400 text-lg">
            The live photo feed is not enabled for this event.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{config.title}</h1>
            <p className="text-sm text-gray-400">Live Photo Feed</p>
          </div>
          
          <Button
            onClick={refresh}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${photosLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Photo Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {photosError && (
          <div className="text-center py-12">
            <p className="text-red-400">{photosError}</p>
          </div>
        )}

        {photos.length === 0 && !photosLoading && (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">📸</div>
            <p className="text-xl text-gray-400">No photos yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Photos will appear here as guests take them
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative group overflow-hidden rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300 animate-fade-in"
            >
              <img
                src={photo.processed_image_url}
                alt={photo.background_name}
                className="w-full h-auto object-cover aspect-[9/16]"
              />
              
              {/* Overlay with info */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <p className="text-sm font-semibold">{photo.background_name}</p>
                  <p className="text-xs text-gray-300">
                    {new Date(photo.created_at).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 font-mono">
                    {photo.share_code}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {photosLoading && photos.length === 0 && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-gray-400 mt-4">Loading photos...</p>
          </div>
        )}
      </div>
    </div>
  );
};

