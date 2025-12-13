import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { getUserEvents, deleteAlbum, getTokenStats, updateAlbumStatus, EventConfig, Album, getPaymentRequests, PaymentRequest } from "@/services/eventsApi";
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
import { RefreshCw, MonitorX, Bell, CreditCard, MonitorPlay, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearBigScreen, broadcastToBigScreen } from "@/services/bigScreenBroadcast";
import { ENV } from "@/config/env";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// BigScreen request type
interface BigScreenRequest {
  code: string;
  owner_name?: string;
  photo_count: number;
  created_at: string;
}

// Global deduplication set to survive React StrictMode remounts in dev
const globalNotificationDedup = new Set<string>();

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

  // Notifications State
  const [bigScreenRequests, setBigScreenRequests] = useState<BigScreenRequest[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);

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

  // --- Notifications Logic (WebSocket) ---
  const handleBigScreenRequestNotification = useCallback((albumData: { code: string; owner_name?: string; photo_count?: number }) => {
    // Deduplicate using global set + time window
    const notificationKey = `bs-${albumData.code}-${Math.floor(Date.now() / 5000)}`; // 5 second window
    if (globalNotificationDedup.has(notificationKey)) return;

    globalNotificationDedup.add(notificationKey);
    setTimeout(() => globalNotificationDedup.delete(notificationKey), 6000);

    toast.info('📺 Big Screen Request!', {
      description: `${albumData.owner_name || albumData.code} wants to display photos`,
    });

    setBigScreenRequests(prev => {
      if (prev.some(r => r.code === albumData.code)) return prev;
      return [{
        code: albumData.code,
        owner_name: albumData.owner_name,
        photo_count: albumData.photo_count || 0,
        created_at: new Date().toISOString(),
      }, ...prev];
    });

    addLog('info', `BigScreen request from ${albumData.owner_name || albumData.code}`, 'Visitor');
  }, [addLog]);

  const loadPaymentRequestsData = useCallback(async () => {
    if (!event?.postgres_event_id) return;
    try {
      const requests = await getPaymentRequests(event.postgres_event_id);
      setPaymentRequests(requests);
    } catch (e) {
      console.error("Failed to load payment requests", e);
    }
  }, [event?.postgres_event_id]);

  // WebSocket Connection
  useEffect(() => {
    if (!event?.postgres_event_id) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = ENV.API_URL?.replace(/^https?:\/\//, '') || window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}/ws/albums/${event.postgres_event_id}`;

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onmessage = (e) => {
          try {
            const message = JSON.parse(e.data);
            if (message.type === 'bigscreen_request' && message.data) {
              handleBigScreenRequestNotification(message.data);
            }
            if (message.type === 'payment_request') {
              loadPaymentRequestsData();
              // Deduplicate payment toasts too
              const payKey = `pay-${Date.now()}`;
              // Simple debounce for payment toasts not strictly needed as loadPaymentRequestsData handles list
              toast.info("New payment request received");
              addLog('payment', "New payment request received", 'System');
            }
          } catch (err) {
            console.error("WS parse error", err);
          }
        };

        ws.onclose = () => {
          reconnectTimeout = setTimeout(connect, 5000);
        };
      } catch (e) {
        console.error("WS connection error", e);
      }
    };

    connect();
    loadPaymentRequestsData(); // Initial load

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [event?.postgres_event_id, handleBigScreenRequestNotification, loadPaymentRequestsData, addLog]);

  const handleClearBigScreen = async () => {
    if (!event?.postgres_event_id) return;
    try {
      const success = await clearBigScreen(event.postgres_event_id);
      if (success) {
        toast.success("BigScreen cleared");
        addLog('info', "BigScreen cleared", 'Operator');
      } else {
        toast.error("Failed to clear BigScreen");
      }
    } catch (e) {
      toast.error("Error clearing BigScreen");
    }
  };

  const handleBroadcast = async (req: BigScreenRequest) => {
    if (!event?.postgres_event_id || !event?.user_slug || !event?.slug) return;

    try {
      // Check if album is paid (find in current albums list)
      const album = albums.find(a => a.code === req.code);
      const isPaid = album?.payment_status === 'paid' || album?.status === 'paid';

      const success = await broadcastToBigScreen({
        albumCode: req.code,
        visitorName: req.owner_name,
        isPaid: isPaid,
        eventId: event.postgres_event_id,
        userSlug: event.user_slug,
        eventSlug: event.slug,
      });

      if (success) {
        toast.success(`Broadcasting ${req.code} to BigScreen`);
        addLog('info', `Broadcasting ${req.code}`, 'Operator');
        // Remove from list after broadcasting? User might want to keep it or remove it manually.
        // Let's remove it to keep list clean as requested action is done.
        handleDismissBigScreenRequest(req.code);
      } else {
        toast.error("Failed to broadcast");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error broadcasting");
    }
  };

  const handleDismissBigScreenRequest = (code: string) => {
    setBigScreenRequests(prev => prev.filter(r => r.code !== code));
  };

  const handleDismissPaymentRequest = (code: string) => {
    setPaymentRequests(prev => prev.filter(r => r.code !== code));
  };

  const handleClearAllNotifications = () => {
    setBigScreenRequests([]);
    setPaymentRequests([]);
    toast.success("All notifications cleared");
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
        <div className="space-y-4 flex flex-col h-full">
          {/* Notifications Panel */}
          <Card className="bg-zinc-900 border-zinc-800 flex-1 overflow-hidden flex flex-col min-h-[200px]">
            <CardHeader className="py-3 px-4 border-b border-zinc-800 bg-zinc-900/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-400" />
                  Notifications
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-xs">
                    {bigScreenRequests.length + paymentRequests.length}
                  </Badge>
                  {(bigScreenRequests.length > 0 || paymentRequests.length > 0) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-zinc-500 hover:text-red-400"
                      onClick={handleClearAllNotifications}
                      title="Clear All"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto flex-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-zinc-900 [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-600">
              {bigScreenRequests.length === 0 && paymentRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-zinc-500 text-xs p-4 text-center">
                  <Bell className="w-6 h-6 mb-2 opacity-20" />
                  No new notifications
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {/* BigScreen Requests */}
                  {bigScreenRequests.map((req) => (
                    <div key={`bs-${req.code}`} className="p-3 hover:bg-zinc-800/30 transition-colors group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 p-1.5 rounded-full bg-purple-500/10 text-purple-400">
                            <MonitorPlay className="w-3 h-3" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-200">BigScreen Request</p>
                            <p className="text-xs text-zinc-400">{req.owner_name || 'Visitor'} • {req.code}</p>
                            <p className="text-[10px] text-zinc-500 mt-1">{new Date(req.created_at).toLocaleTimeString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            className="h-6 text-[10px] bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/20 px-2"
                            onClick={() => handleBroadcast(req)}
                          >
                            Show
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-zinc-500 hover:text-white hover:bg-zinc-700/50"
                            onClick={() => handleDismissBigScreenRequest(req.code)}
                          >
                            <span className="sr-only">Dismiss</span>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Payment Requests */}
                  {paymentRequests.map((req) => (
                    <div key={`pay-${req.code}`} className="p-3 hover:bg-zinc-800/30 transition-colors group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 p-1.5 rounded-full bg-green-500/10 text-green-400">
                            <CreditCard className="w-3 h-3" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-200">Payment Request</p>
                            <p className="text-xs text-zinc-400">{req.owner_name || 'Visitor'} • {req.code}</p>
                            <p className="text-[10px] text-zinc-500 mt-1">Cash Payment</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:text-green-300 border border-green-500/20 px-2"
                            onClick={() => {
                              const album = albums.find(a => a.code === req.code);
                              if (album) {
                                setAlbumToMarkPaid(album);
                                setMarkPaidModalOpen(true);
                              } else {
                                toast.error("Album not found in current list");
                              }
                            }}
                          >
                            Pay
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-zinc-500 hover:text-white hover:bg-zinc-700/50"
                            onClick={() => handleDismissPaymentRequest(req.code)}
                          >
                            <span className="sr-only">Dismiss</span>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            {/* Clear BigScreen Button at bottom of Notifications panel */}
            <div className="p-3 border-t border-zinc-800 bg-zinc-900/50">
              <Button
                variant="ghost"
                size="sm"
                className="w-full bg-red-500/5 hover:bg-red-500/10 text-red-400 hover:text-red-300 border border-red-500/10 transition-all"
                onClick={handleClearBigScreen}
              >
                <MonitorX className="w-4 h-4 mr-2" />
                Clear BigScreen
              </Button>
            </div>
          </Card>

          {/* Auto-refresh Status */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg text-sm bg-zinc-800/50 border border-white/10 shrink-0">
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

          {/* System Health */}
          <div className="shrink-0">
            <EventHealthPanel
              tokens={tokens}
              model={event?.settings?.aiModel || 'Default Model'}
              processorStatus="online"
              errors={0}
            />
          </div>
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
            // Remove from payment requests if present
            setPaymentRequests(prev => prev.filter(r => r.code !== albumToMarkPaid.code));
          }}
        />
      )}
    </LiveEventLayout>
  );
}
