/**
 * BigScreenPage
 * 
 * Big screen display for album mode events.
 * Shows album stacks in a large grid with auto-refresh.
 * 
 * Features:
 * - Auto-refresh every 10 seconds
 * - Large grid layout
 * - Stack previews with animations
 * - No individual photos - albums only
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useEventConfig } from '@/hooks/useEventConfig';
import { useEventContext } from '@/contexts/EventContext';
import { Badge } from '@/components/ui/badge';
import {
  Monitor,
  RefreshCw,
  Camera,
  Users,
  Clock,
  Loader2,
} from 'lucide-react';
import { getEventAlbums, Album } from '@/services/eventsApi';
import { AlbumStackCard } from '@/components/album';
import { isMockMode, getMockAlbums, getMockAlbumStats, MockAlbum } from '@/dev/mockAlbums';
import { cn } from '@/lib/utils';

const REFRESH_INTERVAL = 10000; // 10 seconds

export function BigScreenPage() {
  // Try to get config from context first (for short URLs)
  const eventContext = useEventContext();
  const params = useParams<{ userSlug: string; eventSlug: string }>();
  
  const userSlug = eventContext?.userSlug || params.userSlug || '';
  const eventSlug = eventContext?.eventSlug || params.eventSlug || '';
  
  const [searchParams] = useSearchParams();
  
  // Only fetch if not provided by context
  const { config: fetchedConfig, loading: fetchLoading, error: fetchError } = useEventConfig(
    eventContext?.config ? '' : userSlug, 
    eventContext?.config ? '' : eventSlug
  );
  
  const config = eventContext?.config || fetchedConfig;
  const configLoading = eventContext?.config ? false : fetchLoading;
  const configError = eventContext?.config ? null : fetchError;

  const [albums, setAlbums] = useState<(Album | MockAlbum)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [stats, setStats] = useState({ total: 0, completed: 0, in_progress: 0, photos: 0 });

  const useMock = isMockMode();
  const focusedAlbum = searchParams.get('album');

  // Load albums
  const loadAlbums = useCallback(async () => {
    try {
      if (useMock) {
        const mockData = getMockAlbums();
        setAlbums(mockData);
        const mockStats = getMockAlbumStats();
        setStats({
          total: mockStats.total,
          completed: mockStats.completed,
          in_progress: mockStats.in_progress,
          photos: mockStats.total_photos,
        });
      } else if (config?.postgres_event_id) {
        const data = await getEventAlbums(config.postgres_event_id);
        setAlbums(data);
        setStats({
          total: data.length,
          completed: data.filter(a => a.status === 'completed').length,
          in_progress: data.filter(a => a.status === 'in_progress').length,
          photos: 0, // Would need to aggregate
        });
      }
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load albums:', error);
    } finally {
      setIsLoading(false);
    }
  }, [useMock, config?.postgres_event_id]);

  // Initial load
  useEffect(() => {
    if (config) {
      loadAlbums();
    }
  }, [config, loadAlbums]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(loadAlbums, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadAlbums]);

  // Loading state
  if (configLoading || isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-zinc-400">Loading Big Screen...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (configError || !config) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Monitor className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <p className="text-xl text-white mb-2">Event Not Found</p>
          <p className="text-zinc-400">Unable to load event configuration</p>
        </div>
      </div>
    );
  }

  const primaryColor = config.theme?.primaryColor || '#6366F1';

  // Filter albums if focused
  const displayAlbums = focusedAlbum
    ? albums.filter(a => a.code === focusedAlbum)
    : albums;

  return (
    <div className="min-h-screen bg-zinc-950 overflow-hidden">
      {/* Header */}
      <header
        className="sticky top-0 z-10 border-b border-zinc-800/50 backdrop-blur-xl"
        style={{ backgroundColor: `${primaryColor}10` }}
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}
              >
                <Monitor className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{config.title}</h1>
                <p className="text-zinc-400">Live Album Feed</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-zinc-400 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Albums
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-400">{stats.completed}</p>
                <p className="text-xs text-zinc-400">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-400">{stats.in_progress}</p>
                <p className="text-xs text-zinc-400">In Progress</p>
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <RefreshCw className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} />
                <span className="text-sm">
                  Updated {lastRefresh.toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {displayAlbums.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <Camera className="w-12 h-12" style={{ color: primaryColor }} />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">
              Waiting for Albums
            </h2>
            <p className="text-zinc-400 text-center max-w-md">
              Albums will appear here as guests register and take photos at the event.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {displayAlbums.map((album, index) => {
              // Get first photo as cover
              const coverPhoto = 'photos' in album && album.photos.length > 0
                ? album.photos[0].url || album.photos[0].thumbnail_url
                : undefined;
              
              const photoCount = 'photos' in album ? album.photos.length : 0;

              return (
                <div
                  key={album.id || album.code}
                  className={cn(
                    'animate-in fade-in slide-in-from-bottom-4',
                    'duration-500'
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <AlbumStackCard
                    albumId={String(album.id)}
                    albumCode={album.code}
                    ownerName={album.owner_name}
                    status={album.status as any}
                    paymentStatus={'payment_status' in album ? album.payment_status as any : 'free'}
                    photoCount={photoCount}
                    maxPhotos={'max_photos' in album ? album.max_photos : 5}
                    coverPhotoUrl={coverPhoto}
                    createdAt={album.created_at}
                    primaryColor={primaryColor}
                  />
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer ticker */}
      <footer
        className="fixed bottom-0 left-0 right-0 border-t border-zinc-800/50 backdrop-blur-xl py-3"
        style={{ backgroundColor: `${primaryColor}10` }}
      >
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-400">
              <Clock className="w-4 h-4" />
              <span className="text-sm">
                {new Date().toLocaleDateString()} • {new Date().toLocaleTimeString()}
              </span>
            </div>
            <div className="flex items-center gap-4">
              {config.theme?.brandName && (
                <span className="text-zinc-500 text-sm">
                  Powered by {config.theme.brandName}
                </span>
              )}
              <Badge
                variant="outline"
                className="border-zinc-700 text-zinc-400"
              >
                <Monitor className="w-3 h-3 mr-1" />
                Big Screen Mode
              </Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default BigScreenPage;

