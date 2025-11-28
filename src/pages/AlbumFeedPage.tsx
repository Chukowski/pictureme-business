/**
 * AlbumFeedPage
 * 
 * Displays all photos in a visitor's album for multi-station events.
 * Includes staff tools for approval, sending, and presentation.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEventConfig } from '@/hooks/useEventConfig';
import { 
  Loader2, ArrowLeft, Download, Share2, Mail, MessageSquare, 
  CheckCircle2, XCircle, MonitorPlay, Printer, Lock, Unlock,
  QrCode, ExternalLink, CreditCard, ShoppingCart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { EventNotFound } from '@/components/EventNotFound';
import { getAlbum, getAlbumPhotos, createAlbumCheckout, updateAlbumStatus, Album } from '@/services/eventsApi';
import { QRCodeSVG } from 'qrcode.react';

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

export default function AlbumFeedPage() {
  const { userSlug, eventSlug, albumId } = useParams<{ 
    userSlug: string; 
    eventSlug: string; 
    albumId: string;
  }>();
  const navigate = useNavigate();
  const { config, loading, error } = useEventConfig(userSlug!, eventSlug!);

  const [albumInfo, setAlbumInfo] = useState<AlbumInfo | null>(null);
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showStaffTools, setShowStaffTools] = useState(false);
  const [bigScreenMode, setBigScreenMode] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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

  // Check if payment is required for downloads
  const requiresPayment = config?.albumTracking?.rules?.printReady && !albumInfo?.isPaid;
  
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
          isComplete: album.status === 'completed',
          isPaid: album.payment_status === 'paid',
          createdAt: new Date(album.created_at),
        });

        setPhotos(photosData.map((p: any) => ({
          id: p.id,
          url: p.url || "",
          thumbnailUrl: p.thumbnail_url,
          templateName: "Photo", 
          createdAt: new Date(p.created_at),
          approved: true, 
          stationName: p.station_type
        })));
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

  const handleSendEmail = () => {
    if (!albumInfo?.visitorName) {
      // Prompt for email if not available
      const email = prompt('Enter email address:');
      if (!email) return;
      
      // Open email client with album link
      const subject = encodeURIComponent(`Your photos from ${config?.title || 'the event'}`);
      const body = encodeURIComponent(`Hi ${albumInfo?.visitorName || 'there'},\n\nHere are your photos from ${config?.title || 'the event'}:\n\n${window.location.href}\n\nEnjoy!`);
      window.open(`mailto:${email}?subject=${subject}&body=${body}`);
      toast.success('Opening email client...');
    } else {
      const subject = encodeURIComponent(`Your photos from ${config?.title || 'the event'}`);
      const body = encodeURIComponent(`Hi ${albumInfo?.visitorName || 'there'},\n\nHere are your photos from ${config?.title || 'the event'}:\n\n${window.location.href}\n\nEnjoy!`);
      window.open(`mailto:?subject=${subject}&body=${body}`);
      toast.success('Opening email client...');
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
    
    toast.info('Preparing download...');
    
    // Download each photo
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      if (!photo.url) continue;
      
      try {
        const response = await fetch(photo.url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `photo-${albumId}-${i + 1}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to download photo ${i + 1}:`, error);
      }
    }
    
    toast.success(`Downloaded ${photos.length} photos!`);
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

  const handleUnlockAlbum = async () => {
    if (!albumId) return;
    
    setIsProcessingPayment(true);
    try {
      const { checkout_url } = await createAlbumCheckout(albumId);
      // Redirect to Stripe checkout
      window.location.href = checkout_url;
    } catch (error) {
      toast.error('Failed to start checkout. Please try again.');
      console.error(error);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleShareAlbum = async () => {
    const shareUrl = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${albumInfo?.visitorName || 'My'} Photo Album`,
          text: `Check out my photos from ${config?.title}!`,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Album link copied to clipboard!');
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

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">
                {albumInfo?.visitorName || `Visitor #${albumInfo?.visitorNumber}`}
              </h1>
              <p className="text-sm text-zinc-400">
                {photos.length} photos • {config.title}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {albumInfo?.isComplete && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Complete
              </Badge>
            )}
            {!albumInfo?.isPaid && config.albumTracking?.rules?.printReady && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                <Lock className="w-3 h-3 mr-1" />
                Payment Required
              </Badge>
            )}
            {isStaff && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStaffTools(!showStaffTools)}
                className="border-white/20 text-zinc-300"
              >
                Staff Tools
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Photo Grid */}
          <div className="lg:col-span-3">
            {/* Payment Banner */}
            {requiresPayment && (
              <Card className="mb-6 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30">
                <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/20">
                      <Lock className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Unlock Your Album</h3>
                      <p className="text-sm text-amber-200/80">
                        Purchase to download high-resolution photos without watermarks
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleUnlockAlbum}
                    disabled={isProcessingPayment}
                    className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                  >
                    {isProcessingPayment ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ShoppingCart className="w-4 h-4 mr-2" />
                    )}
                    Unlock Album
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className={`relative group rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    selectedPhoto === photo.id 
                      ? 'border-cyan-500 ring-2 ring-cyan-500/50' 
                      : 'border-white/10 hover:border-white/20'
                  } ${!photo.approved && 'opacity-60'}`}
                  onClick={() => setSelectedPhoto(photo.id === selectedPhoto ? null : photo.id)}
                >
                  <img
                    src={photo.url}
                    alt={photo.templateName}
                    className={`w-full aspect-[3/4] object-cover ${requiresPayment ? 'blur-sm' : ''}`}
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
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-sm font-medium">{photo.templateName}</p>
                      <p className="text-zinc-400 text-xs">{photo.stationName}</p>
                    </div>
                  </div>

                  {/* Approval badge */}
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

                  {/* Payment lock overlay */}
                  {requiresPayment && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="text-center">
                        <Lock className="w-8 h-8 text-white/70 mx-auto mb-2" />
                        <span className="text-xs text-white/70">Unlock to view</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {photos.length === 0 && (
              <div className="text-center py-16 text-zinc-500">
                <p>No photos in this album yet.</p>
              </div>
            )}

            {/* Share Button - visible to all */}
            {photos.length > 0 && (
              <div className="mt-6 flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={handleShareAlbum}
                  className="border-white/20 text-zinc-300"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Album
                </Button>
                {!requiresPayment && (
                  <Button
                    variant="outline"
                    onClick={handleDownloadAll}
                    className="border-white/20 text-zinc-300"
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
              <Card className="bg-zinc-900/50 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Staff Tools</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Approval */}
                  {selectedPhoto && (
                    <div className="space-y-2">
                      <p className="text-sm text-zinc-400">Selected Photo</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprovePhoto(selectedPhoto, true)}
                          className="flex-1 bg-green-600 hover:bg-green-500"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprovePhoto(selectedPhoto, false)}
                          className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
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
                    <p className="text-sm text-zinc-400">Album Actions</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleMarkComplete}
                      disabled={albumInfo?.isComplete}
                      className="w-full border-white/20 text-zinc-300"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Mark Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadAll}
                      className="w-full border-white/20 text-zinc-300"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download All
                    </Button>
                  </div>

                  <hr className="border-white/10" />

                  {/* Send Options */}
                  <div className="space-y-2">
                    <p className="text-sm text-zinc-400">Send Album</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSendEmail}
                      className="w-full border-white/20 text-zinc-300"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Send via Email
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSendWhatsApp}
                      className="w-full border-white/20 text-zinc-300"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send via WhatsApp
                    </Button>
                  </div>

                  <hr className="border-white/10" />

                  {/* Presentation */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-zinc-400">Big Screen Mode</p>
                      <Switch
                        checked={bigScreenMode}
                        onCheckedChange={setBigScreenMode}
                        className="data-[state=checked]:bg-cyan-600"
                      />
                    </div>
                    {bigScreenMode && (
                      <p className="text-xs text-cyan-400">
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
                    className="w-full"
                    style={{ backgroundColor: primaryColor }}
                    disabled={photos.length === 0}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Send to Print
                  </Button>
                </CardContent>
              </Card>

              {/* QR Code - Real QR that links to booth with album */}
              <Card className="bg-zinc-900/50 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-cyan-400" />
                    Album QR Code
                  </CardTitle>
                  <CardDescription className="text-zinc-400 text-xs">
                    Scan to add more photos
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-center space-y-3">
                  <div className="p-4 bg-white rounded-lg inline-block">
                    <QRCodeSVG 
                      value={`${window.location.origin}/${userSlug}/${eventSlug}/booth?album=${albumId}`}
                      size={96}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">
                      {albumId}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await navigator.clipboard.writeText(albumId || '');
                          toast.success('Album code copied!');
                        }}
                        className="flex-1 border-white/20 text-zinc-300 text-xs"
                      >
                        Copy Code
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const boothUrl = `${window.location.origin}/${userSlug}/${eventSlug}/booth?album=${albumId}`;
                          await navigator.clipboard.writeText(boothUrl);
                          toast.success('Booth URL copied!');
                        }}
                        className="flex-1 border-white/20 text-zinc-300 text-xs"
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
    </div>
  );
}

