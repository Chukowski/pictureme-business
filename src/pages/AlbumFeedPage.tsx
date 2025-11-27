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
  QrCode, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { EventNotFound } from '@/components/EventNotFound';

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

  // Check if user is staff (mock - would be based on auth)
  const isStaff = true; // TODO: Implement real staff check

  // Load album data
  useEffect(() => {
    if (!albumId) return;

    // Mock data - replace with real API call
    const mockPhotos: AlbumPhoto[] = [
      {
        id: '1',
        url: 'https://picsum.photos/seed/album1/800/1200',
        templateName: 'Ocean Adventure',
        createdAt: new Date(Date.now() - 1000 * 60 * 30),
        approved: true,
        stationName: 'Station 1',
      },
      {
        id: '2',
        url: 'https://picsum.photos/seed/album2/800/1200',
        templateName: 'Space Explorer',
        createdAt: new Date(Date.now() - 1000 * 60 * 20),
        approved: true,
        stationName: 'Station 2',
      },
      {
        id: '3',
        url: 'https://picsum.photos/seed/album3/800/1200',
        templateName: 'Jungle Safari',
        createdAt: new Date(Date.now() - 1000 * 60 * 10),
        approved: false,
        stationName: 'Station 3',
      },
    ];

    setAlbumInfo({
      id: albumId,
      visitorNumber: 412,
      isComplete: true,
      isPaid: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 45),
    });

    setPhotos(mockPhotos);
    setIsLoading(false);
  }, [albumId]);

  // Staff actions
  const handleApprovePhoto = (photoId: string, approved: boolean) => {
    setPhotos(photos.map(p => 
      p.id === photoId ? { ...p, approved } : p
    ));
    toast.success(approved ? 'Photo approved' : 'Photo rejected');
  };

  const handleMarkComplete = () => {
    if (albumInfo) {
      setAlbumInfo({ ...albumInfo, isComplete: true });
      toast.success('Album marked as complete');
    }
  };

  const handleSendEmail = () => {
    toast.success('Album sent via email');
  };

  const handleSendWhatsApp = () => {
    toast.success('Album sent via WhatsApp');
  };

  const handleDownloadAll = () => {
    toast.success('Downloading all photos...');
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
                    className="w-full aspect-[3/4] object-cover"
                  />
                  
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
                  {!albumInfo?.isPaid && config.albumTracking?.rules?.printReady && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Lock className="w-8 h-8 text-white/50" />
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
                    onClick={() => toast.success('Sending to print station...')}
                    className="w-full"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Send to Print
                  </Button>
                </CardContent>
              </Card>

              {/* QR Code */}
              <Card className="bg-zinc-900/50 border-white/10">
                <CardContent className="p-4 text-center">
                  <QrCode className="w-16 h-16 mx-auto text-zinc-600 mb-2" />
                  <p className="text-xs text-zinc-500">Album QR Code</p>
                  <p className="text-xs font-mono text-zinc-400 mt-1">{albumId}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

