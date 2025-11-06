import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEventConfig } from '@/hooks/useEventConfig';
import { useEventPhotos } from '@/hooks/useEventPhotos';
import { Loader2 } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { QRCodeSVG } from 'qrcode.react';

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
    <div className="min-h-screen bg-gradient-dark flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3 text-center">
          <h1 className="text-2xl font-bold text-white tracking-wide uppercase">
            {config.title} <span className="text-sm font-normal text-gray-400 ml-2">• Live Photo Experience</span>
          </h1>
        </div>
      </div>

      {/* Photo Carousel */}
      <div className="flex-1 w-full px-0 py-8 mb-8">
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

        {photos.length > 0 && (
          <div className="relative flex-1 flex items-center justify-center">
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
              <CarouselContent className="h-full">
                {displayPhotos.map((photo, index) => {
                  const downloadUrl = photo.processed_image_url || photo.original_image_url || '';

                  return (
                    <CarouselItem key={`${photo.id ?? photo.share_code}-${index}`} className="flex items-center justify-center basis-auto pl-3 pr-3 first:pl-6 last:pr-6">
                      <div className="flex flex-col items-center gap-4">
                        {/* Main Photo Card */}
                        <div className="relative w-[280px] h-[500px] rounded-[2rem] overflow-hidden border-2 border-white/10 bg-black shadow-2xl">
                          <img
                            src={photo.processed_image_url}
                            alt={photo.background_name || 'Event photo'}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* QR Bar Below */}
                        <div className="w-[280px] bg-black/90 rounded-[1.5rem] border border-white/10 p-4 flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-[9px] uppercase tracking-[0.3em] text-gray-400 mb-1">Share Code</p>
                            <p className="text-xl font-mono tracking-[0.5em] text-white mb-1">{photo.share_code}</p>
                            <p className="text-[10px] text-gray-300">Escanea el QR</p>
                          </div>
                          <div className="bg-white p-2 rounded-xl shadow-lg">
                            {downloadUrl ? (
                              <QRCodeSVG value={downloadUrl} size={72} level="Q" includeMargin={false} />
                            ) : (
                              <div className="w-[72px] h-[72px] flex items-center justify-center text-[10px] text-gray-500">
                                QR
                              </div>
                            )}
                          </div>
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

      {/* Strip Footer - Separated */}
      {photos.length > 0 && (
        <div className="w-full">
          <div className="bg-[#36454F] border-t border-white/5 py-4">
            <div className="text-center text-[10px] uppercase tracking-[0.5em] text-gray-300 mb-3 px-4">
              All Photos
            </div>
            <div className="relative w-full overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#36454F] via-[#36454F]/60 to-transparent pointer-events-none z-10" />
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#36454F] via-[#36454F]/60 to-transparent pointer-events-none z-10" />
              <div
                ref={stripRef}
                className="flex gap-2 overflow-x-auto overflow-y-hidden py-2 px-3"
                style={{ 
                  scrollbarWidth: 'none', 
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                {stripPhotos.map((photo, index) => (
                  <div
                    key={`${photo.id ?? photo.share_code ?? index}-thumb-${index}`}
                    className="flex-shrink-0 w-[100px] sm:w-[110px] lg:w-[120px] rounded-xl overflow-hidden border border-white/20 bg-black shadow-lg transition-transform hover:scale-105"
                  >
                    <div className="relative w-full" style={{ paddingBottom: '177.78%' }}>
                      <img
                        src={photo.processed_image_url}
                        alt={photo.background_name || 'Event photo thumbnail'}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {photosLoading && photos.length === 0 && (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-gray-400 mt-4">Loading photos...</p>
        </div>
      )}

      {photosLoading && photos.length > 0 && (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mt-6">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Actualizando feed...</span>
        </div>
      )}
    </div>
  );
};

