import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEventConfig } from '@/hooks/useEventConfig';
import { useEventPhotos } from '@/hooks/useEventPhotos';
import { Loader2 } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { QRCodeSVG } from 'qrcode.react';
import { BorderBeam } from '@/components/BorderBeam';

const chunkArray = <T,>(array: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

export const EventFeedPage = () => {
  const { userSlug, eventSlug } = useParams<{ userSlug: string; eventSlug: string }>();
  const { config, loading: configLoading, error: configError } = useEventConfig(userSlug!, eventSlug!);
  const { photos, loading: photosLoading, error: photosError } = useEventPhotos(
    userSlug,
    eventSlug,
    5000 // Poll every 5 seconds
  );
  const displayPhotos = useMemo(() => {
    if (photos.length === 0) return [];
    if (photos.length < 5) return photos;
    // Create infinite loop by tripling the array
    return [...photos, ...photos, ...photos];
  }, [photos]);
  const stripPhotos = useMemo(() => photos, [photos]);
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);

  // Apply theme when config loads
  useEffect(() => {
    if (config?.theme) {
      document.documentElement.style.setProperty('--brand-primary', config.theme.primaryColor || '#009999');
      document.documentElement.style.setProperty('--brand-secondary', config.theme.secondaryColor || '#ee6602');
      
      // Apply theme mode (light/dark)
      const themeMode = config.theme.mode || 'dark';
      if (themeMode === 'light') {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
      }
    }
  }, [config]);

  useEffect(() => {
    if (!carouselApi || displayPhotos.length === 0) {
      return;
    }

    // Start at middle third for seamless loop
    if (photos.length >= 5) {
      carouselApi.scrollTo(photos.length, false);
    }

    const handleSelect = () => {
      if (!carouselApi) return;
      const index = carouselApi.selectedScrollSnap();
      
      // Loop back to middle section when reaching ends
      if (photos.length >= 5) {
        if (index < photos.length * 0.5) {
          carouselApi.scrollTo(index + photos.length, false);
        } else if (index >= photos.length * 2.5) {
          carouselApi.scrollTo(index - photos.length, false);
        }
      }
    };

    carouselApi.on('select', handleSelect);
    return () => {
      carouselApi.off('select', handleSelect);
    };
  }, [carouselApi, displayPhotos.length, photos.length]);

  useEffect(() => {
    if (!carouselApi || displayPhotos.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      if (!carouselApi) {
        return;
      }
      carouselApi.scrollNext();
    }, 7000);

    return () => clearInterval(interval);
  }, [carouselApi, displayPhotos.length]);

  useEffect(() => {
    if (!stripRef.current || stripPhotos.length === 0) {
      return;
    }

    if (stripPhotos.length <= 5) {
      return;
    }

    const container = stripRef.current;
    let animationFrame: number;

    const step = () => {
      if (!container) return;
      container.scrollLeft += 0.6;
      if (container.scrollLeft >= container.scrollWidth - container.clientWidth - 1) {
        container.scrollLeft = 0;
      }
      animationFrame = requestAnimationFrame(step);
    };

    animationFrame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animationFrame);
  }, [stripPhotos.length]);

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
    <div className="h-screen bg-gradient-dark flex flex-col overflow-hidden">
      {/* Header - Fixed height in vh */}
      <div className="h-[8vh] min-h-[50px] max-h-[80px] flex-shrink-0 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="h-full flex flex-col items-center justify-center px-4 sm:px-6">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold tracking-[0.35em] uppercase text-white/90 truncate max-w-full">
            {config.title}
          </h1>
          {config.description && (
            <p className="mt-0.5 text-[9px] sm:text-[10px] uppercase tracking-[0.5em] text-white/50 truncate max-w-full">
              {config.description}
            </p>
          )}
        </div>
      </div>

      {/* Photo Carousel - Takes remaining space minus strip footer */}
      <div className="flex-1 w-full overflow-hidden relative flex items-center justify-center">
        {photosError && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-red-400 text-xl font-semibold mb-2">Error loading photos</p>
              <p className="text-sm text-red-300">{photosError}</p>
            </div>
          </div>
        )}

        {photos.length === 0 && !photosLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">📸</div>
              <p className="text-xl text-gray-400">No photos yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Photos will appear here as guests take them
              </p>
            </div>
          </div>
        )}

        {photos.length > 0 && (
          <div className="h-full w-full flex items-center justify-center">
            <Carousel
              opts={{ 
                align: 'center', 
                loop: false,
                skipSnaps: false,
                dragFree: true,
                containScroll: false
              }}
              setApi={setCarouselApi}
              className="w-full h-full"
            >
              <CarouselContent className="h-full -ml-2 sm:-ml-3">
                {displayPhotos.map((photo, index) => {
                  const downloadUrl = photo.processed_image_url || photo.original_image_url || '';

                  return (
                    <CarouselItem
                      key={`${photo.id ?? photo.share_code}-${index}`}
                      className="flex items-center justify-center h-full pl-2 sm:pl-3 basis-[90%] sm:basis-[55%] lg:basis-[30%] xl:basis-[24%] 2xl:basis-[18%]"
                    >
                      <div className="flex flex-col items-center justify-center h-full w-full max-w-[360px] lg:max-w-[420px] xl:max-w-[480px] 2xl:max-w-[540px]">
                        {/* Main Photo Card - Centered and proportionally larger */}
                        <div className="relative w-full max-h-[55vh] aspect-[3/5] rounded-lg overflow-hidden border border-white/15 bg-black/85 backdrop-blur-sm shadow-[0_40px_120px_-40px_rgba(15,15,35,0.85)]">
                          <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/45 pointer-events-none" />
                          <img
                            src={photo.processed_image_url}
                            alt={photo.background_name || 'Event photo'}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* QR Bar Below - Compact and responsive */}
                        <div className="relative w-full mt-3 sm:mt-4 rounded-[1.2rem] border border-white/10 bg-white/5 backdrop-blur-md p-2.5 sm:p-3 lg:p-4 flex items-center justify-between gap-3 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.75)] overflow-hidden">
                          <div className="flex-1 min-w-0">
                            <p className="text-[8px] sm:text-[9px] uppercase tracking-[0.4em] text-white/60 mb-0.5">Share Code</p>
                            <p className="text-sm sm:text-base lg:text-lg xl:text-xl font-mono tracking-[0.5em] text-white drop-shadow-sm truncate">
                              {photo.share_code}
                            </p>
                            <p className="text-[8px] sm:text-[9px] text-white/70 mt-1">Escanea el QR</p>
                          </div>
                          <div className="bg-white p-1.5 sm:p-2 lg:p-2.5 rounded-xl shadow-2xl flex-shrink-0">
                            {downloadUrl ? (
                              <QRCodeSVG value={downloadUrl} size={64} level="Q" includeMargin={false} />
                            ) : (
                              <div className="w-[64px] h-[64px] flex items-center justify-center text-[10px] text-gray-500">
                                QR
                              </div>
                            )}
                          </div>
                          <BorderBeam
                            className="hidden dark:block"
                            size={220}
                            duration={12}
                            anchor={82}
                            borderWidth={1.8}
                            colorFrom="var(--brand-primary)"
                            colorTo="var(--brand-secondary)"
                            delay={3}
                          />
                        </div>
                      </div>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
            </Carousel>
          </div>
        )}
      </div>

      {/* Strip Footer - Larger fixed height, always visible */}
      {photos.length > 0 && (
        <div className="h-[25vh] min-h-[200px] max-h-[280px] flex-shrink-0 w-full border-t border-white/10 bg-black/65 backdrop-blur-2xl">
          <div className="h-full flex flex-col justify-center px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] sm:text-xs uppercase tracking-[0.5em] text-white/60">Timeline</span>
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-white/50">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Updating
              </div>
            </div>
            <div className="relative flex-1 min-h-0">
              <div className="pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-16 bg-gradient-to-r from-black/90 via-black/65 to-transparent z-10" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-16 bg-gradient-to-l from-black/90 via-black/65 to-transparent z-10" />
              <div
                ref={stripRef}
                className="h-full flex items-center gap-3 sm:gap-4 overflow-x-auto overflow-y-hidden scrollbar-hide"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                {stripPhotos.map((photo, index) => (
                  <div
                    key={`${photo.id ?? photo.share_code ?? index}-thumb-${index}`}
                    className="flex-shrink-0 h-full aspect-[9/16] rounded-xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur md:hover:-translate-y-1 md:hover:shadow-[0_16px_40px_-24px_rgba(0,0,0,0.7)] transition-all"
                  >
                    <img
                      src={photo.processed_image_url}
                      alt={photo.background_name || 'Event photo thumbnail'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {photosLoading && photos.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-gray-400 mt-4">Loading photos...</p>
          </div>
        </div>
      )}

      {photosLoading && photos.length > 0 && (
        <div className="absolute top-[11vh] right-4 flex items-center gap-2 text-xs text-gray-400 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Actualizando...</span>
        </div>
      )}
    </div>
  );
};

