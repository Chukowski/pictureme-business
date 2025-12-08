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
  Star,
  Sparkles,
} from 'lucide-react';
import { getEventAlbums, getAlbumPhotos, Album } from '@/services/eventsApi';
import { AlbumStackCard } from '@/components/album';
import { isMockMode, getMockAlbums, getMockAlbumStats, MockAlbum } from '@/dev/mockAlbums';
import { cn } from '@/lib/utils';
import { pollBigScreen, FeaturedAlbum } from '@/services/bigScreenBroadcast';
import { QRCodeSVG } from 'qrcode.react';

const REFRESH_INTERVAL = 10000; // 10 seconds

// PhotoCard component - detects orientation and sets grid span
function PhotoCard({ 
  photoUrl, 
  index, 
  total, 
  isPaid, 
  primaryColor,
  isLandscape
}: { 
  photoUrl: string; 
  index: number; 
  total: number; 
  isPaid: boolean; 
  primaryColor: string;
  isLandscape?: boolean;
}) {
  const [span, setSpan] = useState("col-span-1 row-span-1");
  const [orientation, setOrientation] = useState<'landscape' | 'portrait' | 'square' | null>(null);

  useEffect(() => {
    if (typeof isLandscape === 'boolean') {
      setSpan(isLandscape ? "col-span-2 row-span-1" : "col-span-1 row-span-2");
      setOrientation(isLandscape ? 'landscape' : 'portrait');
      return;
    }

    const img = new Image();
    img.onload = () => {
      const ratio = img.width / img.height;
      // Logic for bento grid sizing
      if (ratio > 1.2) {
        // Landscape -> 2 cols x 1 row
        setSpan("col-span-2 row-span-1"); 
        setOrientation('landscape');
      } else if (ratio < 0.8) {
        // Portrait -> 1 col x 2 rows
        setSpan("col-span-1 row-span-2");
        setOrientation('portrait');
      } else {
        // Square-ish -> 1 col x 1 row (or 2x2 for emphasis if it's the first photo)
        setSpan(index === 0 ? "col-span-2 row-span-2" : "col-span-1 row-span-1");
        setOrientation('square');
      }
    };
    img.src = photoUrl;
  }, [photoUrl, index, isLandscape]);

  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden w-full h-full bg-zinc-900",
        "ring-1 ring-white/10 transition-all duration-500 hover:ring-white/30",
        "animate-in fade-in zoom-in-95 duration-500",
        span // Apply calculated span
      )}
      style={{ 
        animationDelay: `${index * 100}ms`,
        boxShadow: `0 10px 30px -10px ${primaryColor}20`,
      }}
    >
      {/* Main image */}
      <img
        src={photoUrl}
        alt={`Photo ${index + 1}`}
        className={cn(
          "w-full h-full object-cover", // Fill the calculated span
          !isPaid && "blur-md opacity-80"
        )}
      />
      {/* Watermark overlay for unpaid albums */}
      {!isPaid && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20 backdrop-blur-[2px] z-20">
          <div className="bg-black/70 backdrop-blur-md px-6 py-3 rounded-xl border border-white/20 shadow-2xl transform -rotate-6">
            <p className="text-white text-xl font-bold tracking-widest uppercase drop-shadow-md">
              Preview
            </p>
          </div>
        </div>
      )}
      
      {/* Photo number badge */}
      <div 
        className={cn(
          "absolute bottom-3 right-3 px-2.5 py-1 rounded-full flex items-center gap-1.5 text-white font-medium text-xs backdrop-blur-md border border-white/10 shadow-sm z-20",
          !isPaid ? "bg-amber-500/80" : "bg-black/40"
        )}
      >
        <Sparkles className="w-3 h-3 opacity-80" />
        {index + 1}/{total}
      </div>

      {/* Orientation badge */}
      {orientation && (
        <div
          className={cn(
            "absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide backdrop-blur-md border border-white/10 text-white",
            orientation === 'landscape' && "bg-blue-500/70",
            orientation === 'portrait' && "bg-purple-500/70",
            orientation === 'square' && "bg-green-500/70"
          )}
        >
          {orientation === 'landscape' ? 'H' : orientation === 'portrait' ? 'V' : 'SQ'}
        </div>
      )}
    </div>
  );
}

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
  const [featuredAlbum, setFeaturedAlbum] = useState<FeaturedAlbum | null>(null);
  const [featuredPhotos, setFeaturedPhotos] = useState<string[]>([]);
  const [sortedPhotos, setSortedPhotos] = useState<{url: string, isLandscape: boolean}[]>([]);

  const useMock = isMockMode();
  const focusedAlbum = searchParams.get('album');

  // ... existing loadAlbums logic ...

  // Sort photos by orientation
  useEffect(() => {
    if (featuredPhotos.length === 0) {
      setSortedPhotos([]);
      return;
    }

    const loadImages = async () => {
      const loaded = await Promise.all(featuredPhotos.map(url => {
        return new Promise<{url: string, isLandscape: boolean}>((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ url, isLandscape: img.width > img.height });
          img.onerror = () => resolve({ url, isLandscape: false }); // Fallback
          img.src = url;
        });
      }));

      // Sort: Landscapes first, then Portraits
      const landscapes = loaded.filter(p => p.isLandscape);
      const portraits = loaded.filter(p => !p.isLandscape);
      
      setSortedPhotos([...landscapes, ...portraits]);
    };

    loadImages();
  }, [featuredPhotos]);

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

  // Poll for BigScreen updates from API
  useEffect(() => {
    if (!config?.postgres_event_id) return;

    const cleanup = pollBigScreen(
      config.postgres_event_id,
      (album) => {
        // Debug log
        if (album) {
          console.log('🖥️ BigScreen received album:', {
            album_code: album.album_code,
            visitor_name: album.visitor_name,
            is_paid: album.is_paid,
            is_paid_type: typeof album.is_paid,
          });
        }
        // Only update if album changed
        setFeaturedAlbum((prev) => {
          if (!album && !prev) return prev;
          if (!album) return null;
          if (prev && prev.album_code === album.album_code && prev.timestamp === album.timestamp) {
            return prev;
          }
          return album;
        });
      },
      3000 // Poll every 3 seconds
    );

    return cleanup;
  }, [config?.postgres_event_id]);

  // Load featured album photos when it changes
  useEffect(() => {
    if (!featuredAlbum) {
      setFeaturedPhotos([]);
      return;
    }

    const loadFeaturedPhotos = async () => {
      try {
        const photos = await getAlbumPhotos(featuredAlbum.album_code);
        // NOTE: future feature - include template/booth name per photo when backend provides it.
        const urls = photos
          .map((p: any) => p.url ?? p.processed_image_url ?? '')
          .filter(Boolean);
        setFeaturedPhotos(urls);
      } catch (error) {
        console.error('Failed to load featured album photos:', error);
        setFeaturedPhotos([]);
      }
    };

    loadFeaturedPhotos();
    // Refresh featured photos periodically
    const interval = setInterval(loadFeaturedPhotos, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [featuredAlbum]);

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
    <div className="min-h-screen bg-zinc-950 overflow-hidden flex flex-col">
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

      {/* Main Content - Fill viewport without scroll */}
      <main className="flex-1 overflow-hidden px-8 pb-6">
        {/* Featured Album Display - Full Screen Photos */}
        {featuredAlbum && featuredPhotos.length > 0 ? (
          <div className="animate-in fade-in duration-500 w-full h-full flex flex-col max-w-[1600px] mx-auto">
            {/* Featured Header - Compact */}
            <div className="flex items-center justify-center gap-3 mb-4 shrink-0">
              <Star className="w-7 h-7 text-[#D1F349] fill-[#D1F349] animate-pulse" />
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {featuredAlbum.visitor_name || featuredAlbum.album_code}
                </h2>
                {featuredAlbum.visitor_name && (
                  <p className="text-xs text-zinc-400 font-mono">
                    {featuredAlbum.album_code}
                  </p>
                )}
              </div>
              <Star className="w-7 h-7 text-[#D1F349] fill-[#D1F349] animate-pulse" />
            </div>

            {/* Bento Grid Layout - Dense packing similar to reference */}
            <div
              className="w-full h-full grid gap-4 p-6 overflow-hidden"
              style={{ 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gridAutoRows: '200px',
                gridAutoFlow: 'dense',
                height: 'calc(100vh - 180px)',
                alignContent: 'center',
                justifyContent: 'center',
              }}
            >
              {sortedPhotos.length > 0 ? sortedPhotos.map((photo, index) => (
                <PhotoCard
                  key={`${featuredAlbum.album_code}-${index}`}
                  photoUrl={photo.url}
                  index={index}
                  total={sortedPhotos.length}
                  isPaid={featuredAlbum.is_paid}
                  primaryColor={primaryColor}
                  isLandscape={photo.isLandscape}
                />
              )) : featuredPhotos.map((photoUrl, index) => (
                <PhotoCard
                  key={`${featuredAlbum.album_code}-${index}`}
                  photoUrl={photoUrl}
                  index={index}
                  total={featuredPhotos.length}
                  isPaid={featuredAlbum.is_paid}
                  primaryColor={primaryColor}
                />
              ))}
            </div>
            
            {/* Unpaid banner */}
            {!featuredAlbum.is_paid && (
              <div className="mt-6 text-center animate-pulse">
                <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-lg px-6 py-2">
                  💳 Payment pending - Photos will unlock after purchase
                </Badge>
              </div>
            )}
          </div>
        ) : (
          /* Idle State - Event Branding with QR */
          <div className="flex flex-col items-center justify-center text-center animate-in fade-in duration-1000">
            {/* Event Logo */}
            {config.branding?.logoPath ? (
              <img 
                src={config.branding.logoPath} 
                alt={config.title}
                className="h-32 md:h-48 object-contain mb-8 drop-shadow-2xl"
              />
            ) : (
              <div 
                className="w-32 h-32 md:w-48 md:h-48 rounded-3xl flex items-center justify-center mb-8"
                style={{ 
                  backgroundColor: `${primaryColor}20`,
                  boxShadow: `0 0 60px ${primaryColor}40`
                }}
              >
                <Camera className="w-16 h-16 md:w-24 md:h-24" style={{ color: primaryColor }} />
              </div>
            )}
            
            {/* Event Title */}
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight">
              {config.title}
            </h1>
            
            {/* Tagline */}
            <p className="text-xl md:text-2xl text-zinc-400 mb-12 max-w-2xl">
              {config.theme?.tagline || 'AI-Powered Photo Experience'}
            </p>

            {/* QR Code Section */}
            <div className="relative">
              {/* Glowing background */}
              <div 
                className="absolute inset-0 blur-3xl opacity-30 rounded-full"
                style={{ backgroundColor: primaryColor }}
              />
              
              <div className="relative bg-white p-6 md:p-8 rounded-3xl shadow-2xl">
                <QRCodeSVG 
                  value={`${window.location.origin}/${userSlug}/${eventSlug}/registration`}
                  size={200}
                  level="M"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
            </div>
            
            <p className="text-zinc-500 mt-8 text-lg">
              Scan to create your album
            </p>

            {/* Animated particles/sparkles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full animate-pulse"
                  style={{
                    backgroundColor: primaryColor,
                    opacity: 0.3,
                    left: `${15 + i * 15}%`,
                    top: `${20 + (i % 3) * 25}%`,
                    animationDelay: `${i * 0.5}s`,
                    animationDuration: '3s'
                  }}
                />
              ))}
            </div>
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
              {featuredAlbum ? (
                <Badge className="bg-[#D1F349] text-black">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  Featuring: {featuredAlbum.visitor_name || featuredAlbum.album_code}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-zinc-700 text-zinc-400"
                >
                  <Monitor className="w-3 h-3 mr-1" />
                  Big Screen Mode
                </Badge>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default BigScreenPage;

