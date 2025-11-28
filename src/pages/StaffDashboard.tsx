/**
 * StaffDashboard Page
 * 
 * Staff-only dashboard for managing albums and photos during an event.
 * Accessible via /:userSlug/:eventSlug/staff
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEventConfig } from '@/hooks/useEventConfig';
import {
  Loader2, ArrowLeft, QrCode, Users, Camera, BookOpen,
  CheckCircle2, XCircle, Clock, Settings, RefreshCw,
  MonitorPlay, Printer, Mail, MessageSquare, Lock, Unlock,
  Search, Filter, MoreVertical, Eye, BarChart3, Copy, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { EventNotFound } from '@/components/EventNotFound';
import { ScanAlbumQR } from '@/components/album';
import { StaffAlbumTools, StaffStationAnalytics } from '@/components/staff';
import { getEventAlbums, updateAlbumStatus, sendAlbumEmailByCode, getEmailStatus } from '@/services/eventsApi';
import { ENV } from '@/config/env';

// Mock data types
interface Album {
  id: string;
  visitorName?: string;
  visitorNumber: number;
  photoCount: number;
  maxPhotos: number;
  isComplete: boolean;
  isPaid: boolean;
  createdAt: Date;
  lastPhotoAt?: Date;
}

interface StaffStats {
  totalAlbums: number;
  completedAlbums: number;
  pendingApproval: number;
  totalPhotos: number;
  activeVisitors: number;
}

export default function StaffDashboard() {
  const { userSlug, eventSlug } = useParams<{ userSlug: string; eventSlug: string }>();
  const navigate = useNavigate();
  const { config, loading, error } = useEventConfig(userSlug!, eventSlug!);

  const [activeTab, setActiveTab] = useState('overview');
  const [albums, setAlbums] = useState<Album[]>([]);
  const [stats, setStats] = useState<StaffStats>({
    totalAlbums: 0,
    completedAlbums: 0,
    pendingApproval: 0,
    totalPhotos: 0,
    activeVisitors: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [bigScreenMode, setBigScreenMode] = useState(false);
  
  // Auth state
  const [pin, setPin] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // Polling state
  const [isPolling, setIsPolling] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const POLLING_INTERVAL = 10000; // 10 seconds

  // Load albums function (memoized for polling)
  const loadAlbums = useCallback(async () => {
    if (!config?.postgres_event_id) return;
    
    try {
      const data = await getEventAlbums(config.postgres_event_id);
      const mappedAlbums: Album[] = data.map((a: any) => ({
        id: a.code,
        visitorName: a.owner_name,
        visitorNumber: 0,
        photoCount: a.photo_count || 0,
        maxPhotos: config.albumTracking?.rules?.maxPhotosPerAlbum || 5,
        isComplete: a.status === 'completed',
        isPaid: a.payment_status === 'paid',
        createdAt: new Date(a.created_at),
        lastPhotoAt: a.updated_at ? new Date(a.updated_at) : new Date(a.created_at),
      }));

      setAlbums(mappedAlbums);
      
      const totalPhotos = mappedAlbums.reduce((sum, a) => sum + a.photoCount, 0);
      setStats({
        totalAlbums: mappedAlbums.length,
        completedAlbums: mappedAlbums.filter(a => a.isComplete).length,
        pendingApproval: 0, // TODO: implement pending approval count
        totalPhotos,
        activeVisitors: mappedAlbums.filter(a => !a.isComplete).length,
      });
      setLastRefresh(new Date());
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      // Don't show error toast on polling failures to avoid spam
      if (isLoading) {
        toast.error('Failed to load albums');
      }
      setIsLoading(false);
    }
  }, [config, isLoading]);

  // Initial load and auth check
  useEffect(() => {
    if (!config) return;
    
    // Auto-authorize if no PIN set
    if (!config.settings?.staffAccessCode) {
      setIsAuthorized(true);
    }

    if (config.postgres_event_id) {
      loadAlbums();
    }
  }, [config]);

  // Polling effect
  useEffect(() => {
    if (!isAuthorized || !config?.postgres_event_id || !isPolling) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Start polling
    pollingIntervalRef.current = setInterval(() => {
      loadAlbums();
    }, POLLING_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isAuthorized, config?.postgres_event_id, isPolling, loadAlbums]);

  // Manual refresh
  const handleRefresh = () => {
    setIsLoading(true);
    loadAlbums();
    toast.success('Data refreshed');
  };

  // Album actions
  const handleMarkComplete = async (albumId: string) => {
    try {
      await updateAlbumStatus(albumId, 'completed');
      toast.success('Album marked as complete');
      loadAlbums();
    } catch (error) {
      toast.error('Failed to update album');
    }
  };

  const handleSendEmail = async (albumId: string) => {
    try {
      const baseUrl = `${window.location.origin}/${userSlug}/${eventSlug}`;
      await sendAlbumEmailByCode(
        albumId,
        config?.title || 'the event',
        baseUrl,
        config?.theme?.brandName,
        config?.theme?.primaryColor
      );
      toast.success('Album email sent successfully!');
    } catch (error: any) {
      console.error('Email error:', error);
      if (error.message?.includes('no email')) {
        toast.error('Album has no email address');
      } else if (error.message?.includes('not configured')) {
        toast.error('Email service not configured');
      } else {
        toast.error('Failed to send email');
      }
    }
  };

  const handleSendWhatsApp = async (albumId: string) => {
    // TODO: Implement WhatsApp sharing
    toast.info('WhatsApp feature coming soon');
  };

  const handleCopyAlbumCode = async (albumId: string) => {
    try {
      await navigator.clipboard.writeText(albumId);
      toast.success('Album code copied to clipboard');
    } catch {
      toast.error('Failed to copy album code');
    }
  };

  const getAlbumUrl = (albumId: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/${userSlug}/${eventSlug}/album/${albumId}`;
  };

  const handleCopyAlbumUrl = async (albumId: string) => {
    try {
      await navigator.clipboard.writeText(getAlbumUrl(albumId));
      toast.success('Album URL copied to clipboard');
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  // Handle album scan
  const handleAlbumScan = (albumId: string) => {
    setShowScanner(false);
    // Navigate to album or show album details
    const album = albums.find(a => a.id === albumId);
    if (album) {
      toast.success(`Album ${albumId} found - ${album.photoCount} photos`);
      navigate(`/${userSlug}/${eventSlug}/album/${albumId}`);
    } else {
      toast.info(`New album: ${albumId}`);
    }
  };

  // Filter albums
  const filteredAlbums = albums.filter(album => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      album.id.toLowerCase().includes(query) ||
      album.visitorName?.toLowerCase().includes(query) ||
      album.visitorNumber.toString().includes(query)
    );
  });

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-cyan-400" />
          <p className="text-white text-lg">Loading staff dashboard...</p>
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

  // Check if album tracking is enabled
  if (!config.albumTracking?.enabled) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <Card className="bg-zinc-900/50 border-white/10 max-w-md">
          <CardContent className="pt-6 text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
            <h2 className="text-xl font-semibold text-white mb-2">Album Tracking Not Enabled</h2>
            <p className="text-zinc-400 mb-6">
              This event doesn't have Album Tracking enabled. Enable it in the Event Editor to use the Staff Dashboard.
            </p>
            <Button onClick={() => navigate(-1)} variant="outline" className="border-white/20 text-zinc-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const primaryColor = config.theme?.primaryColor || '#06B6D4';

  // PIN Check
  if (config.settings?.staffAccessCode && !isAuthorized) {
      return (
          <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
              <Card className="w-full max-w-sm bg-zinc-900 border-zinc-800">
                  <CardHeader>
                      <CardTitle className="text-white">Staff Access</CardTitle>
                      <CardDescription>Enter event PIN to continue</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <Input 
                          type="password" 
                          value={pin} 
                          onChange={e => setPin(e.target.value)}
                          placeholder="Enter PIN"
                          className="bg-zinc-800 border-zinc-700 text-white text-center tracking-widest text-2xl"
                      />
                      <Button 
                          onClick={() => {
                              if (pin === config.settings.staffAccessCode) setIsAuthorized(true);
                              else toast.error("Incorrect PIN");
                          }}
                          className="w-full"
                          style={{ backgroundColor: primaryColor }}
                      >
                          Access Dashboard
                      </Button>
                  </CardContent>
              </Card>
          </div>
      );
  }

  // Show QR Scanner
  if (showScanner) {
    return (
      <ScanAlbumQR
        onScan={handleAlbumScan}
        onCancel={() => setShowScanner(false)}
        title="Scan Visitor Badge"
        subtitle="Scan to view or manage their album"
        primaryColor={primaryColor}
      />
    );
  }

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
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Staff Dashboard
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                  Live
                </Badge>
              </h1>
              <p className="text-sm text-zinc-400">{config.title}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Polling indicator */}
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <div className={`w-2 h-2 rounded-full ${isPolling ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`} />
              {lastRefresh && (
                <span>Updated {lastRefresh.toLocaleTimeString()}</span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPolling(!isPolling)}
              className={`border-white/20 ${isPolling ? 'text-green-400' : 'text-zinc-400'}`}
            >
              {isPolling ? 'Live' : 'Paused'}
            </Button>
            <Button
              onClick={() => setShowScanner(true)}
              style={{ backgroundColor: primaryColor }}
              className="text-white"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Scan Badge
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              className="border-white/20 text-zinc-300"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-zinc-900/50 border-white/10">
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-cyan-400" />
              <p className="text-2xl font-bold text-white">{stats.totalAlbums}</p>
              <p className="text-xs text-zinc-500">Total Albums</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/50 border-white/10">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-400" />
              <p className="text-2xl font-bold text-white">{stats.completedAlbums}</p>
              <p className="text-xs text-zinc-500">Completed</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/50 border-white/10">
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-amber-400" />
              <p className="text-2xl font-bold text-white">{stats.activeVisitors}</p>
              <p className="text-xs text-zinc-500">In Progress</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/50 border-white/10">
            <CardContent className="p-4 text-center">
              <Camera className="w-6 h-6 mx-auto mb-2 text-purple-400" />
              <p className="text-2xl font-bold text-white">{stats.totalPhotos}</p>
              <p className="text-xs text-zinc-500">Photos</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/50 border-white/10">
            <CardContent className="p-4 text-center">
              <XCircle className="w-6 h-6 mx-auto mb-2 text-red-400" />
              <p className="text-2xl font-bold text-white">{stats.pendingApproval}</p>
              <p className="text-xs text-zinc-500">Pending</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-zinc-900/50 border border-white/10">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white/10">
              Albums
            </TabsTrigger>
            <TabsTrigger value="tools" className="data-[state=active]:bg-white/10">
              Tools
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-white/10">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="display" className="data-[state=active]:bg-white/10">
              Display
            </TabsTrigger>
          </TabsList>

          {/* Albums Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Search and Filter */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by album ID, name, or number..."
                  className="pl-10 bg-zinc-900/50 border-white/10 text-white"
                />
              </div>
              <Button variant="outline" className="border-white/20 text-zinc-300">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>

            {/* Albums List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAlbums.map(album => (
                <Card 
                  key={album.id}
                  className="bg-zinc-900/50 border-white/10 hover:border-white/20 transition-colors cursor-pointer"
                  onClick={() => navigate(`/${userSlug}/${eventSlug}/album/${album.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-mono text-sm text-cyan-400">{album.id}</p>
                        <p className="text-white font-medium">
                          {album.visitorName || `Visitor #${album.visitorNumber}`}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-zinc-400"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                          <DropdownMenuItem 
                            className="text-zinc-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/${userSlug}/${eventSlug}/album/${album.id}`);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Album
                          </DropdownMenuItem>
                          {!album.isComplete && (
                            <DropdownMenuItem 
                              className="text-zinc-300"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkComplete(album.id);
                              }}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Mark Complete
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            className="text-zinc-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendEmail(album.id);
                            }}
                          >
                            <Mail className="w-4 h-4 mr-2" />
                            Send Email
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-zinc-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendWhatsApp(album.id);
                            }}
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-zinc-300">
                            <Printer className="w-4 h-4 mr-2" />
                            Print
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-zinc-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyAlbumCode(album.id);
                            }}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Album Code
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-zinc-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyAlbumUrl(album.id);
                            }}
                          >
                            <QrCode className="w-4 h-4 mr-2" />
                            Copy Album URL
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Progress */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${(album.photoCount / album.maxPhotos) * 100}%`,
                            backgroundColor: album.isComplete ? '#22C55E' : primaryColor
                          }}
                        />
                      </div>
                      <span className="text-xs text-zinc-400">
                        {album.photoCount}/{album.maxPhotos}
                      </span>
                    </div>

                    {/* Status badges */}
                    <div className="flex gap-2">
                      {album.isComplete ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                          Complete
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                          In Progress
                        </Badge>
                      )}
                      {album.isPaid ? (
                        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">
                          <Unlock className="w-3 h-3 mr-1" />
                          Paid
                        </Badge>
                      ) : (
                        <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30 text-xs">
                          <Lock className="w-3 h-3 mr-1" />
                          Unpaid
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredAlbums.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No albums found</p>
              </div>
            )}
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools">
            <StaffAlbumTools
              eventId={config._id}
              eventName={config.title}
              stats={stats}
              primaryColor={primaryColor}
              onRefresh={handleRefresh}
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <StaffStationAnalytics 
              eventId={config.postgres_event_id}
              className="space-y-6"
            />
          </TabsContent>

          {/* Display Tab */}
          <TabsContent value="display">
            <Card className="bg-zinc-900/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Big Screen Display</CardTitle>
                <CardDescription className="text-zinc-400">
                  Show albums and photos on a large display for the event
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-black/30 border border-white/5">
                  <div className="flex items-center gap-3">
                    <MonitorPlay 
                      className="w-8 h-8" 
                      style={{ color: bigScreenMode ? primaryColor : '#71717A' }}
                    />
                    <div>
                      <p className="text-white font-medium">Big Screen Mode</p>
                      <p className="text-xs text-zinc-400">
                        {bigScreenMode ? 'Displaying on connected screens' : 'Off'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={bigScreenMode}
                    onCheckedChange={setBigScreenMode}
                    className="data-[state=checked]:bg-cyan-600"
                  />
                </div>

                {bigScreenMode && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex-col gap-2 border-white/10 hover:bg-cyan-500/10 hover:border-cyan-500/30"
                        onClick={() => {
                          const displayUrl = `${window.location.origin}/${userSlug}/${eventSlug}/display`;
                          window.open(displayUrl, 'bigscreen', 'width=1920,height=1080');
                          toast.success('Display window opened! Move it to your big screen.');
                        }}
                      >
                        <MonitorPlay className="w-6 h-6 text-cyan-400" />
                        <span className="text-zinc-300">Open Display Window</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex-col gap-2 border-white/10 hover:bg-purple-500/10 hover:border-purple-500/30"
                        onClick={() => {
                          const registrationUrl = `${window.location.origin}/${userSlug}/${eventSlug}/registration`;
                          navigator.clipboard.writeText(registrationUrl);
                          toast.success('Registration URL copied!');
                        }}
                      >
                        <QrCode className="w-6 h-6 text-purple-400" />
                        <span className="text-zinc-300">Copy Registration URL</span>
                      </Button>
                    </div>
                    
                    {/* Send Album to Display */}
                    <div className="p-4 rounded-lg bg-black/30 border border-white/5">
                      <p className="text-sm text-zinc-400 mb-3">Send an album to the big screen:</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter album code..."
                          className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-white/10 text-white placeholder:text-zinc-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.target as HTMLInputElement;
                              if (input.value) {
                                localStorage.setItem(`display_album_${eventSlug}`, input.value);
                                toast.success(`Sending album ${input.value} to display...`);
                                input.value = '';
                              }
                            }
                          }}
                        />
                        <Button
                          className="bg-cyan-600 hover:bg-cyan-500 text-white"
                          onClick={(e) => {
                            const input = (e.target as HTMLElement).parentElement?.querySelector('input');
                            if (input?.value) {
                              localStorage.setItem(`display_album_${eventSlug}`, input.value);
                              toast.success(`Sending album ${input.value} to display...`);
                              input.value = '';
                            }
                          }}
                        >
                          <MonitorPlay className="w-4 h-4 mr-2" />
                          Send
                        </Button>
                      </div>
                      <p className="text-xs text-zinc-500 mt-2">
                        Tip: Scan a visitor's QR code to auto-fill the album code
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

