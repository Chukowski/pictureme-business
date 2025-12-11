/**
 * ViewerStationPage
 * 
 * Viewer station for album mode events.
 * Features:
 * - Scan badge to view album
 * - Display album photos
 * - Pay to unlock (if enabled)
 * - Print queue button (staff only)
 * - Show on big screen option
 * 
 * No camera functionality - view only.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useEventConfig } from '@/hooks/useEventConfig';
import { useEventContext } from '@/contexts/EventContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Eye,
  QrCode,
  Lock,
  CreditCard,
  Printer,
  Monitor,
  Download,
  Share2,
  Loader2,
  CheckCircle2,
  Camera,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { getAlbum, getAlbumPhotos, requestAlbumPayment, requestBigScreen, Album, AlbumPhoto } from '@/services/eventsApi';
import { ScanAlbumQR } from '@/components/album';
import { StaffPINLogin } from '@/components/staff';
import { isMockMode, getMockAlbumByCode, MockAlbum } from '@/dev/mockAlbums';
import { broadcastToBigScreen } from '@/services/bigScreenBroadcast';

type ViewerState = 'pin' | 'scan' | 'loading' | 'viewing' | 'error';

export function ViewerStationPage() {
  // Try to get config from context first (for short URLs)
  const eventContext = useEventContext();
  const params = useParams<{ userSlug: string; eventSlug: string }>();
  
  const userSlug = eventContext?.userSlug || params.userSlug || '';
  const eventSlug = eventContext?.eventSlug || params.eventSlug || '';
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Only fetch if not provided by context
  const { config: fetchedConfig, loading: fetchLoading, error: fetchError } = useEventConfig(
    eventContext?.config ? '' : userSlug, 
    eventContext?.config ? '' : eventSlug
  );
  
  const config = eventContext?.config || fetchedConfig;
  const configLoading = eventContext?.config ? false : fetchLoading;
  const configError = eventContext?.config ? null : fetchError;

  // Start directly in scan mode - no PIN required for viewer station
  const [state, setState] = useState<ViewerState>('scan');
  const [album, setAlbum] = useState<Album | MockAlbum | null>(null);
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [showQRScanner, setShowQRScanner] = useState(true); // Start with scanner open
  const [manualCode, setManualCode] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isPinVerified, setIsPinVerified] = useState(true); // Auto-verified for viewer

  // Check for album code in URL
  const albumCode = searchParams.get('album');
  const stationId = searchParams.get('station');
  const useMock = isMockMode();

  // Load album when code is available
  const loadAlbum = useCallback(async (code: string) => {
    setState('loading');
    try {
      if (useMock) {
        const mockAlbum = getMockAlbumByCode(code);
        if (mockAlbum) {
          setAlbum(mockAlbum);
          setPhotos(mockAlbum.photos.map(p => ({
            id: parseInt(p.id.replace('p', '')),
            album_id: parseInt(mockAlbum.id.replace('album-', '')),
            photo_url: p.url,
            thumbnail_url: p.thumbnail_url,
            created_at: p.created_at,
          })));
          setState('viewing');
        } else {
          toast.error('Album not found');
          setState('scan');
        }
      } else {
        const [albumData, photosData] = await Promise.all([
          getAlbum(code),
          getAlbumPhotos(code),
        ]);
        setAlbum(albumData);
        setPhotos(photosData);
        setState('viewing');
      }
    } catch (error) {
      console.error('Failed to load album:', error);
      toast.error('Failed to load album');
      setState('scan');
    }
  }, [useMock]);

  // Initialize based on URL params
  useEffect(() => {
    if (isPinVerified && albumCode) {
      loadAlbum(albumCode);
    } else if (isPinVerified) {
      setState('scan');
    }
  }, [isPinVerified, albumCode, loadAlbum]);

  // Handle PIN verification
  const handlePinVerified = () => {
    setIsPinVerified(true);
    if (albumCode) {
      loadAlbum(albumCode);
    } else {
      setState('scan');
    }
  };

  // Handle QR scan - also sends to Big Screen Display
  const handleScan = (code: string) => {
    setShowQRScanner(false);
    navigate(`/${userSlug}/${eventSlug}/viewer?album=${code}${stationId ? `&station=${stationId}` : ''}`);
    loadAlbum(code);
    
    // Send album to Big Screen Display via localStorage
    localStorage.setItem(`display_album_${eventSlug}`, code);
    console.log(`📺 Sent album ${code} to Big Screen Display`);
  };

  // Handle manual code entry
  const handleManualEntry = () => {
    if (!manualCode.trim()) return;
    handleScan(manualCode.trim().toUpperCase());
  };

  // Handle print queue
  const handlePrintQueue = () => {
    toast.info('Added to print queue');
    // TODO: Implement print queue API
  };

  // Handle big screen - send album to big screen via API
  const handleBigScreen = async () => {
    if (!album || !config?.postgres_event_id) {
      toast.error('Cannot send to Big Screen - missing album or event info');
      return;
    }

    // Determine if album is paid
    const albumIsPaid = album.payment_status === 'paid' || album.status === 'paid';

    try {
      const success = await broadcastToBigScreen({
        albumCode: album.code,
        visitorName: album.owner_name,
        isPaid: albumIsPaid,
        eventId: config.postgres_event_id,
        userSlug,
        eventSlug,
      });

      if (success) {
        toast.success(`Album ${album.code} sent to Big Screen!`);
      } else {
        toast.error('Failed to send to Big Screen');
      }
    } catch (error) {
      console.error('Failed to send to Big Screen:', error);
      toast.error('Failed to send to Big Screen');
    }
  };

  // Handle payment request (visitor wants to pay at counter)
  const handleRequestPayment = async () => {
    if (!album) return;
    setIsUnlocking(true);
    try {
      await requestAlbumPayment(album.code);
      
      // Also broadcast via BroadcastChannel for same-origin tabs (backup for WebSocket/polling)
      try {
        const channel = new BroadcastChannel('pictureme_staff_notifications');
        channel.postMessage({
          type: 'payment_request',
          data: {
            code: album.code,
            owner_name: album.owner_name,
            photo_count: photos.length,
            created_at: new Date().toISOString(),
          }
        });
        channel.close();
        console.log('💳 BroadcastChannel payment request sent');
      } catch (e) {
        console.log('BroadcastChannel not supported');
      }
      
      toast.success('Payment request sent! Staff will assist you shortly.', {
        duration: 10000,
      });
    } catch (error) {
      console.error('Failed to request payment:', error);
      toast.error('Failed to send payment request');
    } finally {
      setIsUnlocking(false);
    }
  };

  // Handle big screen request (send notification to staff who will approve)
  const handleRequestBigScreen = async () => {
    if (!album) return;
    console.log('📺 Requesting big screen for album:', album.code);
    try {
      const result = await requestBigScreen(album.code);
      console.log('📺 Big screen request result:', result);
      
      // Also broadcast via BroadcastChannel for same-origin tabs (backup for WebSocket)
      try {
        const channel = new BroadcastChannel('pictureme_staff_notifications');
        channel.postMessage({
          type: 'bigscreen_request',
          data: {
            code: album.code,
            owner_name: album.owner_name,
            photo_count: photos.length,
            created_at: new Date().toISOString(),
          }
        });
        channel.close();
        console.log('📺 BroadcastChannel message sent');
      } catch (e) {
        console.log('BroadcastChannel not supported');
      }
      
      toast.success('Request sent! Staff will display your photos shortly.', {
        duration: 10000,
      });
    } catch (error) {
      console.error('Failed to request big screen:', error);
      toast.error('Failed to send request');
    }
  };

  // Loading state
  if (configLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // Error state
  if (configError || !config) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Card className="bg-zinc-900 border-zinc-800 max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-red-400">Event not found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate('/')}
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const primaryColor = config.theme?.primaryColor || '#6366F1';
  
  // Album is unlocked ONLY if:
  // - payment_status is 'paid' (payment processed) OR
  // - status is 'paid' (staff manually marked as paid)
  // 'completed' status means photos are done, NOT that payment is done
  // printReady = payment wall enabled (same logic as AlbumFeedPage)
  const isPaid = album && (
    ('payment_status' in album && album.payment_status === 'paid') ||
    ('status' in album && album.status === 'paid')
  );
  const requiresPayment = config.albumTracking?.rules?.printReady === true && !isPaid;
  
  // Free preview settings (same logic as AlbumFeedPage)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allowFreePreview = (config as any)?.rules?.allowFreePreview === true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blurOnUnpaidGallery = (config as any)?.rules?.blurOnUnpaidGallery !== false;
  
  // isLocked = show full lock screen (no photos visible)
  // If allowFreePreview is enabled, show photos with watermark instead
  const isLocked = requiresPayment && !allowFreePreview;
  
  // Apply blur only if blurOnUnpaidGallery is enabled AND payment required AND not in free preview
  const applyBlur = requiresPayment && blurOnUnpaidGallery && !allowFreePreview;
  
  // Apply watermark if payment required (with or without free preview)
  const applyWatermark = requiresPayment;
  const watermarkText = config?.branding?.watermark?.text || config?.theme?.brandName || 'PREVIEW';
  
  // Downloads blocked if payment required
  const downloadsBlocked = requiresPayment;

  // When in scan mode, show the QR scanner directly (full screen)
  if (state === 'scan' || state === 'pin') {
    return (
      <ScanAlbumQR
        onScan={handleScan}
        onCancel={undefined} // No cancel - this is the main view
        title="Scan Badge QR Code"
        subtitle="Point the camera at the QR code on the visitor's badge"
        primaryColor={primaryColor}
        allowManualEntry={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header - only shown when viewing album */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <Eye className="w-5 h-5" style={{ color: primaryColor }} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Viewer Station</h1>
              <p className="text-sm text-zinc-400">{config.title}</p>
            </div>
          </div>
          {album && (
            <Badge variant="outline" className="border-zinc-700 text-zinc-300">
              Album: {album.code}
            </Badge>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">

        {/* Loading */}
        {state === 'loading' && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-12 h-12 animate-spin mb-4" style={{ color: primaryColor }} />
            <p className="text-zinc-400">Loading album...</p>
          </div>
        )}

        {/* Viewing Album */}
        {state === 'viewing' && album && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Album Header */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setAlbum(null);
                        setPhotos([]);
                        setState('scan');
                        navigate(`/${userSlug}/${eventSlug}/viewer`);
                      }}
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                      <h2 className="text-xl font-semibold text-white">
                        {album.owner_name || 'Guest'}'s Album
                      </h2>
                      <p className="text-sm text-zinc-400">
                        {photos.length} photos • Code: {album.code}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {requiresPayment ? (
                      <Badge className={allowFreePreview ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}>
                        <Lock className="w-3 h-3 mr-1" />
                        {allowFreePreview ? 'Preview' : 'Locked'}
                      </Badge>
                    ) : (
                      <Badge className="bg-green-500/20 text-green-400">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Unlocked
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Action buttons - mobile optimized */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mt-4 pt-4 border-t border-zinc-800">
                  {/* Scan Another - Primary action for viewer station */}
                  <Button
                    size="sm"
                    onClick={() => {
                      setAlbum(null);
                      setPhotos([]);
                      setShowQRScanner(true);
                      setState('scan');
                      navigate(`/${userSlug}/${eventSlug}/viewer`);
                    }}
                    variant="outline"
                    className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 text-xs sm:text-sm"
                  >
                    <QrCode className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Scan Another
                  </Button>
                  
                  {/* Request Payment - Visitor action to notify staff */}
                  {requiresPayment && (
                    <Button
                      size="sm"
                      onClick={handleRequestPayment}
                      disabled={isUnlocking}
                      style={{ backgroundColor: primaryColor }}
                      className="text-xs sm:text-sm"
                    >
                      {isUnlocking ? (
                        <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                      ) : (
                        <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      )}
                      Pay
                    </Button>
                  )}
                  
                  {/* Big Screen Request - sends notification to staff */}
                  <Button 
                    size="sm"
                    variant="outline" 
                    onClick={handleRequestBigScreen} 
                    className="border-zinc-700 text-xs sm:text-sm"
                  >
                    <Monitor className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Big Screen
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => loadAlbum(album.code)}
                    className="border-zinc-700 text-xs sm:text-sm"
                  >
                    <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Photo Grid - matches AlbumFeedPage layout */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative group rounded-xl overflow-hidden border-2 border-white/10 hover:border-white/30 transition-all cursor-pointer"
                  onClick={() => !downloadsBlocked && setSelectedPhoto(photo.photo_url)}
                >
                  <img
                    src={photo.thumbnail_url || photo.photo_url}
                    alt="Album photo"
                    className={`w-full aspect-[3/4] object-cover transition-transform group-hover:scale-105 ${applyBlur ? 'blur-md' : ''}`}
                  />
                  
                  {/* Watermark overlay - shown when payment required */}
                  {applyWatermark && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div 
                        className="text-white/30 text-lg sm:text-2xl font-bold transform -rotate-45 select-none"
                        style={{ textShadow: '0 0 10px rgba(0,0,0,0.5)' }}
                      >
                        {watermarkText}
                      </div>
                    </div>
                  )}
                  
                  {/* Hover overlay with expand icon */}
                  {!isLocked && !downloadsBlocked && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="bg-black/50 backdrop-blur-sm rounded-full p-2 sm:p-3">
                        <Eye className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                      </div>
                    </div>
                  )}
                  
                  {/* Lock overlay - only shown when fully locked (not free preview) */}
                  {isLocked && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {photos.length === 0 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="py-16 text-center">
                  <Camera className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
                  <p className="text-zinc-400">No photos in this album yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Photo Lightbox */}
        {selectedPhoto && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <img
              src={selectedPhoto}
              alt="Full size"
              className="max-w-full max-h-full object-contain"
            />
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
              <Button variant="secondary" onClick={(e) => {
                e.stopPropagation();
                // Download logic
                const link = document.createElement('a');
                link.href = selectedPhoto;
                link.download = 'photo.jpg';
                link.click();
              }}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button variant="secondary" onClick={(e) => {
                e.stopPropagation();
                navigator.share?.({ url: selectedPhoto });
              }}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default ViewerStationPage;

