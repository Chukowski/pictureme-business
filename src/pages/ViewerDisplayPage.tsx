/**
 * ViewerDisplayPage - Big Screen Display for Viewer Station
 * 
 * This page is meant to be displayed on a large TV/monitor at events.
 * When a visitor scans their QR code at the viewer station, their album
 * appears on this screen with a beautiful slideshow.
 * 
 * Features:
 * - Full-screen photo slideshow
 * - Auto-advances through photos
 * - Shows visitor name and album info
 * - Real-time updates via polling
 * - Idle screen with event branding when no album is active
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useEventConfig } from '@/hooks/useEventConfig';
import { Loader2, Camera, QrCode, Sparkles } from 'lucide-react';
import { getAlbum, getAlbumPhotos } from '@/services/eventsApi';
import { QRCodeSVG } from 'qrcode.react';

interface DisplayPhoto {
  id: string;
  url: string;
  templateName?: string;
}

interface DisplayAlbum {
  code: string;
  ownerName?: string;
  photoCount: number;
  photos: DisplayPhoto[];
}

export default function ViewerDisplayPage() {
  const { userSlug, eventSlug } = useParams<{ userSlug: string; eventSlug: string }>();
  const [searchParams] = useSearchParams();
  const { config, loading } = useEventConfig(userSlug!, eventSlug!);
  
  // Current album being displayed
  const [currentAlbum, setCurrentAlbum] = useState<DisplayAlbum | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Display state
  const [isIdle, setIsIdle] = useState(true);
  const [lastActivity, setLastActivity] = useState<Date>(new Date());
  
  // Settings
  const SLIDESHOW_INTERVAL = 5000; // 5 seconds per photo
  const IDLE_TIMEOUT = 30000; // Return to idle after 30 seconds of no new album
  const POLL_INTERVAL = 2000; // Check for new albums every 2 seconds
  
  // Refs for intervals
  const slideshowRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get theme colors
  const primaryColor = config?.theme?.primaryColor || '#06B6D4';
  const brandName = config?.theme?.brandName || config?.title || 'Photo Booth';
  
  // Load album by code
  const loadAlbum = useCallback(async (albumCode: string) => {
    try {
      const album = await getAlbum(albumCode);
      const photos = await getAlbumPhotos(albumCode);
      
      if (photos.length > 0) {
        setCurrentAlbum({
          code: albumCode,
          ownerName: album.owner_name,
          photoCount: photos.length,
          photos: photos.map((p: any) => ({
            id: p.id || p._id,
            url: p.photo_url || p.url,
            templateName: p.template_name,
          })),
        });
        setCurrentPhotoIndex(0);
        setIsIdle(false);
        setLastActivity(new Date());
      }
    } catch (error) {
      console.error('Failed to load album:', error);
    }
  }, []);
  
  // Check URL for album code (from QR scan redirect)
  useEffect(() => {
    const albumCode = searchParams.get('album');
    if (albumCode) {
      loadAlbum(albumCode);
    }
  }, [searchParams, loadAlbum]);
  
  // Slideshow auto-advance
  useEffect(() => {
    if (!currentAlbum || currentAlbum.photos.length <= 1) return;
    
    slideshowRef.current = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentPhotoIndex(prev => 
          (prev + 1) % currentAlbum.photos.length
        );
        setIsTransitioning(false);
      }, 500);
    }, SLIDESHOW_INTERVAL);
    
    return () => {
      if (slideshowRef.current) clearInterval(slideshowRef.current);
    };
  }, [currentAlbum]);
  
  // Return to idle after timeout
  useEffect(() => {
    const checkIdle = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivity.getTime();
      if (timeSinceActivity > IDLE_TIMEOUT && !isIdle) {
        setIsIdle(true);
        setCurrentAlbum(null);
      }
    }, 5000);
    
    return () => clearInterval(checkIdle);
  }, [lastActivity, isIdle]);
  
  // Poll for new albums (via localStorage or API)
  useEffect(() => {
    // Listen for album display requests from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `display_album_${eventSlug}` && e.newValue) {
        loadAlbum(e.newValue);
        // Clear the request
        localStorage.removeItem(`display_album_${eventSlug}`);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also check on interval for same-tab updates
    pollRef.current = setInterval(() => {
      const albumCode = localStorage.getItem(`display_album_${eventSlug}`);
      if (albumCode) {
        loadAlbum(albumCode);
        localStorage.removeItem(`display_album_${eventSlug}`);
      }
    }, POLL_INTERVAL);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [eventSlug, loadAlbum]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-16 h-16 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }
  
  // Idle Screen - Show when no album is being displayed
  if (isIdle || !currentAlbum) {
    const registrationUrl = `${window.location.origin}/${userSlug}/${eventSlug}/registration`;
    
    return (
      <div 
        className="min-h-screen bg-black flex flex-col items-center justify-center p-8 relative overflow-hidden"
        style={{
          background: `radial-gradient(ellipse at center, ${primaryColor}15 0%, black 70%)`,
        }}
      >
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute w-[800px] h-[800px] rounded-full blur-[150px] animate-pulse"
            style={{ 
              background: `${primaryColor}20`,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
        </div>
        
        {/* Content */}
        <div className="relative z-10 text-center space-y-8">
          {/* Logo/Brand */}
          {config?.branding?.logoPath ? (
            <img 
              src={config.branding.logoPath} 
              alt={brandName}
              className="h-24 mx-auto object-contain"
            />
          ) : (
            <div className="flex items-center justify-center gap-4">
              <Camera className="w-16 h-16" style={{ color: primaryColor }} />
              <h1 className="text-5xl font-bold text-white">{brandName}</h1>
            </div>
          )}
          
          {/* Tagline */}
          <p className="text-2xl text-zinc-400">
            {config?.theme?.tagline || 'Scan your QR code to see your photos!'}
          </p>
          
          {/* QR Code for registration */}
          <div className="mt-12 p-8 bg-white rounded-3xl inline-block">
            <QRCodeSVG 
              value={registrationUrl}
              size={200}
              level="H"
              includeMargin
            />
          </div>
          
          <p className="text-lg text-zinc-500">
            Scan to create your album
          </p>
          
          {/* Sparkle animation */}
          <div className="flex justify-center gap-2 mt-8">
            {[0, 1, 2].map(i => (
              <Sparkles 
                key={i}
                className="w-6 h-6 animate-pulse"
                style={{ 
                  color: primaryColor,
                  animationDelay: `${i * 0.3}s`,
                }}
              />
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="absolute bottom-8 text-zinc-600 text-sm">
          Powered by PictureMe.Now
        </div>
      </div>
    );
  }
  
  // Active Album Display
  const currentPhoto = currentAlbum.photos[currentPhotoIndex];
  
  return (
    <div 
      className="min-h-screen bg-black flex flex-col relative overflow-hidden"
      onContextMenu={(e) => e.preventDefault()} // Prevent right-click
    >
      {/* Photo Display */}
      <div className="flex-1 relative">
        <div 
          className={`absolute inset-0 transition-opacity duration-500 ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <img
            src={currentPhoto?.url}
            alt="Photo"
            className="w-full h-full object-contain"
            draggable={false}
          />
        </div>
        
        {/* Gradient overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/90 to-transparent" />
      </div>
      
      {/* Info Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-8">
        <div className="flex items-end justify-between">
          {/* Visitor Info */}
          <div className="space-y-2">
            {currentAlbum.ownerName && (
              <h2 className="text-4xl font-bold text-white">
                {currentAlbum.ownerName}'s Photos
              </h2>
            )}
            <p className="text-xl text-zinc-400">
              Photo {currentPhotoIndex + 1} of {currentAlbum.photos.length}
            </p>
          </div>
          
          {/* Event Branding */}
          <div className="text-right">
            {config?.branding?.logoPath ? (
              <img 
                src={config.branding.logoPath} 
                alt={brandName}
                className="h-12 ml-auto object-contain"
              />
            ) : (
              <p className="text-xl font-semibold" style={{ color: primaryColor }}>
                {brandName}
              </p>
            )}
          </div>
        </div>
        
        {/* Progress dots */}
        {currentAlbum.photos.length > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {currentAlbum.photos.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentPhotoIndex 
                    ? 'scale-125' 
                    : 'opacity-50'
                }`}
                style={{ 
                  backgroundColor: index === currentPhotoIndex ? primaryColor : '#71717A',
                }}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* QR Code to get album (small, corner) */}
      <div className="absolute top-8 right-8 p-4 bg-white/10 backdrop-blur-md rounded-2xl">
        <QRCodeSVG 
          value={`${window.location.origin}/${userSlug}/${eventSlug}/album/${currentAlbum.code}`}
          size={100}
          level="M"
          bgColor="transparent"
          fgColor="white"
        />
        <p className="text-xs text-white/70 text-center mt-2">Scan to download</p>
      </div>
    </div>
  );
}

