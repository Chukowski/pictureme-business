/**
 * AlbumsTab Component
 * 
 * Dashboard tab for managing album tracking across events.
 * Shows album statistics, station management, and staff tools.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, getUserEvents, getEventAlbumStats, type EventConfig, type EventAlbumStats } from "@/services/eventsApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, QrCode, Users, Camera, MapPin, Settings,
  ExternalLink, ChevronRight, Plus, RefreshCw, Loader2,
  Copy, Check, Link, Key, Eye, EyeOff
} from "lucide-react";
import { toast } from "sonner";
import { StaffAlbumTools } from "@/components/staff";

interface AlbumsTabProps {
  currentUser: User;
}

interface EventWithAlbums extends EventConfig {
  albumStats?: {
    totalAlbums: number;
    completedAlbums: number;
    pendingApproval: number;
    totalPhotos: number;
  };
}

export default function AlbumsTab({ currentUser }: AlbumsTabProps) {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventWithAlbums[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventWithAlbums | null>(null);
  const [copiedStationId, setCopiedStationId] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  // Load events with album tracking enabled
  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const allEvents = await getUserEvents();
      // Filter events with album tracking enabled
      const albumEvents = allEvents.filter(e => e.albumTracking?.enabled);
      
      // Fetch real album stats for each event
      const eventsWithStats: EventWithAlbums[] = await Promise.all(
        albumEvents.map(async (e) => {
          let stats: EventAlbumStats = {
            totalAlbums: 0,
            completedAlbums: 0,
            inProgressAlbums: 0,
            paidAlbums: 0,
            totalPhotos: 0,
            pendingApproval: 0
          };
          
          // Only fetch stats if we have a postgres_event_id
          if (e.postgres_event_id) {
            try {
              stats = await getEventAlbumStats(e.postgres_event_id);
            } catch (err) {
              console.warn(`Failed to load stats for event ${e._id}:`, err);
            }
          }
          
          return {
            ...e,
            albumStats: {
              totalAlbums: stats.totalAlbums,
              completedAlbums: stats.completedAlbums,
              pendingApproval: stats.pendingApproval,
              totalPhotos: stats.totalPhotos,
            }
          };
        })
      );

      setEvents(eventsWithStats);
      if (eventsWithStats.length > 0) {
        setSelectedEvent(eventsWithStats[0]);
      }
    } catch (error) {
      console.error("Error loading events:", error);
      toast.error("Failed to load events");
    } finally {
      setIsLoading(false);
    }
  };

  const getStationUrl = (event: EventWithAlbums, stationType: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/${currentUser.slug}/${event.slug}/${stationType}`;
  };

  const handleCopyStationLink = (event: EventWithAlbums, station: { id: string; type: string; name: string }) => {
    const url = getStationUrl(event, station.type);
    navigator.clipboard.writeText(url);
    setCopiedStationId(station.id);
    toast.success(`Link copied for ${station.name}`);
    setTimeout(() => setCopiedStationId(null), 2000);
  };

  const handleOpenStaffDashboard = (event: EventWithAlbums) => {
    // Open the full Staff Dashboard using admin route
    const url = `/admin/staff/${event._id}`;
    window.open(url, '_blank');
  };

  const handleViewAlbums = (event: EventWithAlbums) => {
    // Open the viewer page for this event
    const url = `${window.location.origin}/${currentUser.slug}/${event.slug}/viewer`;
    window.open(url, '_blank');
  };

  const handleOpenRegistrationQR = (event: EventWithAlbums) => {
    const url = `${window.location.origin}/${currentUser.slug}/${event.slug}/registration`;
    navigator.clipboard.writeText(url);
    toast.success('Registration URL copied! You can also see the QR in Settings tab →');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="bg-zinc-900/50 border-white/10">
        <CardContent className="py-16 text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
          <h3 className="text-xl font-semibold text-white mb-2">No Album Events</h3>
          <p className="text-zinc-400 mb-6 max-w-md mx-auto">
            Album Tracking is not enabled on any of your events. 
            Enable it in the Event Editor to start using multi-station workflows.
          </p>
          <Button
            onClick={() => navigate('/admin/events')}
            className="bg-cyan-600 hover:bg-cyan-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Album Event
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Event Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-white">Album Management</h2>
          <select
            value={selectedEvent?._id || ''}
            onChange={(e) => {
              const event = events.find(ev => ev._id === e.target.value);
              setSelectedEvent(event || null);
            }}
            className="h-10 px-4 rounded-lg bg-zinc-900 border border-white/10 text-white"
          >
            {events.map(event => (
              <option key={event._id} value={event._id}>
                {event.title}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={loadEvents}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 transition-all text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {selectedEvent && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Event Info & Stations */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Card */}
            <Card className="bg-zinc-900/50 border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      {selectedEvent.title}
                      <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                        Album Mode
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-zinc-400">
                      {selectedEvent.albumTracking?.albumType === 'group' ? 'Group Albums' : 'Individual Albums'}
                      {' • '}
                      Max {selectedEvent.albumTracking?.rules?.maxPhotosPerAlbum || 5} photos per album
                    </CardDescription>
                  </div>
                  <button
                    onClick={() => handleOpenStaffDashboard(selectedEvent)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 transition-all text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Staff Dashboard
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-3 rounded-lg bg-black/30">
                    <Users className="w-5 h-5 mx-auto mb-1 text-cyan-400" />
                    <p className="text-xl font-bold text-white">{selectedEvent.albumStats?.totalAlbums}</p>
                    <p className="text-xs text-zinc-500">Albums</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-black/30">
                    <Camera className="w-5 h-5 mx-auto mb-1 text-purple-400" />
                    <p className="text-xl font-bold text-white">{selectedEvent.albumStats?.totalPhotos}</p>
                    <p className="text-xs text-zinc-500">Photos</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-black/30">
                    <BookOpen className="w-5 h-5 mx-auto mb-1 text-green-400" />
                    <p className="text-xl font-bold text-white">{selectedEvent.albumStats?.completedAlbums}</p>
                    <p className="text-xs text-zinc-500">Completed</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-black/30">
                    <MapPin className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                    <p className="text-xl font-bold text-white">{selectedEvent.albumTracking?.stations?.length || 0}</p>
                    <p className="text-xs text-zinc-500">Stations</p>
                  </div>
                </div>

                {/* Staff Access PIN */}
                {selectedEvent.settings?.staffAccessCode && (
                  <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Key className="w-5 h-5 text-amber-400" />
                        <div>
                          <p className="text-sm font-medium text-white">Staff PIN</p>
                          <p className="text-xs text-zinc-400">Share with staff for dashboard access</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="px-3 py-1.5 bg-black/40 rounded-lg text-amber-400 font-mono text-lg tracking-widest">
                          {showPin ? selectedEvent.settings.staffAccessCode : '••••••'}
                        </code>
                        <button
                          onClick={() => setShowPin(!showPin)}
                          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all"
                          title={showPin ? 'Hide PIN' : 'Show PIN'}
                        >
                          {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedEvent.settings?.staffAccessCode || '');
                            setCopiedPin(true);
                            toast.success('PIN copied!');
                            setTimeout(() => setCopiedPin(false), 2000);
                          }}
                          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all"
                          title="Copy PIN"
                        >
                          {copiedPin ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {/* Staff Dashboard Link */}
                    <div className="flex gap-2 pt-3 border-t border-amber-500/20">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const staffUrl = `${window.location.origin}/${selectedEvent.user_slug}/${selectedEvent.slug}/staff`;
                          const message = `Staff Dashboard Access\n\nURL: ${staffUrl}\nPIN: ${selectedEvent.settings?.staffAccessCode}\n\nUse this PIN to access the staff dashboard.`;
                          navigator.clipboard.writeText(message);
                          toast.success('Staff access info copied! Ready to share.');
                        }}
                        className="flex-1 bg-amber-600/20 border-amber-500/30 text-amber-400 hover:bg-amber-600/30 hover:text-amber-300"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Staff Access Info
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const staffUrl = `${window.location.origin}/${selectedEvent.user_slug}/${selectedEvent.slug}/staff`;
                          window.open(staffUrl, '_blank');
                        }}
                        className="bg-zinc-800 border-white/10 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open
                      </Button>
                    </div>
                  </div>
                )}

                {/* Album Rules Info */}
                {(selectedEvent.albumTracking?.rules?.requireStaffApproval || selectedEvent.albumTracking?.rules?.printReady) && (
                  <div className="mb-6 p-4 rounded-lg bg-zinc-800/50 border border-white/10">
                    <p className="text-sm font-medium text-white mb-2">Album Rules</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.albumTracking?.rules?.requireStaffApproval && (
                        <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs">
                          Staff Approval Required
                        </span>
                      )}
                      {selectedEvent.albumTracking?.rules?.printReady && (
                        <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                          Payment Required for Downloads
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Stations */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-zinc-400">Stations</h4>
                  {selectedEvent.albumTracking?.stations?.length ? (
                    <div className="space-y-2">
                      {selectedEvent.albumTracking.stations.map((station, index) => (
                        <div
                          key={station.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-white font-medium">{station.name}</p>
                              <p className="text-xs text-zinc-500">{station.type}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-600 truncate max-w-[150px] hidden md:block">
                              /{currentUser.slug}/{selectedEvent.slug}/{station.type}
                            </span>
                            <button
                              onClick={() => handleCopyStationLink(selectedEvent, station)}
                              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-white/10 transition-all"
                              title={`Copy link for ${station.name}`}
                            >
                              {copiedStationId === station.id ? (
                                <Check className="w-4 h-4 text-green-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => window.open(getStationUrl(selectedEvent, station.type), '_blank')}
                              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-white/10 transition-all"
                              title={`Open ${station.name}`}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-zinc-500 text-sm py-4 text-center">
                      No stations configured. Edit the event to add stations.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <button
                onClick={() => handleOpenRegistrationQR(selectedEvent)}
                className="h-auto py-4 flex flex-col items-center gap-2 rounded-xl bg-zinc-900/50 border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800/50 hover:border-cyan-500/30 transition-all"
                title="Copy registration URL"
              >
                <QrCode className="w-6 h-6 text-cyan-400" />
                <span className="text-xs">Registration QR</span>
              </button>
              <button
                onClick={() => handleViewAlbums(selectedEvent)}
                className="h-auto py-4 flex flex-col items-center gap-2 rounded-xl bg-zinc-900/50 border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800/50 hover:border-purple-500/30 transition-all"
                title="Open album viewer page"
              >
                <BookOpen className="w-6 h-6 text-purple-400" />
                <span className="text-xs">View Albums</span>
              </button>
              <button
                onClick={() => handleOpenStaffDashboard(selectedEvent)}
                className="h-auto py-4 flex flex-col items-center gap-2 rounded-xl bg-zinc-900/50 border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800/50 hover:border-amber-500/30 transition-all"
                title="Open extended staff dashboard"
              >
                <Users className="w-6 h-6 text-amber-400" />
                <span className="text-xs">Staff Dashboard</span>
              </button>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/${currentUser.slug}/${selectedEvent.slug}/booth`;
                  window.open(url, '_blank');
                }}
                className="h-auto py-4 flex flex-col items-center gap-2 rounded-xl bg-zinc-900/50 border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800/50 hover:border-green-500/30 transition-all"
                title="Open photo booth"
              >
                <Camera className="w-6 h-6 text-green-400" />
                <span className="text-xs">Open Booth</span>
              </button>
              <button
                onClick={() => navigate(`/admin/events/edit/${selectedEvent._id}`)}
                className="h-auto py-4 flex flex-col items-center gap-2 rounded-xl bg-zinc-900/50 border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800/50 hover:border-zinc-500/30 transition-all"
                title="Edit event settings"
              >
                <Settings className="w-6 h-6 text-zinc-400" />
                <span className="text-xs">Edit Event</span>
              </button>
            </div>
            
            {/* Big Screen Display Button */}
            <div className="mt-4">
              <button
                onClick={() => {
                  const displayUrl = `${window.location.origin}/${currentUser.slug}/${selectedEvent.slug}/display`;
                  window.open(displayUrl, 'bigscreen', 'width=1920,height=1080');
                  toast.success('Display window opened! Move it to your big screen.');
                }}
                className="w-full h-auto py-3 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-400 hover:from-cyan-500/30 hover:to-purple-500/30 transition-all"
                title="Open big screen display for viewer station"
              >
                <ExternalLink className="w-5 h-5" />
                <span className="text-sm font-medium">Open Big Screen Display</span>
              </button>
            </div>
          </div>

          {/* Right Column - Staff Tools */}
          <div className="lg:col-span-1">
            {(() => {
              console.log('📧 Event branding:', selectedEvent.branding);
              console.log('📧 Logo path:', selectedEvent.branding?.logoPath);
              return null;
            })()}
            <StaffAlbumTools
              eventId={selectedEvent._id}
              postgresEventId={selectedEvent.postgres_event_id}
              eventName={selectedEvent.title}
              userSlug={currentUser.slug}
              eventSlug={selectedEvent.slug}
              stats={selectedEvent.albumStats}
              primaryColor={selectedEvent.theme?.primaryColor}
              eventLogoUrl={selectedEvent.branding?.logoPath}
              onRefresh={loadEvents}
            />
          </div>
        </div>
      )}
    </div>
  );
}

