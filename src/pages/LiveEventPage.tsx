import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getUserEvents, getEventAlbumStats, getEventAlbums, deleteAlbum, getTokenStats, EventConfig, EventAlbumStats, Album } from "@/services/eventsApi";
import { LiveEventLayout } from "@/components/live-event/LiveEventLayout";
import { LiveOverview } from "@/components/live-event/LiveOverview";
import { LiveQueue } from "@/components/live-event/LiveQueue";
import { LiveStations } from "@/components/live-event/LiveStations";
import { LiveSales } from "@/components/live-event/LiveSales";
import { LiveStaff } from "@/components/live-event/LiveStaff";
import { EventHealthPanel } from "@/components/live-event/EventHealthPanel";
import { LiveLogs, LogEntry } from "@/components/live-event/LiveLogs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export default function LiveEventPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState<EventConfig | null>(null);
  const [stats, setStats] = useState<EventAlbumStats | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [tokens, setTokens] = useState(0);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Mock Logs for now
  const [logs, setLogs] = useState<LogEntry[]>([
     { id: '1', type: 'info', message: 'Event started', timestamp: new Date(Date.now() - 1000 * 60 * 60), source: 'System' },
     { id: '2', type: 'success', message: 'Booth 1 connected', timestamp: new Date(Date.now() - 1000 * 60 * 55), source: 'Booth' },
     { id: '3', type: 'payment', message: 'Payment received $25.00', timestamp: new Date(Date.now() - 1000 * 60 * 15), source: 'Sales' },
  ]);

  useEffect(() => {
    if (eventId) {
      loadEventData();
      loadTokenStats();
    }
  }, [eventId]);

  const loadTokenStats = async () => {
    try {
      const data = await getTokenStats();
      setTokens(data.current_tokens);
    } catch (e) {
      console.error("Failed to load tokens", e);
    }
  };

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
        setAlbums(eventAlbums || []);
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
          toast.success(`Album ${album.code} approved!`);
          // Simulate log update
          setLogs(prev => [{ id: Date.now().toString(), type: 'success', message: `Album ${album.code} approved`, timestamp: new Date(), source: 'Operator' }, ...prev]);
          loadEventData();
          break;
        case 'pay':
          toast.success(`Album ${album.code} marked as paid!`);
          setLogs(prev => [{ id: Date.now().toString(), type: 'payment', message: `Payment marked for ${album.code}`, timestamp: new Date(), source: 'Operator' }, ...prev]);
          loadEventData();
          break;
        case 'view':
          if (event?.user_slug && event?.slug) {
             const url = `${window.location.origin}/${event.user_slug}/${event.slug}/album/${album.code}`;
             window.open(url, '_blank');
          }
          break;
        case 'share':
          toast.info(`Share dialog for ${album.code}`);
          break;
        case 'delete':
          if (confirm(`Are you sure you want to delete album ${album.code}? This will also delete all photos in the album.`)) {
             const result = await deleteAlbum(album.code);
             toast.success(`Album ${album.code} deleted (${result.photosDeleted} photos removed)`);
             setLogs(prev => [{ id: Date.now().toString(), type: 'warning', message: `Album ${album.code} deleted`, timestamp: new Date(), source: 'Operator' }, ...prev]);
             loadEventData();
          }
          break;
        case 'force_complete':
          toast.info('Force complete requested');
          // logic
          break;
        case 'retry':
          toast.info('Retry processing requested');
          break;
      }
    } catch (error) {
      console.error(error);
      toast.error("Action failed");
      setLogs(prev => [{ id: Date.now().toString(), type: 'error', message: `Action ${action} failed`, timestamp: new Date(), source: 'System' }, ...prev]);
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
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
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
      leftSidebar={<LiveStations event={event} mode="sidebar" />}
      rightSidebar={
        <EventHealthPanel 
          tokens={tokens} 
          model={event?.settings?.aiModel || 'Default Model'} 
          processorStatus="online"
          errors={0}
        />
      }
    >
      <div className="animate-in fade-in duration-500 space-y-8">
        {activeTab === 'overview' && (
          <>
            <LiveOverview stats={stats || { totalAlbums: 0, completedAlbums: 0, inProgressAlbums: 0, paidAlbums: 0, totalPhotos: 0, pendingApproval: 0 }} />
            <LiveQueue albums={albums || []} onAction={handleAction} />
            <LiveLogs logs={logs} />
          </>
        )}

        {activeTab === 'sales' && (
          <LiveSales />
        )}
        
        {activeTab === 'staff' && (
          <LiveStaff event={event} />
        )}
      </div>

      {/* Settings Sheet */}
      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] bg-zinc-950 border-l border-white/10 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">Live Settings</SheetTitle>
            <SheetDescription className="text-zinc-400">Adjust rules on the fly.</SheetDescription>
          </SheetHeader>
          <div className="mt-6">
             <p className="text-sm text-zinc-500 mb-4">Quick Toggles</p>
             <div className="space-y-4">
                <div className="p-4 rounded-lg bg-zinc-900 border border-white/10">
                    <h4 className="text-sm font-medium text-white mb-2">Watermark</h4>
                    {/* Placeholder */}
                </div>
             </div>
          </div>
        </SheetContent>
      </Sheet>
    </LiveEventLayout>
  );
}
