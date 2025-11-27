import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEventConfig } from '@/hooks/useEventConfig';
import { useEventPhotos } from '@/hooks/useEventPhotos';
import { Loader2 } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { QRCodeSVG } from 'qrcode.react';
import { BorderBeam } from '@/components/BorderBeam';
import { EventNotFound, FeedNotAvailable } from '@/components/EventNotFound';
import clsx from 'clsx';

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
  const themeMode = config?.theme?.mode ?? 'dark';
  const isDarkMode = themeMode === 'dark';

  // Apply theme when config loads
  useEffect(() => {
    if (config?.theme) {
      document.documentElement.style.setProperty('--brand-primary', config.theme.primaryColor || '#009999');
      document.documentElement.style.setProperty('--brand-secondary', config.theme.secondaryColor || '#ee6602');

      if (isDarkMode) {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    }
  }, [config, isDarkMode]);

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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-white text-lg">Loading event feed...</p>
        </div>
      </div>
    );
  }

  if (configError || !config) {
    return (
      <EventNotFound 
        message={configError || "Este evento no existe o ya no está activo."}
        eventSlug={eventSlug}
      />
    );
  }

  if (!config.settings?.feedEnabled) {
    return <FeedNotAvailable />;
  }

  return (
    <div
      className={clsx(
        "h-screen flex flex-col overflow-hidden transition-colors duration-500",
        isDarkMode ? "bg-zinc-950" : "bg-slate-50"
      )}
    >
      {/* Header - Fixed height in vh */}
      <div
        className={clsx(
          "h-[8vh] min-h-[50px] max-h-[80px] flex-shrink-0 border-b backdrop-blur-xl transition-all duration-500",
          isDarkMode
            ? "border-white/10 bg-zinc-900/80"
            : "border-slate-200 bg-white/80 shadow-sm"
        )}
      >
        <div className="h-full flex flex-col items-center justify-center px-4 sm:px-6 text-center">
          <h1
            className={clsx(
              "text-lg sm:text-xl lg:text-2xl font-semibold tracking-[0.35em] uppercase truncate max-w-full transition-colors duration-300",
              isDarkMode ? "text-white/90" : "text-slate-900"
            )}
          >
            {config.title}
          </h1>
          {config.description && (
            <p
              className={clsx(
                "mt-0.5 text-[9px] sm:text-[10px] uppercase tracking-[0.5em] truncate max-w-full transition-colors duration-300",
                isDarkMode ? "text-white/50" : "text-slate-500"
              )}
            >
              {config.description}
            </p>
          )}
        </div>
      </div>

      {/* Photo Carousel - Takes remaining space minus strip footer */}
      <div className="flex-1 w-full overflow-hidden relative flex items-center justify-center pt-4 sm:pt-6">
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
              <p className={clsx("text-xl", isDarkMode ? "text-zinc-400" : "text-slate-400")}>No photos yet</p>
              <p className={clsx("text-sm mt-2", isDarkMode ? "text-zinc-500" : "text-slate-500")}>
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
                        <div
                          className={clsx(
                            "relative w-full max-h-[55vh] aspect-[3/5] rounded-xl overflow-hidden border backdrop-blur-sm transition-all duration-500",
                            isDarkMode
                              ? "border-white/10 bg-zinc-900/50 shadow-2xl"
                              : "border-slate-200 bg-white/60 shadow-xl"
                          )}
                        >
                          <div
                            className={clsx(
                              "absolute inset-0 pointer-events-none transition-colors duration-500",
                              isDarkMode
                                ? "bg-gradient-to-b from-white/5 via-transparent to-black/45"
                                : "bg-gradient-to-b from-white/40 via-transparent to-slate-900/5"
                            )}
                          />
                          <img
                            src={photo.processed_image_url}
                            alt={photo.background_name || 'Event photo'}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* QR Bar Below - Compact and responsive */}
                        <div
                          className={clsx(
                            "relative w-full mt-3 sm:mt-4 rounded-[1.2rem] border backdrop-blur-md p-2.5 sm:p-3 lg:p-4 flex items-center justify-between gap-3 overflow-hidden transition-all duration-500",
                            isDarkMode
                              ? "border-white/10 bg-zinc-900/50 shadow-lg"
                              : "border-slate-200 bg-white/80 shadow-md"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <p
                              className={clsx(
                                "text-[8px] sm:text-[9px] uppercase tracking-[0.4em] mb-0.5 transition-colors duration-300",
                                isDarkMode ? "text-white/60" : "text-slate-500"
                              )}
                            >
                              Share Code
                            </p>
                            <p
                              className={clsx(
                                "text-sm sm:text-base lg:text-lg xl:text-xl font-mono tracking-[0.5em] truncate drop-shadow-sm transition-colors duration-300",
                                isDarkMode ? "text-white" : "text-slate-800"
                              )}
                            >
                              {photo.share_code}
                            </p>
                            <p
                              className={clsx(
                                "text-[8px] sm:text-[9px] mt-1 transition-colors duration-300",
                                isDarkMode ? "text-white/70" : "text-slate-500"
                              )}
                            >
                              Escanea el QR
                            </p>
                          </div>
                          <div
                            className={clsx(
                              "p-1.5 sm:p-2 lg:p-2.5 rounded-xl flex-shrink-0 border transition-all duration-300",
                              isDarkMode
                                ? "border-white/40 bg-white/95 shadow-xl"
                                : "border-slate-200 bg-white shadow-sm"
                            )}
                          >
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
        <div
          className={clsx(
            "h-[25vh] min-h-[200px] max-h-[280px] flex-shrink-0 w-full border-t backdrop-blur-2xl transition-all duration-500",
            isDarkMode
              ? "border-white/10 bg-zinc-950/90"
              : "border-slate-200 bg-white/90 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)]"
          )}
        >
          <div className="h-full flex flex-col justify-center px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <span
                className={clsx(
                  "text-[11px] sm:text-xs uppercase tracking-[0.5em] transition-colors duration-300",
                  isDarkMode ? "text-white/60" : "text-slate-500"
                )}
              >
                Timeline
              </span>
              <div
                className={clsx(
                  "hidden sm:flex items-center gap-1.5 text-[10px] transition-colors duration-300",
                  isDarkMode ? "text-white/50" : "text-slate-500"
                )}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Updating
              </div>
            </div>
            <div className="relative flex-1 min-h-0">
              <div
                className={clsx(
                  "pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-16 z-10 transition-opacity duration-300",
                  isDarkMode
                    ? "bg-gradient-to-r from-black/90 via-black/65 to-transparent"
                    : "bg-gradient-to-r from-white via-white/70 to-transparent"
                )}
              />
              <div
                className={clsx(
                  "pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-16 z-10 transition-opacity duration-300",
                  isDarkMode
                    ? "bg-gradient-to-l from-black/90 via-black/65 to-transparent"
                    : "bg-gradient-to-l from-white via-white/70 to-transparent"
                )}
              />
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
                    className={clsx(
                      "flex-shrink-0 h-full aspect-[9/16] rounded-xl overflow-hidden border transition-all duration-300",
                      isDarkMode
                        ? "border-white/10 bg-zinc-800/50 backdrop-blur md:hover:-translate-y-1 md:hover:shadow-[0_16px_40px_-24px_rgba(0,0,0,0.7)]"
                        : "border-slate-200 bg-white shadow-sm md:hover:-translate-y-1 md:hover:shadow-lg"
                    )}
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
        <div
          className={clsx(
            "absolute top-[11vh] right-4 flex items-center gap-2 text-xs px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors duration-300",
            isDarkMode
              ? "text-gray-400 bg-black/50 border border-white/10"
              : "text-slate-600 bg-white/90 border border-slate-200 shadow-sm"
          )}
        >
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Actualizando...</span>
        </div>
      )}
    </div>
  );
};

