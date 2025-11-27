/**
 * AlbumsTab Component
 * 
 * Dashboard tab for managing album tracking across events.
 * Shows album statistics, station management, and staff tools.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, getUserEvents, type EventConfig } from "@/services/eventsApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, QrCode, Users, Camera, MapPin, Settings,
  ExternalLink, ChevronRight, Plus, RefreshCw, Loader2
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
      
      // Add mock album stats (in production, this would come from API)
      const eventsWithStats: EventWithAlbums[] = albumEvents.map(e => ({
        ...e,
        albumStats: {
          totalAlbums: Math.floor(Math.random() * 100) + 10,
          completedAlbums: Math.floor(Math.random() * 50) + 5,
          pendingApproval: Math.floor(Math.random() * 10),
          totalPhotos: Math.floor(Math.random() * 500) + 50,
        }
      }));

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

  const handleGenerateQR = (event: EventWithAlbums, stationType: string) => {
    // In production, this would generate a real QR code
    toast.success(`QR code generated for ${stationType}`);
  };

  const handleOpenStaffDashboard = (event: EventWithAlbums) => {
    navigate(`/${currentUser.slug}/${event.slug}/staff`);
  };

  const handleViewAlbums = (event: EventWithAlbums) => {
    // Navigate to album list for this event
    navigate(`/admin/events/${event._id}/albums`);
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
        <Button
          variant="outline"
          size="sm"
          onClick={loadEvents}
          className="border-white/20 text-zinc-300"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenStaffDashboard(selectedEvent)}
                    className="border-white/20 text-zinc-300"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Staff Dashboard
                  </Button>
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateQR(selectedEvent, station.name)}
                            className="border-white/10 text-zinc-400 hover:text-white"
                          >
                            <QrCode className="w-4 h-4" />
                          </Button>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                variant="outline"
                onClick={() => handleGenerateQR(selectedEvent, 'Registration')}
                className="h-auto py-4 flex-col gap-2 border-white/10 text-zinc-300 hover:text-white hover:bg-white/5"
              >
                <QrCode className="w-6 h-6 text-cyan-400" />
                <span className="text-xs">Registration QR</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleViewAlbums(selectedEvent)}
                className="h-auto py-4 flex-col gap-2 border-white/10 text-zinc-300 hover:text-white hover:bg-white/5"
              >
                <BookOpen className="w-6 h-6 text-purple-400" />
                <span className="text-xs">View Albums</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleOpenStaffDashboard(selectedEvent)}
                className="h-auto py-4 flex-col gap-2 border-white/10 text-zinc-300 hover:text-white hover:bg-white/5"
              >
                <Users className="w-6 h-6 text-green-400" />
                <span className="text-xs">Staff Tools</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/admin/events/${selectedEvent._id}/edit`)}
                className="h-auto py-4 flex-col gap-2 border-white/10 text-zinc-300 hover:text-white hover:bg-white/5"
              >
                <Settings className="w-6 h-6 text-amber-400" />
                <span className="text-xs">Edit Event</span>
              </Button>
            </div>
          </div>

          {/* Right Column - Staff Tools */}
          <div className="lg:col-span-1">
            <StaffAlbumTools
              eventId={selectedEvent._id}
              eventName={selectedEvent.title}
              stats={selectedEvent.albumStats}
              primaryColor={selectedEvent.theme?.primaryColor}
              onRefresh={loadEvents}
            />
          </div>
        </div>
      )}
    </div>
  );
}

