import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { getUserEvents, deleteAlbum, getTokenStats, updateAlbumStatus, EventConfig, Album } from "@/services/eventsApi";
import { useLiveAlbums } from "@/hooks/useLiveAlbums";
import { LiveEventLayout } from "@/components/live-event/LiveEventLayout";
import { LiveOverview } from "@/components/live-event/LiveOverview";
import { LiveQueue } from "@/components/live-event/LiveQueue";
import { LiveStations } from "@/components/live-event/LiveStations";
import { LiveSales } from "@/components/live-event/LiveSales";
import { LiveStaff } from "@/components/live-event/LiveStaff";
import { EventHealthPanel } from "@/components/live-event/EventHealthPanel";
import { LiveLogs, LogEntry } from "@/components/live-event/LiveLogs";
import { MarkPaidModal } from "@/components/live-event/MarkPaidModal";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { RefreshCw } from "lucide-react";

export default function LiveEventPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [event, setEvent] = useState<EventConfig | null>(null);
  const [tokens, setTokens] = useState(0);
  
  // Initialize active tab from URL query param, default to 'overview'
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  
  const [isPaused, setIsPaused] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Mark Paid Modal state
  const [markPaidModalOpen, setMarkPaidModalOpen] = useState(false);
  const [albumToMarkPaid, setAlbumToMarkPaid] = useState<Album | null>(null);

  // Logs state
  const [logs, setLogs] = useState<LogEntry[]>([
     { id: '1', type: 'info', message: 'Event started', timestamp: new Date(Date.now() - 1000 * 60 * 60), source: 'System' },
  ]);

  // Add log helper
  const addLog = useCallback((type: LogEntry['type'], message: string, source: string = 'System') => {
    setLogs(prev => [
      { id: Date.now().toString(), type, message, timestamp: new Date(), source },
      ...prev.slice(0, 99) // Keep last 100 logs
    ]);
  }, []);

  // Use live albums hook with polling (every 5 seconds)
  const {
    albums,
    stats,
    isLoading: isLoadingAlbums,
    lastUpdated,
    refresh: refreshAlbums,
    setAlbums,
  } = useLiveAlbums({
    eventId: event?.postgres_event_id || 0,
    enabled: !!event?.postgres_event_id && !isPaused,
    pollInterval: 5000, // 5 seconds
  });

  // Update activeTab if URL changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

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
      setIsLoadingEvent(true);
      // 1. Load Event Config
      const events = await getUserEvents();
      const currentEvent = events.find(e => e._id === eventId);
      
      if (!currentEvent) {
        toast.error("Event not found");
        navigate('/admin/events');
        return;
      }
      setEvent(currentEvent);
    } catch (error) {
      console.error("Failed to load event:", error);
      toast.error("Failed to load event");
    } finally {
      setIsLoadingEvent(false);
    }
  };

  const handleAction = async (action: string, album: Album) => {
    try {
      switch (action) {
        case 'approve':
        case 'complete':
          await updateAlbumStatus(album.code, 'completed');
          toast.success(`Album ${album.code} marked as completed!`);
          addLog('success', `Album ${album.code} completed`, 'Operator');
          // Update local state immediately then refresh from server
          setAlbums(prev => prev.map(a => 
            a.code === album.code ? { ...a, status: 'completed' } : a
          ));
          setTimeout(() => refreshAlbums(), 500);
          break;
        case 'pay':
        case 'paid':
          // Open the Mark Paid modal instead of directly updating
          setAlbumToMarkPaid(album);
          setMarkPaidModalOpen(true);
          break;
        case 'in_progress':
          await updateAlbumStatus(album.code, 'in_progress');
          toast.success(`Album ${album.code} set to in progress`);
          addLog('info', `Album ${album.code} set to in progress`, 'Operator');
          setAlbums(prev => prev.map(a => 
            a.code === album.code ? { ...a, status: 'in_progress' } : a
          ));
          setTimeout(() => refreshAlbums(), 500);
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
             addLog('warning', `Album ${album.code} deleted`, 'Operator');
             // Remove from local state immediately then refresh
             setAlbums(prev => prev.filter(a => a.code !== album.code));
             setTimeout(() => refreshAlbums(), 500);
          }
          break;
        case 'force_complete':
          toast.info('Force complete requested');
          // logic
          break;
        case 'retry':
          toast.info('Retry processing requested');
          break;
        case 'email':
          toast.info(`Email sending triggered for ${album.code}`);
          // Open email modal logic here
          break;
        case 'whatsapp':
           if (event?.user_slug && event?.slug) {
             const url = `${window.location.origin}/${event.user_slug}/${event.slug}/album/${album.code}`;
             const text = `Here are your photos from ${event.title}: ${url}`;
             window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
           }
           break;
        case 'print':
           toast.info(`Print dialog for ${album.code}`);
           // window.print() or specific print endpoint
           break;
        case 'copy_code':
           navigator.clipboard.writeText(album.code);
           toast.success('Album code copied');
           break;
        case 'copy_url':
           if (event?.user_slug && event?.slug) {
             const url = `${window.location.origin}/${event.user_slug}/${event.slug}/album/${album.code}`;
             navigator.clipboard.writeText(url);
             toast.success('Album URL copied');
           }
           break;
      }
    } catch (error) {
      console.error(error);
      toast.error("Action failed");
      addLog('error', `Action ${action} failed`, 'System');
    }
  };

  const handleOpenStation = (type: string) => {
    if (!event?.user_slug || !event?.slug) return;
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/${event.user_slug}/${event.slug}/${type}`;
    window.open(url, '_blank');
  };

  // Helper to update both state and URL
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Update URL without reloading
    navigate(`?tab=${tab}`, { replace: true });
  };

  const isLoading = isLoadingEvent || isLoadingAlbums;

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
      onTabChange={handleTabChange}
      onTogglePause={() => setIsPaused(!isPaused)}
      onOpenSettings={() => setIsSettingsOpen(true)}
      onOpenStation={handleOpenStation}
      leftSidebar={<LiveStations event={event} mode="sidebar" />}
      rightSidebar={
        <div className="space-y-4">
          {/* Auto-refresh Status */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg text-sm bg-zinc-800/50 border border-white/10">
            <div className="flex items-center gap-2 text-zinc-400">
              <RefreshCw className="w-4 h-4" />
              <span>Auto-refresh: 5s</span>
            </div>
            {lastUpdated && (
              <span className="text-xs text-zinc-500">
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
          <EventHealthPanel 
            tokens={tokens} 
            model={event?.settings?.aiModel || 'Default Model'} 
            processorStatus="online"
            errors={0}
          />
        </div>
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
          <LiveSales eventId={event?.postgres_event_id} eventConfig={event} />
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

      {/* Mark Paid Modal */}
      {albumToMarkPaid && event?.postgres_event_id && (
        <MarkPaidModal
          open={markPaidModalOpen}
          onOpenChange={(open) => {
            setMarkPaidModalOpen(open);
            if (!open) setAlbumToMarkPaid(null);
          }}
          albumCode={albumToMarkPaid.code}
          albumOwnerName={albumToMarkPaid.owner_name}
          eventId={event.postgres_event_id}
          eventConfig={event}
          onSuccess={() => {
            addLog('payment', `Payment marked for ${albumToMarkPaid.code}`, 'Operator');
            // Update local state immediately for UI responsiveness
            setAlbums(prev => prev.map(a => 
              a.code === albumToMarkPaid.code ? { ...a, status: 'paid', payment_status: 'paid' } : a
            ));
            // Also refresh from server to ensure sync
            setTimeout(() => refreshAlbums(), 500);
            setAlbumToMarkPaid(null);
          }}
        />
      )}
    </LiveEventLayout>
  );
}
