import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useEventConfig } from '@/hooks/useEventConfig';
import { Loader2 } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { CameraCapture } from '@/components/CameraCapture';
import { BackgroundSelector } from '@/components/BackgroundSelector';
import { ProcessingLoader } from '@/components/ProcessingLoader';
import { ResultDisplay } from '@/components/ResultDisplay';
import { EventTitle } from '@/components/EventTitle';
import { CustomPromptModal } from '@/components/CustomPromptModal';
import ShaderBackground from '@/components/ShaderBackground';
import { processImageWithAI, downloadImageAsBase64 } from '@/services/aiProcessor';
import { toast } from 'sonner';
import { Template } from '@/services/eventsApi';
import { saveProcessedPhoto, getAllPhotos } from '@/services/localStorage';
import { EventNotFound } from '@/components/EventNotFound';
import { ScanBadgePrompt, AlbumProgress, AlbumResultActions } from '@/components/album';

type AppState = 'select' | 'camera' | 'processing' | 'result' | 'custom-prompt' | 'scan-badge';

// Mock album data - will be replaced with real API calls
interface AlbumData {
  id: string;
  visitorName?: string;
  visitorNumber?: number;
  currentPhotos: number;
  maxPhotos: number;
  currentStation?: string;
}

export const PhotoBoothPage = () => {
  const { userSlug, eventSlug } = useParams<{ userSlug: string; eventSlug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { config, loading, error } = useEventConfig(userSlug!, eventSlug!);

  // Album Tracking
  const albumId = searchParams.get('album');
  const isAlbumMode = useMemo(() => {
    return config?.albumTracking?.enabled === true;
  }, [config]);
  
  // Mock album data - in production, this would come from an API
  const [albumData, setAlbumData] = useState<AlbumData | null>(null);

  const [state, setState] = useState<AppState>('select');
  const [selectedBackground, setSelectedBackground] = useState<Template | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string>('');
  const [processedPhoto, setProcessedPhoto] = useState<string>('');
  const [shareCode, setShareCode] = useState<string>('');
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [showCustomPromptModal, setShowCustomPromptModal] = useState(false);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [customImages, setCustomImages] = useState<string[]>([]);

  // Initialize album mode
  useEffect(() => {
    if (isAlbumMode && !albumId) {
      // Album tracking enabled but no album ID - show scan badge prompt
      setState('scan-badge');
    } else if (isAlbumMode && albumId) {
      // Load album data (mock for now)
      setAlbumData({
        id: albumId,
        visitorNumber: Math.floor(Math.random() * 1000) + 1,
        currentPhotos: 0,
        maxPhotos: config?.albumTracking?.rules?.maxPhotosPerAlbum || 5,
        currentStation: 'Photo Booth',
      });
      setState('select');
    }
  }, [isAlbumMode, albumId, config]);

  // Fire celebratory confetti when the AI result is ready
  useEffect(() => {
    if (state !== 'result') {
      return;
    }

    let isCancelled = false;
    let intervalId: number | undefined;
    let timeoutId: number | undefined;

    import('canvas-confetti').then((module) => {
      if (isCancelled) {
        return;
      }

      const confetti = module.default ?? module;
      const defaults = {
        spread: 120,
        startVelocity: 46,
        ticks: 90,
        gravity: 0.9,
        scalar: 0.9,
        zIndex: 2200,
      };

      const shoot = () => {
        confetti({
          ...defaults,
          particleCount: 90,
          origin: { x: 0.2, y: 0.75 },
          angle: 60,
        });

        confetti({
          ...defaults,
          particleCount: 90,
          origin: { x: 0.8, y: 0.75 },
          angle: 120,
        });
      };

      shoot();
      intervalId = window.setInterval(shoot, 420);
      timeoutId = window.setTimeout(() => {
        if (intervalId !== undefined) {
          window.clearInterval(intervalId);
        }
      }, 2400);
    });

    return () => {
      isCancelled = true;
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [state]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-white text-lg">Loading event...</p>
        </div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <EventNotFound 
        message={error || "Este evento no existe o ya no está activo."}
        eventSlug={eventSlug}
      />
    );
  }

  const handleBackgroundSelect = (template: Template) => {
    setSelectedBackground(template);

    // If it's a custom prompt template, show the modal first
    if (template.isCustomPrompt) {
      setShowCustomPromptModal(true);
    } else {
      setState('camera');
    }
  };

  const handleCustomPromptSubmit = (prompt: string, selectedImages: string[]) => {
    console.log('📝 Custom prompt submitted:', { prompt, images: selectedImages.length });
    setCustomPrompt(prompt);
    setCustomImages(selectedImages);
    // Close modal first
    setShowCustomPromptModal(false);
    // Then change state to camera
    setTimeout(() => {
      console.log('📸 Changing state to camera');
      setState('camera');
    }, 100);
  };

  // Get all available images from all templates in the event
  const getAllEventImages = (): string[] => {
    if (!config?.templates) return [];
    const allImages = new Set<string>();
    config.templates.forEach((template) => {
      template.images.forEach((img) => allImages.add(img));
    });
    return Array.from(allImages);
  };

  const handlePhotoCapture = async (imageData: string) => {
    if (!selectedBackground) {
      toast.error("No background selected");
      return;
    }

    setCapturedPhoto(imageData);
    setState("processing");
    setProcessingStatus("Preparing your photo...");

    try {
      // Determine branding settings based on template toggles
      const includeBranding = selectedBackground.includeBranding ?? true;
      const includeHeader = includeBranding && (selectedBackground.includeHeader ?? false);
      const includeTagline = includeBranding && (selectedBackground.includeTagline ?? true);
      const includeWatermark = includeBranding && (selectedBackground.includeWatermark ?? true);

      // Use custom prompt and images if this is a custom prompt template
      const promptToUse = selectedBackground.isCustomPrompt && customPrompt
        ? customPrompt
        : selectedBackground.prompt;

      const imagesToUse = selectedBackground.isCustomPrompt && customImages.length > 0
        ? customImages
        : (selectedBackground.images || []);

      // Only pass branding elements if they're explicitly set (not empty strings)
      const tagline = includeTagline && config?.branding?.taglineText && config.branding.taglineText.trim()
        ? config.branding.taglineText
        : undefined;

      const logo = includeHeader && config?.branding?.logoPath && config.branding.logoPath.trim()
        ? config.branding.logoPath
        : undefined;

      const footer = config?.branding?.footerPath && config.branding.footerPath.trim()
        ? config.branding.footerPath
        : undefined;

      const result = await processImageWithAI({
        userPhotoBase64: imageData,
        backgroundPrompt: promptToUse,
        backgroundImageUrls: imagesToUse,
        includeBranding,
        includeHeader,
        campaignText: selectedBackground.campaignText,
        taglineText: tagline,
        logoUrl: logo,
        footerUrl: footer,
        headerBackgroundColor: config?.branding?.headerBackgroundColor,
        watermark: includeWatermark ? config?.branding?.watermark : undefined,
        onProgress: (status) => {
          if (status === "queued") {
            setProcessingStatus("Waiting in queue...");
          } else if (status === "processing") {
            setProcessingStatus("AI is working its magic...");
          } else if (status === "applying_branding") {
            setProcessingStatus("Applying branding...");
          }
        }
      });

      setProcessingStatus("Finalizing...");

      let processedBase64: string;
      if (result.url.startsWith('data:')) {
        processedBase64 = result.url;
      } else {
        processedBase64 = await downloadImageAsBase64(result.url);
      }

      try {
        const savedPhoto = await saveProcessedPhoto({
          originalImageBase64: imageData,
          processedImageBase64: processedBase64,
          backgroundId: selectedBackground.id,
          backgroundName: selectedBackground.name,
          prompt: selectedBackground.prompt,
          userSlug: config.user_slug || userSlug,
          eventSlug: config.slug || eventSlug,
        });

        if (savedPhoto.processedImageUrl) {
          setProcessedPhoto(savedPhoto.processedImageUrl);
        } else {
          setProcessedPhoto(processedBase64);
        }

        setShareCode(savedPhoto.shareCode || "");
        toast.success("Your photo is ready! 🎉");
      } catch (storageError) {
        console.warn("Storage error:", storageError);
        setProcessedPhoto(processedBase64);
        const warningMessage = storageError instanceof Error
          ? storageError.message
          : "Photo ready but could not sync with gallery";
        toast.warning(warningMessage);
      }

      // Update album data if in album mode
      if (isAlbumMode && albumData) {
        setAlbumData({
          ...albumData,
          currentPhotos: albumData.currentPhotos + 1,
        });
      }

      setState("result");
    } catch (error) {
      console.error("Processing error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to process photo. Please try again.";
      toast.error(errorMessage);
      setProcessedPhoto(imageData);
      setShareCode('');
      setState("result");
    }
  };

  const handleReset = () => {
    setState('select');
    setSelectedBackground(null);
    setCapturedPhoto('');
    setProcessedPhoto('');
    setShareCode('');
  };

  // Album-specific handlers
  const handleViewAlbum = () => {
    if (albumId && userSlug && eventSlug) {
      navigate(`/${userSlug}/${eventSlug}/album/${albumId}`);
    }
  };

  const canTakeMorePhotos = useMemo(() => {
    if (!isAlbumMode || !albumData) return true;
    return albumData.currentPhotos < albumData.maxPhotos;
  }, [isAlbumMode, albumData]);

  return (
    <div className="min-h-screen bg-zinc-950 relative">
      {/* Scan Badge Prompt - Album Mode without album ID */}
      {state === 'scan-badge' && (
        <ScanBadgePrompt
          eventName={config.title}
          brandName={config.theme?.brandName || 'PictureMe.Now'}
          primaryColor={config.theme?.primaryColor}
          onManualEntry={() => {
            const code = prompt('Enter your album code:');
            if (code) {
              navigate(`/${userSlug}/${eventSlug}?album=${code}`);
            }
          }}
        />
      )}

      {/* Album Progress Bar - shown in album mode */}
      {isAlbumMode && albumData && state !== 'scan-badge' && state !== 'processing' && (
        <div className="fixed top-4 left-4 right-4 z-50">
          <AlbumProgress
            albumId={albumData.id}
            visitorName={albumData.visitorName}
            visitorNumber={albumData.visitorNumber}
            currentPhotos={albumData.currentPhotos}
            maxPhotos={albumData.maxPhotos}
            currentStation={albumData.currentStation}
            primaryColor={config.theme?.primaryColor}
          />
        </div>
      )}

      {/* Only show title in select state */}
      {state === 'select' && (
        <div className={isAlbumMode && albumData ? 'pt-24' : ''}>
          <EventTitle
            eventName={config.title}
            description={config.description}
            brandName={config.theme?.brandName || 'AI Photobooth'}
          />
        </div>
      )}

      {state === 'select' && (
        <BackgroundSelector
          onSelectBackground={handleBackgroundSelect}
          templates={config.templates}
        />
      )}

      {state === 'camera' && selectedBackground && (
        <CameraCapture
          onCapture={handlePhotoCapture}
          onBack={() => setState('select')}
          selectedBackground={selectedBackground.name}
          lastPhotoUrl={(() => {
            const photos = getAllPhotos();
            const eventPhotos = photos.filter(p => p.eventSlug === (config?.slug || eventSlug));
            return eventPhotos.length > 0 ? (eventPhotos[0].processedImageUrl || eventPhotos[0].processedImageBase64) : undefined;
          })()}
        />
      )}

      {state === 'processing' && (
        <ProcessingLoader status={processingStatus} />
      )}

      {/* Result Display - different for album mode */}
      {state === 'result' && processedPhoto && (
        isAlbumMode && albumData ? (
          <div className="min-h-screen flex flex-col items-center justify-center p-6">
            <div className="max-w-md w-full">
              <img 
                src={processedPhoto} 
                alt="Your photo" 
                className="w-full rounded-2xl shadow-2xl mb-6"
              />
              <AlbumResultActions
                albumId={albumData.id}
                currentPhotos={albumData.currentPhotos}
                maxPhotos={albumData.maxPhotos}
                shareCode={shareCode}
                onTakeAnother={handleReset}
                onViewAlbum={handleViewAlbum}
                canTakeMore={canTakeMorePhotos}
                primaryColor={config.theme?.primaryColor}
              />
            </div>
          </div>
        ) : (
          <ResultDisplay
            imageUrl={processedPhoto}
            shareCode={shareCode}
            onReset={handleReset}
          />
        )
      )}

      {/* Custom Prompt Modal */}
      {selectedBackground && (
        <CustomPromptModal
          isOpen={showCustomPromptModal}
          onClose={() => {
            setShowCustomPromptModal(false);
            setState('select'); // Go back to selection if modal is closed
          }}
          onSubmit={handleCustomPromptSubmit}
          availableImages={getAllEventImages()}
          template={selectedBackground}
        />
      )}

      {/* Shader Background - Only visible in dark mode and select state, positioned near bottom with fade */}
      {state === 'select' && (
        <div className="hidden dark:block fixed bottom-0 left-0 right-0 h-[40vh] pointer-events-none z-0">
          <div className="absolute inset-0 [mask-image:linear-gradient(to_top,black_20%,transparent_100%)]">
            <ShaderBackground />
          </div>
        </div>
      )}
    </div>
  );
};

