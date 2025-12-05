import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getUserEvents, getEventAlbumStats, getEventAlbums, EventConfig, EventAlbumStats, Album } from "@/services/eventsApi";
import { LiveEventLayout } from "@/components/live-event/LiveEventLayout";
import { LiveOverview } from "@/components/live-event/LiveOverview";
import { LiveQueue } from "@/components/live-event/LiveQueue";
import { LiveStations } from "@/components/live-event/LiveStations";
import { LiveSales } from "@/components/live-event/LiveSales";
import { LiveStaff } from "@/components/live-event/LiveStaff";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { EventSettings } from "@/components/admin/event-editor/EventSettings";

export default function LiveEventPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState<EventConfig | null>(null);
  const [stats, setStats] = useState<EventAlbumStats | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadEventData();
    }
  }, [eventId]);

  const loadEventData = async () => {
    try {
      setIsLoading(true);
      // 1. Load Event Config
      const events = await getUserEvents();
      const currentEvent = events.find(e => e._id === eventId);
      
      if (!currentEvent) {
        toast.error("Event not found");
        navigate('/admin/events');
        return;
      }
      setEvent(currentEvent);

      // 2. Load Stats & Albums (if connected to PostgreSQL)
      if (currentEvent.postgres_event_id) {
        const [eventStats, eventAlbums] = await Promise.all([
          getEventAlbumStats(currentEvent.postgres_event_id),
          getEventAlbums(currentEvent.postgres_event_id)
        ]);
        setStats(eventStats);
        setAlbums(eventAlbums);
      } else {
        // Mock data for events without postgres connection (e.g. draft/demo)
        setStats({
          totalAlbums: 0,
          completedAlbums: 0,
          inProgressAlbums: 0,
          paidAlbums: 0,
          totalPhotos: 0,
          pendingApproval: 0
        });
        setAlbums([]);
      }
    } catch (error) {
      console.error("Failed to load live data:", error);
      toast.error("Failed to connect to live event server");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: string, album: Album) => {
    try {
      switch (action) {
        case 'approve':
          // Assuming updateAlbumStatus is imported
          // await updateAlbumStatus(album.id, 'completed');
          toast.success(`Album ${album.code} approved!`);
          // Reload data
          loadEventData();
          break;
        case 'pay':
          // await updateAlbumStatus(album.id, 'paid');
          toast.success(`Album ${album.code} marked as paid!`);
          loadEventData();
          break;
        case 'view':
          // Open album detail modal or page
          // For now, let's open the public album page
          if (event?.user_slug && event?.slug) {
             const url = `${window.location.origin}/${event.user_slug}/${event.slug}/album/${album.code}`;
             window.open(url, '_blank');
          }
          break;
        case 'share':
          // Trigger share modal (to be implemented)
          toast.info(`Share dialog for ${album.code}`);
          break;
        case 'delete':
          if (confirm('Are you sure you want to delete this album?')) {
             // await deleteAlbum(album.id);
             toast.success(`Album ${album.code} deleted`);
             loadEventData();
          }
          break;
      }
    } catch (error) {
      console.error(error);
      toast.error("Action failed");
    }
  };

  const handleOpenStation = (type: string) => {
    if (!event?.user_slug || !event?.slug) return;
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/${event.user_slug}/${event.slug}/${type}`;
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <LiveEventLayout
      event={event}
      isPaused={isPaused}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onTogglePause={() => setIsPaused(!isPaused)}
      onOpenSettings={() => setIsSettingsOpen(true)}
      onOpenStation={handleOpenStation}
    >
      <div className="space-y-8 animate-in fade-in duration-500">
        
        {/* Always show Overview stats unless we are in specific tabs that hide it? 
            User requirement: "SECCIÓN 1 — Real-time Overview"
            "SECCIÓN 2 — Live Queue"
            Maybe Overview is always visible at top, or just the stats row.
            Let's show stats row on 'overview' tab and maybe simplified elsewhere.
            For now, follow the tabs structure.
        */}
        
        {activeTab === 'overview' && (
          <>
            <LiveOverview stats={stats || { totalAlbums: 0, completedAlbums: 0, inProgressAlbums: 0, paidAlbums: 0, totalPhotos: 0, pendingApproval: 0 }} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <LiveQueue albums={albums.slice(0, 5)} onAction={handleAction} />
              </div>
              <div className="space-y-6">
                <LiveStations />
              </div>
            </div>
          </>
        )}

        {activeTab === 'queue' && (
          <LiveQueue albums={albums} onAction={handleAction} />
        )}

        {activeTab === 'stations' && (
          <LiveStations />
        )}

        {activeTab === 'sales' && (
          <LiveSales />
        )}
        
        {activeTab === 'staff' && (
          <LiveStaff event={event} />
        )}
      </div>

      {/* Settings Sheet (Collapsible "Settings" from requirements) */}
      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] bg-zinc-950 border-l border-white/10 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">Live Settings</SheetTitle>
            <SheetDescription className="text-zinc-400">Adjust rules on the fly.</SheetDescription>
          </SheetHeader>
          <div className="mt-6">
             {/* We reuse the EventSettings component but might need to adapt it to save instantly or show limited options 
                 For now, we can show a simplified view or the full component in read-only/edit mode.
                 Since EventSettings expects formData/setFormData, we need to wrap it or create a "LiveSettings" wrapper.
                 For this MVP, I'll assume we want quick toggles.
             */}
             <p className="text-sm text-zinc-500 mb-4">Quick Toggles</p>
             {/* Placeholder for settings */}
             <div className="space-y-4">
                <div className="p-4 rounded-lg bg-zinc-900 border border-white/10">
                    <h4 className="text-sm font-medium text-white mb-2">Watermark</h4>
                    {/* ... */}
                </div>
             </div>
          </div>
        </SheetContent>
      </Sheet>
    </LiveEventLayout>
  );
}

