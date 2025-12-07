/**
 * AlbumFeedPage
 * 
 * Displays all photos in a visitor's album for multi-station events.
 * Includes staff tools for approval, sending, and presentation.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEventConfig } from '@/hooks/useEventConfig';
import { useEventContext } from '@/contexts/EventContext';
import { 
  Loader2, ArrowLeft, Download, Share2, Mail, MessageSquare, 
  CheckCircle2, XCircle, MonitorPlay, Printer, Lock, Unlock,
  QrCode, ExternalLink, CreditCard, ShoppingCart, Clock, Trash2, Camera,
  X, ChevronLeft, ChevronRight, Facebook, Twitter, Link2, Copy
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { EventNotFound } from '@/components/EventNotFound';
import { getAlbum, getAlbumPhotos, createAlbumCheckout, updateAlbumStatus, deleteAlbumPhoto, Album, sendAlbumEmail, getEmailStatus, requestAlbumPayment } from '@/services/eventsApi';
import { QRCodeSVG } from 'qrcode.react';
import { broadcastToBigScreen, clearBigScreen } from '@/services/bigScreenBroadcast';
import { ENV } from '@/config/env';

// Mock photo data - will be replaced with real API
interface AlbumPhoto {
  id: string;
  url: string;
  thumbnailUrl?: string;
  templateName: string;
  createdAt: Date;
  approved: boolean;
  stationName?: string;
}

interface AlbumInfo {
  id: string;
  visitorName?: string;
  visitorNumber?: number;
  isComplete: boolean;
  isPaid: boolean;
  createdAt: Date;
}

// Alias for photo type
type Photo = AlbumPhoto;

interface AlbumFeedPageProps {
  albumIdOverride?: string;
}

export default function AlbumFeedPage({ albumIdOverride }: AlbumFeedPageProps = {}) {
  // Try to get config from context first (for short URLs), fallback to params
  const eventContext = useEventContext();
  const params = useParams<{ 
    userSlug: string; 
    eventSlug: string; 
    albumId: string;
  }>();
  
  const userSlug = eventContext?.userSlug || params.userSlug || '';
  const eventSlug = eventContext?.eventSlug || params.eventSlug || '';
  const albumId = albumIdOverride || params.albumId;
  
  const navigate = useNavigate();
  
  // Only fetch if not provided by context
  const { config: fetchedConfig, loading: fetchLoading, error: fetchError } = useEventConfig(
    eventContext?.config ? '' : userSlug, 
    eventContext?.config ? '' : eventSlug
  );
  
  const config = eventContext?.config || fetchedConfig;
  const loading = eventContext?.config ? false : fetchLoading;
  const error = eventContext?.config ? null : fetchError;

  const [albumInfo, setAlbumInfo] = useState<AlbumInfo | null>(null);
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showStaffTools, setShowStaffTools] = useState(false);
  const [bigScreenMode, setBigScreenMode] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState(true);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareTarget, setShareTarget] = useState<'album' | Photo | null>(null);

  // Check email configuration
  useEffect(() => {
    getEmailStatus().then(status => {
      setEmailConfigured(status.configured);
    }).catch(() => {
      setEmailConfigured(false);
    });
  }, []);

  // Check if user is staff - check localStorage for current user role
  const isStaff = (() => {
    try {
      const userStr = localStorage.getItem('current_user') || localStorage.getItem('user');
      if (!userStr) return false;
      const user = JSON.parse(userStr);
      return user.role?.includes('business') || user.role === 'superadmin';
    } catch {
      return false;
    }
  })();

  // Check if staff approval is required and album is not yet approved
  const requiresStaffApproval = config?.albumTracking?.rules?.requireStaffApproval && 
                                albumInfo && 
                                albumInfo.isComplete === false;
  
  // Check if payment is required for viewing/downloads (printReady = payment wall enabled)
  const requiresPayment = config?.albumTracking?.rules?.printReady === true && albumInfo?.isPaid !== true;
  
  // Album is blocked if it needs approval OR payment (and user is not staff)
  const albumIsBlocked = !isStaff && (requiresStaffApproval || requiresPayment);
  
  // Album is completely locked - can't even see blurred photos until paid
  // When printReady is enabled, album is locked until staff marks as paid
  const albumIsLocked = !isStaff && requiresPayment;
  
  // Debug logging
  console.log('🔒 Album access check:', {
    isStaff,
    isPaid: albumInfo?.isPaid,
    printReady: config?.albumTracking?.rules?.printReady,
    requiresPayment,
    albumIsLocked,
    albumInfo: albumInfo ? { id: albumInfo.id, isPaid: albumInfo.isPaid } : null
  });
  
  // Check if hard watermark should be applied
  const applyHardWatermark = config?.branding?.watermark?.enabled || 
                            (requiresPayment && config?.rules?.hardWatermarkOnPreviews);

  // Load album data
  useEffect(() => {
    if (!albumId) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [album, photosData] = await Promise.all([
          getAlbum(albumId),
          getAlbumPhotos(albumId)
        ]);

        setAlbumInfo({
          id: album.code,
          visitorName: album.owner_name,
          visitorNumber: 0,
          isComplete: album.status === 'completed' || album.status === 'paid',
          // Album is considered paid ONLY if payment_status is 'paid' OR status is explicitly 'paid'
          // 'completed' status means photos are done, NOT that payment is done
          isPaid: album.payment_status === 'paid' || album.status === 'paid',
          createdAt: new Date(album.created_at),
        });

        console.log("📸 Album photos raw data:", photosData);
        setPhotos(photosData.map((p: any) => {
          console.log("📸 Photo data:", { id: p.id, photo_id: p.photo_id, url: p.url, thumbnail_url: p.thumbnail_url });
          return {
            id: p.id,
            url: p.url || "",
            thumbnailUrl: p.thumbnail_url,
            templateName: "Photo", 
            createdAt: new Date(p.created_at),
            approved: true, 
            stationName: p.station_type
          };
        }));
      } catch (error) {
        console.error(error);
        toast.error('Failed to load album');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [albumId]);

  // Staff actions
  const handleDeletePhoto = async (photoId: string) => {
    if (!albumId) return;
    
    if (!confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteAlbumPhoto(albumId, photoId);
      // Remove from local state
      setPhotos(photos.filter(p => p.id !== photoId));
      toast.success('Photo deleted');
    } catch (error) {
      console.error('Failed to delete photo:', error);
      toast.error('Failed to delete photo');
    }
  };

  const handleApprovePhoto = (photoId: string, approved: boolean) => {
    setPhotos(photos.map(p => 
      p.id === photoId ? { ...p, approved } : p
    ));
    toast.success(approved ? 'Photo approved' : 'Photo rejected');
  };

  const handleMarkComplete = async () => {
    if (!albumId || !albumInfo) return;
    
    try {
      await updateAlbumStatus(albumId, 'completed');
      setAlbumInfo({ ...albumInfo, isComplete: true });
      toast.success('Album marked as complete');
    } catch (error) {
      console.error('Failed to mark complete:', error);
      toast.error('Failed to mark album as complete');
    }
  };

  const handleMarkPaid = async () => {
    if (!albumId || !albumInfo) return;
    
    try {
      await updateAlbumStatus(albumId, 'paid');
      setAlbumInfo({ ...albumInfo, isPaid: true });
      toast.success('Album marked as paid - now unlocked!');
    } catch (error) {
      console.error('Failed to mark as paid:', error);
      toast.error('Failed to mark album as paid');
    }
  };

  const handleSendEmail = async (email?: string) => {
    const targetEmail = email || emailInput;
    
    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!emailConfigured) {
      // Fallback to mailto if email service not configured
      const subject = encodeURIComponent(`Your photos from ${config?.title || 'the event'}`);
      const body = encodeURIComponent(`Hi ${albumInfo?.visitorName || 'there'},\n\nHere are your photos from ${config?.title || 'the event'}:\n\n${window.location.href}\n\nEnjoy!`);
      window.open(`mailto:${targetEmail}?subject=${subject}&body=${body}`);
      toast.info('Opening email client (email service not configured)');
      return;
    }

    setIsSendingEmail(true);
    try {
      await sendAlbumEmail(
        targetEmail,
        window.location.href,
        config?.title || 'the event',
        albumInfo?.visitorName,
        config?.theme?.brandName,
        config?.theme?.primaryColor,
        photos.length
      );
      toast.success(`Album sent to ${targetEmail}!`);
      setEmailInput('');
    } catch (error) {
      console.error('Email error:', error);
      toast.error('Failed to send email. Please try again.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendWhatsApp = () => {
    const text = encodeURIComponent(`Check out my photos from ${config?.title || 'the event'}! ${window.location.href}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    toast.success('Opening WhatsApp...');
  };

  const handleDownloadAll = async () => {
    if (requiresPayment) {
      toast.error('Please unlock the album first to download photos');
      return;
    }
    
    if (photos.length === 0) {
      toast.error('No photos to download');
      return;
    }
    
    toast.info('Preparing ZIP download...');
    
    // Use the backend ZIP endpoint to download all photos
    const zipUrl = `${ENV.API_URL}/api/albums/${albumId}/download`;
    
    // Create a link and trigger download
    const link = document.createElement('a');
    link.href = zipUrl;
    link.download = `album-${albumId}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Download started!');
  };

  // Download single photo
  const handleDownloadSingle = (photo: Photo) => {
    const link = document.createElement('a');
    link.href = photo.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = `photo-${photo.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Opening photo for download...');
  };

  // Print single photo
  const handlePrintSingle = (photo: Photo) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Photo</title>
          <style>
            body { 
              margin: 0; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              min-height: 100vh; 
              background: white; 
            }
            img { 
              max-width: 100%; 
              max-height: 100vh; 
              object-fit: contain; 
            }
            @media print {
              body { -webkit-print-color-adjust: exact; }
              @page { size: auto; margin: 0.5cm; }
            }
          </style>
        </head>
        <body>
          <img src="${photo.url}" onload="setTimeout(() => { window.print(); }, 500);" />
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success('Opening print dialog...');
  };
  
  const handlePrint = () => {
    // Create a print-friendly page with all photos
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }
    
    const photoHtml = photos.map(p => 
      `<div style="page-break-inside: avoid; margin-bottom: 20px;">
        <img src="${p.url}" style="max-width: 100%; height: auto;" />
      </div>`
    ).join('');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Album - ${albumInfo?.visitorName || albumId}</title>
          <style>
            body { font-family: system-ui; padding: 20px; }
            h1 { text-align: center; margin-bottom: 20px; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>${albumInfo?.visitorName || 'Album'} - ${config?.title || 'Event'}</h1>
          ${photoHtml}
          <script>
            setTimeout(() => { window.print(); }, 1000);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success('Opening print dialog...');
  };

  // Check if Stripe is enabled for this event
  const stripeEnabled = config?.rules?.useStripeCodeForPayment || config?.rules?.enableQRToPayment;
  
  const handleUnlockAlbum = async () => {
    if (!albumId) return;
    
    setIsProcessingPayment(true);
    try {
      if (stripeEnabled) {
        // Use Stripe checkout
        const result = await createAlbumCheckout(albumId);
        if (result.checkout_url) {
          window.location.href = result.checkout_url;
        }
      } else {
        // Request payment from staff (cash payment)
        await requestAlbumPayment(albumId);
        toast.success('Payment request sent! Staff will assist you shortly.', {
          duration: 5000,
        });
      }
    } catch (error) {
      toast.error('Failed to process request. Please try again.');
      console.error(error);
    } finally {
      setIsProcessingPayment(false);
    }
  };
  
  const handlePayWithStripe = async () => {
    if (!albumId) return;
    
    setIsProcessingPayment(true);
    try {
      const result = await createAlbumCheckout(albumId);
      if (result.checkout_url) {
        window.location.href = result.checkout_url;
      }
    } catch (error) {
      toast.error('Failed to start checkout. Please try again.');
      console.error(error);
    } finally {
      setIsProcessingPayment(false);
    }
  };
  
  const handleRequestCashPayment = async () => {
    if (!albumId) return;
    
    setIsProcessingPayment(true);
    try {
      await requestAlbumPayment(albumId);
      toast.success('Payment request sent! Staff will assist you shortly.', {
        duration: 5000,
      });
    } catch (error) {
      toast.error('Failed to send request. Please try again.');
      console.error(error);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Share functions
  const getShareText = (photo?: Photo) => {
    const eventName = config?.title || 'the event';
    const brandName = config?.theme?.brandName || 'PictureMe.Now';
    if (photo) {
      return `Check out my photo from ${eventName}! 📸✨ #${eventName.replace(/\s+/g, '')} #${brandName.replace(/\s+/g, '')}`;
    }
    return `Check out my ${photos.length} photos from ${eventName}! 📸✨ #${eventName.replace(/\s+/g, '')} #${brandName.replace(/\s+/g, '')}`;
  };

  const getShareUrl = (photo?: Photo) => {
    // For now, share the album URL. In future could have individual photo pages
    return window.location.href;
  };

  const handleShareAlbum = () => {
    setShareTarget('album');
    setShowShareMenu(true);
  };

  const handleSharePhoto = (photo: Photo) => {
    setShareTarget(photo);
    setShowShareMenu(true);
  };

  const shareToFacebook = () => {
    const url = encodeURIComponent(getShareUrl(shareTarget === 'album' ? undefined : shareTarget as Photo));
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(getShareText(shareTarget === 'album' ? undefined : shareTarget as Photo));
    const url = encodeURIComponent(getShareUrl(shareTarget === 'album' ? undefined : shareTarget as Photo));
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(`${getShareText(shareTarget === 'album' ? undefined : shareTarget as Photo)} ${getShareUrl(shareTarget === 'album' ? undefined : shareTarget as Photo)}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    setShowShareMenu(false);
  };

  const shareNative = async () => {
    const photo = shareTarget === 'album' ? undefined : shareTarget as Photo;
    if (navigator.share) {
      try {
        await navigator.share({
          title: photo ? 'My Photo' : `${albumInfo?.visitorName || 'My'} Photo Album`,
          text: getShareText(photo),
          url: getShareUrl(photo),
        });
      } catch (err) {
        // User cancelled
      }
    }
    setShowShareMenu(false);
  };

  const copyShareLink = async () => {
    const photo = shareTarget === 'album' ? undefined : shareTarget as Photo;
    await navigator.clipboard.writeText(getShareUrl(photo));
    toast.success('Link copied to clipboard!');
    setShowShareMenu(false);
  };

  // Photo preview navigation
  const currentPhotoIndex = previewPhoto ? photos.findIndex(p => p.id === previewPhoto.id) : -1;
  
  const goToPrevPhoto = () => {
    if (currentPhotoIndex > 0) {
      setPreviewPhoto(photos[currentPhotoIndex - 1]);
    }
  };

  const goToNextPhoto = () => {
    if (currentPhotoIndex < photos.length - 1) {
      setPreviewPhoto(photos[currentPhotoIndex + 1]);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-cyan-400" />
          <p className="text-white text-lg">Loading album...</p>
        </div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <EventNotFound 
        message={error || "This event does not exist or is no longer active."}
        eventSlug={eventSlug}
      />
    );
  }

  const primaryColor = config.theme?.primaryColor || '#06B6D4';

  // Completely locked album - show only lock screen (no photos visible at all)
  if (albumIsLocked && albumInfo) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-zinc-900/80 border-white/10 backdrop-blur-lg">
          <CardContent className="pt-8 pb-8 text-center">
            {/* Event Logo or Lock Icon */}
            {config.branding?.logoPath ? (
              <img 
                src={config.branding.logoPath} 
                alt={config.title}
                className="h-16 mx-auto mb-6 object-contain"
              />
            ) : (
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/30">
                <Lock className="w-12 h-12 text-amber-400" />
              </div>
            )}
            
            <h1 className="text-2xl font-bold text-white mb-2">
              Album Locked
            </h1>
            
            <p className="text-zinc-400 mb-2">
              Hi{albumInfo.visitorName ? ` ${albumInfo.visitorName}` : ''}! 👋
            </p>
            
            <p className="text-zinc-500 mb-6 text-sm">
              Your {photos.length} photo{photos.length !== 1 ? 's are' : ' is'} ready but requires payment to view and download.
            </p>
            
            {/* Photo count indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="flex -space-x-2">
                {[...Array(Math.min(3, photos.length))].map((_, i) => (
                  <div 
                    key={i}
                    className="w-10 h-10 rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-800 border-2 border-zinc-900 flex items-center justify-center"
                  >
                    <Lock className="w-4 h-4 text-zinc-500" />
                  </div>
                ))}
              </div>
              <span className="text-zinc-400 text-sm ml-2">
                {photos.length} photo{photos.length !== 1 ? 's' : ''} waiting
              </span>
            </div>
            
            {/* Instructions */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
              <p className="text-amber-300 text-sm font-medium mb-1">
                💳 Payment Required
              </p>
              <p className="text-zinc-400 text-xs">
                Please visit the event staff to complete your payment. Once paid, you'll have full access to view and download your photos.
              </p>
            </div>
            
            {/* Album Code for reference */}
            <div className="text-center">
              <p className="text-xs text-zinc-500 mb-1">Your Album Code</p>
              <code className="px-4 py-2 bg-black/40 rounded-lg text-cyan-400 font-mono text-lg tracking-widest">
                {albumInfo.id}
              </code>
              <p className="text-xs text-zinc-600 mt-2">
                Show this code to staff when paying
              </p>
            </div>
            
            {/* Event info */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-xs text-zinc-600">
                {config.title}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header - Different for Staff vs Visitor */}
      <header 
        className="sticky top-0 z-40 border-b border-white/10 backdrop-blur-xl"
        style={{ backgroundColor: isStaff ? 'rgba(9,9,11,0.8)' : `${primaryColor}15` }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {isStaff ? (
                // Staff view - back button
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(`/${userSlug}/${eventSlug}/staff`)}
                  className="text-zinc-400 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              ) : (
                // Visitor view - event branding
                config.branding?.logoPath ? (
                  <img 
                    src={config.branding.logoPath} 
                    alt={config.title}
                    className="h-10 object-contain"
                  />
                ) : (
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                )
              )}
              <div>
                <h1 className="text-xl font-bold text-white">
                  {isStaff 
                    ? (albumInfo?.visitorName || `Visitor #${albumInfo?.visitorNumber}`)
                    : (albumInfo?.visitorName ? `${albumInfo.visitorName}'s Photos` : 'Your Photos')
                  }
                </h1>
                <p className="text-sm text-zinc-400">
                  {photos.length} photo{photos.length !== 1 ? 's' : ''} • {config.title}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Visitor: show ready badge with brand color */}
              {albumInfo?.isComplete && !isStaff && (
                <Badge 
                  className="text-white border-0"
                  style={{ backgroundColor: primaryColor }}
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Ready
                </Badge>
              )}
              {/* Staff: show complete badge */}
              {albumInfo?.isComplete && isStaff && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Complete
                </Badge>
              )}
              {/* Payment required badge */}
              {!albumInfo?.isPaid && config.albumTracking?.rules?.printReady && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  <Lock className="w-3 h-3 mr-1" />
                  {isStaff ? 'Payment Required' : 'Locked'}
                </Badge>
              )}
              {/* Staff tools button */}
              {isStaff && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowStaffTools(!showStaffTools)}
                  className={showStaffTools 
                    ? "bg-[#D1F349] text-black border-[#D1F349] hover:bg-[#c5e73d]" 
                    : "bg-zinc-800 border-white/20 text-white hover:bg-zinc-700"
                  }
                >
                  Staff Tools
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Photo Grid */}
          <div 
            className="lg:col-span-3"
            onContextMenu={(e) => albumIsBlocked && e.preventDefault()} // Prevent right-click when blocked
          >
            {/* Blocked Album Wall - Staff Approval or Payment Required */}
            {albumIsBlocked && photos.length > 0 && (
              <div className="mb-8">
                {/* Stacked Photos Preview */}
                <div className="relative flex justify-center items-center py-12">
                  {/* Background cards (stacked effect) */}
                  {photos.slice(0, Math.min(3, photos.length)).map((photo, index) => (
                    <div
                      key={photo.id}
                      className="absolute rounded-2xl overflow-hidden shadow-2xl"
                      style={{
                        width: '280px',
                        height: '350px',
                        transform: `rotate(${(index - 1) * 8}deg) translateY(${index * 5}px)`,
                        zIndex: 3 - index,
                        opacity: 1 - (index * 0.15),
                      }}
                    >
                      <img
                        src={photo.url}
                        alt="Preview"
                        className="w-full h-full object-cover blur-lg brightness-75"
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                      />
                      {/* Heavy blur overlay */}
                      <div className="absolute inset-0 backdrop-blur-xl bg-black/30" />
                    </div>
                  ))}
                  
                  {/* Status Overlay */}
                  <div className="relative z-10 text-center p-8 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20">
                    {/* Different UI based on what's blocking */}
                    {requiresStaffApproval ? (
                      // Waiting for Staff Approval
                      <>
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <Clock className="w-10 h-10 text-purple-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">
                          Waiting for Approval
                        </h3>
                        <p className="text-zinc-400 mb-4 max-w-xs">
                          Your {photos.length} photo{photos.length !== 1 ? 's are' : ' is'} being reviewed by staff.
                          You'll be notified when they're ready!
                        </p>
                        <div className="flex items-center justify-center gap-2 text-purple-400">
                          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                          <span className="text-sm">Staff review in progress</span>
                        </div>
                      </>
                    ) : requiresPayment ? (
                      // Payment Required
                      <>
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                          <Lock className="w-10 h-10 text-amber-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">
                          {photos.length} Photos Ready!
                        </h3>
                        <p className="text-zinc-400 mb-6 max-w-xs">
                          Your photos are waiting for you. Unlock to view and download in full quality.
                        </p>
                        
                        {/* Payment Options */}
                        <div className="space-y-3 w-full max-w-xs">
                          {stripeEnabled && (
                            <Button
                              onClick={handlePayWithStripe}
                              disabled={isProcessingPayment}
                              size="lg"
                              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold"
                            >
                              {isProcessingPayment ? (
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              ) : (
                                <CreditCard className="w-5 h-5 mr-2" />
                              )}
                              Pay with Card
                            </Button>
                          )}
                          
                          <Button
                            onClick={handleRequestCashPayment}
                            disabled={isProcessingPayment}
                            size="lg"
                            variant="outline"
                            className="w-full border-white/20 text-white hover:bg-white/10"
                          >
                            {isProcessingPayment ? (
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            ) : (
                              <ShoppingCart className="w-5 h-5 mr-2" />
                            )}
                            Pay at Counter (Cash)
                          </Button>
                        </div>
                        
                        <p className="text-xs text-zinc-500 mt-4">
                          {stripeEnabled ? 'Secure payment • Instant access' : 'Staff will assist you with payment'}
                        </p>
                      </>
                    ) : null}
                  </div>
                </div>
                
                {/* Blurred thumbnail strip */}
                <div className="mt-8 flex justify-center gap-2 overflow-hidden">
                  {photos.slice(0, 6).map((photo, index) => (
                    <div 
                      key={photo.id}
                      className="w-16 h-20 rounded-lg overflow-hidden opacity-40"
                    >
                      <img
                        src={photo.url}
                        alt=""
                        className="w-full h-full object-cover blur-md"
                        draggable={false}
                      />
                    </div>
                  ))}
                  {photos.length > 6 && (
                    <div className="w-16 h-20 rounded-lg bg-zinc-800 flex items-center justify-center">
                      <span className="text-zinc-500 text-sm">+{photos.length - 6}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Regular Photo Grid - Only shown when album is NOT blocked */}
            {!albumIsBlocked && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className={`relative group rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      selectedPhoto === photo.id 
                        ? 'border-cyan-500 ring-2 ring-cyan-500/50' 
                        : 'border-white/10 hover:border-white/30'
                    } ${!photo.approved && 'opacity-60'}`}
                    onClick={() => {
                      if (isStaff) {
                        setSelectedPhoto(photo.id === selectedPhoto ? null : photo.id);
                      } else {
                        setPreviewPhoto(photo);
                      }
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <img
                      src={photo.url}
                      alt={photo.templateName}
                      className="w-full aspect-[3/4] object-cover transition-transform group-hover:scale-105"
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                    />
                    
                    {/* Watermark Overlay */}
                    {applyHardWatermark && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div 
                          className="text-white/30 text-2xl font-bold transform -rotate-45 select-none"
                          style={{ textShadow: '0 0 10px rgba(0,0,0,0.5)' }}
                        >
                          {config?.branding?.watermark?.text || config?.theme?.brandName || 'PREVIEW'}
                        </div>
                      </div>
                    )}
                    
                    {/* Overlay with actions */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-white text-sm font-medium">{photo.templateName}</p>
                        <p className="text-zinc-400 text-xs">{photo.stationName}</p>
                      </div>
                      {/* Click to view indicator for visitors */}
                      {!isStaff && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-black/50 backdrop-blur-sm rounded-full p-3">
                            <ExternalLink className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Staff badges */}
                    {isStaff && (
                      <div className="absolute top-2 right-2">
                        {photo.approved ? (
                          <Badge className="bg-green-500/80 text-white text-xs">
                            <CheckCircle2 className="w-3 h-3" />
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/80 text-white text-xs">
                            Pending
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Action buttons - visible to all on hover */}
                    <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Staff-only: Delete */}
                      {isStaff && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePhoto(photo.id);
                          }}
                          className="p-1.5 rounded-lg bg-red-500/80 hover:bg-red-600 text-white"
                          title="Delete photo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      {/* Download - visible to all when not payment-locked */}
                      {!requiresPayment && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadSingle(photo);
                          }}
                          className="p-1.5 rounded-lg bg-blue-500/80 hover:bg-blue-600 text-white"
                          title="Download photo"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      {/* Staff-only: Print */}
                      {isStaff && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintSingle(photo);
                          }}
                          className="p-1.5 rounded-lg bg-purple-500/80 hover:bg-purple-600 text-white"
                          title="Print photo"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {photos.length === 0 && (
              <div className="text-center py-16 text-zinc-500">
                <p>No photos in this album yet.</p>
              </div>
            )}

            {/* Action Buttons - visible to all */}
            {photos.length > 0 && !isStaff && (
              <div className="mt-8 flex flex-col items-center gap-4">
                {/* Primary action - Download All */}
                {!requiresPayment && (
                  <Button
                    onClick={handleDownloadAll}
                    size="lg"
                    className="text-black font-bold shadow-lg px-8"
                    style={{ 
                      backgroundColor: primaryColor,
                      boxShadow: `0 10px 40px -10px ${primaryColor}80`
                    }}
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download All Photos
                  </Button>
                )}
                {/* Secondary action - Share */}
                <Button
                  onClick={handleShareAlbum}
                  variant="outline"
                  className="bg-white/5 hover:bg-white/10 text-white border border-white/20"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Album
                </Button>
              </div>
            )}

            {/* Staff view - simple buttons */}
            {photos.length > 0 && isStaff && !showStaffTools && (
              <div className="mt-6 flex justify-center gap-4">
                <Button
                  onClick={handleShareAlbum}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-medium"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Album
                </Button>
                {!requiresPayment && (
                  <Button
                    onClick={handleDownloadAll}
                    className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 font-medium"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download All
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Sidebar - Staff Tools */}
          {isStaff && showStaffTools && (
            <div className="lg:col-span-1 space-y-4">
              <Card className="bg-zinc-900/80 border-white/10 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-lg font-bold">Staff Tools</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Approval */}
                  {selectedPhoto && (
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Selected Photo</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprovePhoto(selectedPhoto, true)}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprovePhoto(selectedPhoto, false)}
                          className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}

                  <hr className="border-white/10" />

                  {/* Album Actions */}
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Album Actions</p>
                    <Button
                      size="sm"
                      onClick={handleMarkComplete}
                      disabled={albumInfo?.isComplete}
                      className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 font-medium disabled:opacity-40"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Mark Complete
                    </Button>
                    {config?.albumTracking?.rules?.printReady && (
                      <Button
                        size="sm"
                        onClick={handleMarkPaid}
                        disabled={albumInfo?.isPaid}
                        className={albumInfo?.isPaid 
                          ? "w-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium cursor-default"
                          : "w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-medium"
                        }
                      >
                        {albumInfo?.isPaid ? (
                          <>
                            <Unlock className="w-4 h-4 mr-2" />
                            Paid & Unlocked
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Mark as Paid
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={handleDownloadAll}
                      className="w-full bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 font-medium"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download All
                    </Button>
                  </div>

                  <hr className="border-white/10" />

                  {/* Send Options */}
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Send Album</p>
                    <Button
                      size="sm"
                      onClick={handleSendEmail}
                      className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 font-medium"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Send via Email
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSendWhatsApp}
                      className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-medium"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send via WhatsApp
                    </Button>
                  </div>

                  <hr className="border-white/10" />

                  {/* Presentation */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Big Screen Mode</p>
                      <Switch
                        checked={bigScreenMode}
                        onCheckedChange={async (checked) => {
                          setBigScreenMode(checked);
                          if (checked && albumId && config?.postgres_event_id) {
                            const success = await broadcastToBigScreen({
                              albumCode: albumId,
                              visitorName: albumInfo?.visitorName,
                              isPaid: albumInfo?.isPaid || false,
                              eventId: config.postgres_event_id,
                              userSlug,
                              eventSlug,
                            });
                            if (success) {
                              toast.success('Album sent to Big Screen');
                            } else {
                              toast.error('Failed to send to Big Screen');
                              setBigScreenMode(false);
                            }
                          } else if (config?.postgres_event_id) {
                            await clearBigScreen(config.postgres_event_id);
                          }
                        }}
                        className="data-[state=checked]:bg-[#D1F349]"
                      />
                    </div>
                    {bigScreenMode && (
                      <p className="text-xs text-[#D1F349]">
                        <MonitorPlay className="w-3 h-3 inline mr-1" />
                        Album is now showing on the big screen
                      </p>
                    )}
                  </div>

                  <hr className="border-white/10" />

                  {/* Print */}
                  <Button
                    size="sm"
                    onClick={handlePrint}
                    className="w-full bg-[#D1F349] hover:bg-[#c5e73d] text-black font-bold shadow-lg shadow-[#D1F349]/20"
                    disabled={photos.length === 0}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Send to Print
                  </Button>
                </CardContent>
              </Card>

              {/* QR Code - Links to the shared album view */}
              <Card className="bg-zinc-900/80 border-white/10 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-sm flex items-center gap-2 font-bold">
                    <QrCode className="w-4 h-4 text-[#D1F349]" />
                    Share Album
                  </CardTitle>
                  <CardDescription className="text-zinc-400 text-xs">
                    Scan to view & share this album
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-center space-y-3">
                  <div className="p-4 bg-white rounded-lg inline-block">
                    <QRCodeSVG 
                      value={config?.postgres_event_id 
                        ? `${window.location.origin}/e/${config.postgres_event_id}/${eventSlug}/album/${albumId}`
                        : `${window.location.origin}/${userSlug}/${eventSlug}/album/${albumId}`
                      }
                      size={96}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-mono text-[#D1F349] bg-[#D1F349]/10 px-3 py-1.5 rounded-lg border border-[#D1F349]/20">
                      {albumId}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          await navigator.clipboard.writeText(albumId || '');
                          toast.success('Album code copied!');
                        }}
                        className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-medium"
                      >
                        Copy Code
                      </Button>
                      <Button
                        size="sm"
                        onClick={async () => {
                          const albumUrl = config?.postgres_event_id 
                            ? `${window.location.origin}/e/${config.postgres_event_id}/${eventSlug}/album/${albumId}`
                            : `${window.location.origin}/${userSlug}/${eventSlug}/album/${albumId}`;
                          await navigator.clipboard.writeText(albumUrl);
                          toast.success('Album URL copied!');
                        }}
                        className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-medium"
                      >
                        Copy URL
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Footer for visitors - branding */}
      {!isStaff && (
        <footer className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-zinc-950/90 backdrop-blur-lg py-3 z-30">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {config.branding?.logoPath && (
                <img 
                  src={config.branding.logoPath} 
                  alt={config.title}
                  className="h-6 object-contain opacity-70"
                />
              )}
              <span className="text-zinc-500 text-xs hidden sm:inline">
                {config.title}
              </span>
            </div>
            <div className="text-zinc-500 text-xs text-right">
              <span>© {new Date().getFullYear()} </span>
              <span className="hidden sm:inline">Powered by </span>
              <a 
                href="https://pictureme.now" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-white transition-colors"
              >
                PictureMe.Now
              </a>
              <span className="text-zinc-600 mx-1">by</span>
              <a 
                href="https://akitapr.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-white transition-colors"
              >
                Akitá
              </a>
            </div>
          </div>
        </footer>
      )}
      
      {/* Spacer for fixed footer */}
      {!isStaff && <div className="h-16" />}

      {/* Photo Preview Modal */}
      <Dialog open={!!previewPhoto} onOpenChange={() => setPreviewPhoto(null)}>
        <DialogContent className="max-w-4xl w-full bg-zinc-950/95 backdrop-blur-xl border-white/10 p-0 overflow-hidden">
          <DialogTitle className="sr-only">Photo Preview</DialogTitle>
          {previewPhoto && (
            <div className="relative">
              {/* Close button */}
              <button
                onClick={() => setPreviewPhoto(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Navigation arrows */}
              {currentPhotoIndex > 0 && (
                <button
                  onClick={goToPrevPhoto}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              {currentPhotoIndex < photos.length - 1 && (
                <button
                  onClick={goToNextPhoto}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}

              {/* Photo */}
              <img
                src={previewPhoto.url}
                alt={previewPhoto.templateName}
                className="w-full max-h-[70vh] object-contain bg-black"
              />

              {/* Bottom bar with actions */}
              <div className="p-4 bg-zinc-900/90 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{previewPhoto.templateName}</p>
                    <p className="text-zinc-400 text-sm">
                      Photo {currentPhotoIndex + 1} of {photos.length}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!requiresPayment && (
                      <Button
                        size="sm"
                        onClick={() => handleDownloadSingle(previewPhoto)}
                        className="bg-white/10 hover:bg-white/20 text-white"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleSharePhoto(previewPhoto)}
                      style={{ backgroundColor: primaryColor }}
                      className="text-black font-medium"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Share Menu Modal */}
      <Dialog open={showShareMenu} onOpenChange={setShowShareMenu}>
        <DialogContent className="max-w-sm bg-zinc-900 border-white/10">
          <DialogTitle className="text-white text-lg font-bold mb-4">
            Share {shareTarget === 'album' ? 'Album' : 'Photo'}
          </DialogTitle>
          
          <div className="space-y-3">
            {/* Event branding */}
            <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg mb-4">
              {config?.branding?.logoPath && (
                <img 
                  src={config.branding.logoPath} 
                  alt={config.title}
                  className="h-8 object-contain"
                />
              )}
              <div>
                <p className="text-white text-sm font-medium">{config?.title}</p>
                <p className="text-zinc-400 text-xs">
                  {shareTarget === 'album' ? `${photos.length} photos` : 'Share this photo'}
                </p>
              </div>
            </div>

            {/* Share buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={shareToFacebook}
                className="bg-[#1877F2] hover:bg-[#1877F2]/80 text-white"
              >
                <Facebook className="w-4 h-4 mr-2" />
                Facebook
              </Button>
              <Button
                onClick={shareToTwitter}
                className="bg-black hover:bg-zinc-800 text-white border border-white/20"
              >
                <Twitter className="w-4 h-4 mr-2" />
                X / Twitter
              </Button>
              <Button
                onClick={shareToWhatsApp}
                className="bg-[#25D366] hover:bg-[#25D366]/80 text-white"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
              {navigator.share && (
                <Button
                  onClick={shareNative}
                  className="bg-zinc-700 hover:bg-zinc-600 text-white"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  More...
                </Button>
              )}
            </div>

            {/* Copy link */}
            <Button
              onClick={copyShareLink}
              variant="outline"
              className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </Button>

            {/* Share text preview */}
            <div className="p-3 bg-zinc-800/30 rounded-lg">
              <p className="text-zinc-400 text-xs mb-1">Share message:</p>
              <p className="text-zinc-300 text-sm">
                {getShareText(shareTarget === 'album' ? undefined : shareTarget as Photo)}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

