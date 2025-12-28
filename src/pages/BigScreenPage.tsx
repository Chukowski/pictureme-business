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

// PhotoCard component - gallery style
function PhotoCard({ 
  photoUrl, 
  index, 
  isPaid, 
  primaryColor,
  blurEnabled = true,
  watermarkText = 'PREVIEW',
  onClick
}: { 
  photoUrl: string; 
  index: number; 
  isPaid: boolean; 
  primaryColor: string;
  blurEnabled?: boolean;
  watermarkText?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden bg-[#101112]/60 cursor-pointer",
        "ring-1 ring-white/10 transition-all duration-300 hover:ring-2 hover:ring-white/30 hover:scale-[1.02]",
        "animate-in fade-in zoom-in-95 duration-500",
        "aspect-[3/4]" // Fixed aspect ratio for gallery consistency
      )}
      style={{ 
        animationDelay: `${index * 80}ms`,
        boxShadow: `0 8px 24px -8px ${primaryColor}30`,
      }}
      onClick={onClick}
    >
      {/* Main image */}
      <img
        src={photoUrl}
        alt={`Photo ${index + 1}`}
        className={cn(
          "w-full h-full object-cover",
          !isPaid && blurEnabled && "blur-md opacity-80"
        )}
      />
      
      {/* Watermark overlay for unpaid albums */}
      {!isPaid && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Diagonal watermark text */}
          <div 
            className="text-white/25 text-3xl font-bold transform -rotate-45 select-none whitespace-nowrap"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
          >
            {watermarkText}
          </div>
        </div>
      )}
      
      {/* Blur overlay badge */}
      {!isPaid && blurEnabled && (
        <div className="absolute bottom-3 left-3 right-3">
          <div className="bg-[#101112]/70 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/20 text-center">
            <p className="text-white/90 text-xs font-medium tracking-wide uppercase">
              Preview
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Lightbox component for full preview
function PhotoLightbox({
  photo,
  isPaid,
  blurEnabled,
  watermarkText,
  onClose,
  onPrev,
  onNext,
  currentIndex,
  total
}: {
  photo: string;
  isPaid: boolean;
  blurEnabled: boolean;
  watermarkText: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  currentIndex: number;
  total: number;
}) {
  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrev, onNext]);

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#101112]/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Close button */}
      <button 
        className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
        onClick={onClose}
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Navigation arrows */}
      {total > 1 && (
        <>
          <button
            className="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            className="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
            onClick={(e) => { e.stopPropagation(); onNext(); }}
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Photo counter */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium">
        {currentIndex + 1} / {total}
      </div>

      {/* Main image container */}
      <div 
        className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={photo}
          alt="Full preview"
          className={cn(
            "max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl",
            !isPaid && blurEnabled && "blur-lg"
          )}
        />
        
        {/* Watermark overlay for unpaid */}
        {!isPaid && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div 
              className="text-white/30 text-6xl font-bold transform -rotate-45 select-none whitespace-nowrap"
              style={{ textShadow: '0 4px 16px rgba(0,0,0,0.5)' }}
            >
              {watermarkText}
            </div>
          </div>
        )}
      </div>
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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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
      <div className="min-h-screen bg-card flex items-center justify-center">
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
      <div className="min-h-screen bg-card flex items-center justify-center">
        <div className="text-center">
          <Monitor className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <p className="text-xl text-white mb-2">Event Not Found</p>
          <p className="text-zinc-400">Unable to load event configuration</p>
        </div>
      </div>
    );
  }

  const primaryColor = config.theme?.primaryColor || '#6366F1';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blurOnUnpaidGallery = (config as any).rules?.blurOnUnpaidGallery !== false;
  const watermarkText = config?.branding?.watermark?.text || config?.theme?.brandName || 'PREVIEW';

  // Filter albums if focused
  const displayAlbums = focusedAlbum
    ? albums.filter(a => a.code === focusedAlbum)
    : albums;

  return (
    <div className="min-h-screen bg-card overflow-hidden flex flex-col">
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

      {/* Main Content - Fixed viewport gallery */}
      <main className="flex-1 overflow-hidden p-6" style={{ height: 'calc(100vh - 100px)' }}>
        {/* Featured Album Display - Gallery Grid */}
        {featuredAlbum && featuredPhotos.length > 0 ? (
          <div className="animate-in fade-in duration-500 w-full h-full flex flex-col">
            {/* Featured Header - Compact */}
            <div className="flex items-center justify-center gap-3 mb-4 shrink-0">
              <Star className="w-6 h-6 text-[#D1F349] fill-[#D1F349] animate-pulse" />
              <div className="text-center">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {featuredAlbum.visitor_name || featuredAlbum.album_code}
                </h2>
                {featuredAlbum.visitor_name && (
                  <p className="text-xs text-zinc-400 font-mono">
                    {featuredAlbum.album_code}
                  </p>
                )}
              </div>
              <Star className="w-6 h-6 text-[#D1F349] fill-[#D1F349] animate-pulse" />
              
              {/* Unpaid indicator */}
              {!featuredAlbum.is_paid && (
                <Badge className="ml-4 bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  💳 Payment pending
                </Badge>
              )}
            </div>

            {/* Gallery Grid - Responsive like album feed */}
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              <div 
                className="grid gap-4 w-full max-w-4xl mx-auto p-4"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(Math.max(sortedPhotos.length || featuredPhotos.length, 1), 3)}, minmax(200px, 300px))`,
                  justifyContent: 'center',
                }}
              >
                {(sortedPhotos.length > 0 ? sortedPhotos : featuredPhotos.map(url => ({ url }))).map((photo, index) => (
                  <PhotoCard
                    key={`${featuredAlbum.album_code}-${index}`}
                    photoUrl={typeof photo === 'string' ? photo : photo.url}
                    index={index}
                    isPaid={featuredAlbum.is_paid}
                    primaryColor={primaryColor}
                    blurEnabled={blurOnUnpaidGallery}
                    watermarkText={watermarkText}
                    onClick={() => setLightboxIndex(index)}
                  />
                ))}
              </div>
            </div>
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

      {/* Photo Lightbox */}
      {lightboxIndex !== null && featuredAlbum && (() => {
        const photos = sortedPhotos.length > 0 ? sortedPhotos.map(p => p.url) : featuredPhotos;
        const totalPhotos = photos.length;
        return (
          <PhotoLightbox
            photo={photos[lightboxIndex] || ''}
            isPaid={featuredAlbum.is_paid}
            blurEnabled={blurOnUnpaidGallery}
            watermarkText={watermarkText}
            currentIndex={lightboxIndex}
            total={totalPhotos}
            onClose={() => setLightboxIndex(null)}
            onPrev={() => setLightboxIndex(prev => 
              prev !== null ? (prev - 1 + totalPhotos) % totalPhotos : null
            )}
            onNext={() => setLightboxIndex(prev => 
              prev !== null ? (prev + 1) % totalPhotos : null
            )}
          />
        );
      })()}
    </div>
  );
}

export default BigScreenPage;

