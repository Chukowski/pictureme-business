/**
 * StaffDashboard Page
 * 
 * Staff-only dashboard for managing albums and photos during an event.
 * Accessible via /:userSlug/:eventSlug/staff
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEventConfig } from '@/hooks/useEventConfig';
import {
  Loader2, ArrowLeft, QrCode, Users, Camera, BookOpen,
  CheckCircle2, XCircle, Clock, Settings, RefreshCw,
  MonitorPlay, Printer, Mail, MessageSquare, Lock, Unlock,
  Search, Filter, MoreVertical, Eye
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
import { StaffAlbumTools } from '@/components/staff';

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

  // Load mock data
  useEffect(() => {
    if (!config) return;

    // Mock albums data
    const mockAlbums: Album[] = Array.from({ length: 15 }, (_, i) => ({
      id: `ALBUM-${String(i + 1).padStart(4, '0')}`,
      visitorName: i % 3 === 0 ? `Visitor ${i + 1}` : undefined,
      visitorNumber: i + 1,
      photoCount: Math.floor(Math.random() * 5) + 1,
      maxPhotos: config.albumTracking?.rules?.maxPhotosPerAlbum || 5,
      isComplete: Math.random() > 0.6,
      isPaid: Math.random() > 0.5,
      createdAt: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 3),
      lastPhotoAt: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 1000 * 60 * 30) : undefined,
    }));

    setAlbums(mockAlbums);
    setStats({
      totalAlbums: mockAlbums.length,
      completedAlbums: mockAlbums.filter(a => a.isComplete).length,
      pendingApproval: Math.floor(Math.random() * 5),
      totalPhotos: mockAlbums.reduce((sum, a) => sum + a.photoCount, 0),
      activeVisitors: mockAlbums.filter(a => !a.isComplete).length,
    });
    setIsLoading(false);
  }, [config]);

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
              onClick={() => {
                setIsLoading(true);
                setTimeout(() => setIsLoading(false), 500);
                toast.success('Data refreshed');
              }}
              className="border-white/20 text-zinc-300"
            >
              <RefreshCw className="w-4 h-4" />
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
                          <Button variant="ghost" size="icon" className="text-zinc-400">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                          <DropdownMenuItem className="text-zinc-300">
                            <Eye className="w-4 h-4 mr-2" />
                            View Album
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-zinc-300">
                            <Mail className="w-4 h-4 mr-2" />
                            Send Email
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-zinc-300">
                            <Printer className="w-4 h-4 mr-2" />
                            Print
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
              onRefresh={() => {
                setIsLoading(true);
                setTimeout(() => setIsLoading(false), 500);
              }}
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
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className="h-auto py-4 flex-col gap-2 border-white/10"
                    >
                      <MonitorPlay className="w-6 h-6 text-cyan-400" />
                      <span className="text-zinc-300">Open Display Window</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-4 flex-col gap-2 border-white/10"
                    >
                      <QrCode className="w-6 h-6 text-purple-400" />
                      <span className="text-zinc-300">Display QR Code</span>
                    </Button>
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

