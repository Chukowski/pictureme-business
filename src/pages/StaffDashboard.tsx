/**
 * StaffDashboard Page
 * 
 * Staff-only dashboard for managing albums and photos during an event.
 * Accessible via /admin/staff/:eventId OR /:userSlug/:eventSlug/staff (legacy)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEventConfig } from '@/hooks/useEventConfig';
import { useEventContext } from '@/contexts/EventContext';
import { getUserEvents } from '@/services/eventsApi';
import {
  Loader2, ArrowLeft, QrCode, Users, Camera, BookOpen,
  CheckCircle2, XCircle, Clock, Settings, RefreshCw,
  MonitorPlay, Printer, Mail, MessageSquare, Lock, Unlock,
  Search, Filter, MoreVertical, Eye, BarChart3, Copy, Download,
  DollarSign, LayoutDashboard, Trash2, Bell
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
import { getEventAlbums, getEventAlbumsWithPin, updateAlbumStatus, sendAlbumEmailByCode, getEmailStatus, getCurrentUser, deleteAlbum, getPaymentRequests, type PaymentRequest } from '@/services/eventsApi';
import { MonitorUp } from 'lucide-react';

// BigScreen request type (similar to PaymentRequest but for display requests)
interface BigScreenRequest {
  code: string;
  owner_name?: string;
  photo_count: number;
  created_at: string;
}
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ENV } from '@/config/env';
import { broadcastToBigScreen } from '@/services/bigScreenBroadcast';

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
  // Try to get config from context first (for short URLs)
  const eventContext = useEventContext();
  
  // Support both /admin/staff/:eventId and /:userSlug/:eventSlug/staff routes
  const params = useParams<{ 
    userSlug?: string; 
    eventSlug?: string;
    eventId?: string;
  }>();
  
  const userSlug = eventContext?.userSlug || params.userSlug || '';
  const eventSlug = eventContext?.eventSlug || params.eventSlug || '';
  const routeEventId = params.eventId;
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine if we're in admin route mode
  const isAdminRoute = location.pathname.startsWith('/admin/staff');
  const hasContextConfig = !!eventContext?.config;
  
  // State for event config when using admin route
  const [adminEventConfig, setAdminEventConfig] = useState<any>(null);
  const [adminEventLoading, setAdminEventLoading] = useState(isAdminRoute);
  const [adminEventError, setAdminEventError] = useState<string | null>(null);
  
  // Use hook for legacy route (only when not admin route and no context)
  const { config: hookConfig, loading: hookLoading, error: hookError } = useEventConfig(
    (isAdminRoute || hasContextConfig) ? '' : userSlug, 
    (isAdminRoute || hasContextConfig) ? '' : eventSlug
  );
  
  // Unified config - context takes priority, then admin, then hook
  const config = eventContext?.config || (isAdminRoute ? adminEventConfig : hookConfig);
  const loading = hasContextConfig ? false : (isAdminRoute ? adminEventLoading : hookLoading);
  const error = hasContextConfig ? null : (isAdminRoute ? adminEventError : hookError);

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
  
  // Delete confirmation dialog state
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; album: Album | null }>({
    open: false,
    album: null
  });
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Auth state - check sessionStorage first
  const [pin, setPin] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authorizedPin, setAuthorizedPin] = useState<string | null>(null); // Store the validated PIN
  
  // Check if current user is the event owner (has admin access)
  // Memoize to prevent re-renders
  const currentUser = useMemo(() => getCurrentUser(), []);
  const isEventOwner = useMemo(() => currentUser && config && (
    config.user_id === currentUser.id || 
    config.user_slug === currentUser.slug
  ), [currentUser, config]);
  
  // Payment requests state
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const prevPaymentRequestsCount = useRef(0);
  
  // BigScreen requests state - initialize from localStorage
  const [bigScreenRequests, setBigScreenRequests] = useState<BigScreenRequest[]>(() => {
    try {
      const saved = localStorage.getItem('bigscreen_requests');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Filter out requests older than 30 minutes
        const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
        return parsed.filter((r: BigScreenRequest) => new Date(r.created_at).getTime() > thirtyMinutesAgo);
      }
    } catch (e) { /* ignore */ }
    return [];
  });
  const prevBigScreenRequestsCount = useRef(0);
  
  // Global deduplication ref - defined early so all functions can use it
  const recentlyNotifiedRef = useRef<Set<string>>(new Set());
  const lastNotifiedPaymentCodesRef = useRef<Set<string>>(new Set());
  
  // Polling state - ON by default like LiveEventPage
  const [isPolling, setIsPolling] = useState(true); // Start with polling ON
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false); // Prevent concurrent requests
  const POLLING_INTERVAL = 5000; // 5 seconds (same as LiveEventPage)
  
  // Get effective user/event slugs for URLs
  const effectiveUserSlug = userSlug || config?.user_slug || '';
  const effectiveEventSlug = eventSlug || config?.slug || '';
  
  // Load event config for admin route
  useEffect(() => {
    if (!isAdminRoute || !routeEventId) return;
    
    const loadEventConfig = async () => {
      try {
        setAdminEventLoading(true);
        // Get all user events and find the one matching the ID
        const events = await getUserEvents();
        const eventData = events.find(e => e._id === routeEventId);
        
        if (!eventData) {
          throw new Error('Event not found');
        }
        
        setAdminEventConfig(eventData);
        setAdminEventError(null);
      } catch (err: any) {
        console.error('Failed to load event:', err);
        setAdminEventError(err.message || 'Failed to load event');
      } finally {
        setAdminEventLoading(false);
      }
    };
    
    loadEventConfig();
  }, [isAdminRoute, routeEventId]);

  // Load albums function - use ref to avoid recreating on every render
  const loadAlbumsRef = useRef<() => Promise<void>>();
  
  const loadAlbums = useCallback(async () => {
    // Prevent concurrent requests
    if (isLoadingRef.current || !config?.postgres_event_id) return;
    
    isLoadingRef.current = true;
    
    try {
      let data;
      
      // If user is authenticated (event owner or team member), use regular endpoint
      // Otherwise, use PIN-based endpoint for staff access
      if (currentUser) {
        data = await getEventAlbums(config.postgres_event_id);
      } else if (authorizedPin) {
        data = await getEventAlbumsWithPin(config.postgres_event_id, authorizedPin);
      } else {
        console.warn('⚠️ No auth method available for loading albums');
        setIsLoading(false);
        isLoadingRef.current = false;
        return;
      }
      
      const mappedAlbums: Album[] = data.map((a: any) => ({
        id: a.code,
        visitorName: a.owner_name,
        visitorNumber: 0,
        photoCount: a.photo_count || 0,
        maxPhotos: config.albumTracking?.rules?.maxPhotosPerAlbum || 5,
        isComplete: a.status === 'completed' || a.status === 'paid',
        // Album is paid ONLY if payment_status is 'paid' OR status is explicitly 'paid'
        // 'completed' status means photos are done, NOT that payment is done
        isPaid: a.payment_status === 'paid' || a.status === 'paid',
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
      setIsLoading(false);
    } finally {
      isLoadingRef.current = false;
    }
  }, [config?.postgres_event_id, config?.albumTracking?.rules?.maxPhotosPerAlbum, currentUser, authorizedPin]);
  
  // Keep ref updated with latest loadAlbums function
  loadAlbumsRef.current = loadAlbums;

  // Initial load and auth check
  useEffect(() => {
    if (!config) return;
    
    const eventKey = config._id || config.postgres_event_id || routeEventId;
    const sessionKey = `staff_auth_${eventKey}`;
    
    // Auto-authorize if no PIN set OR if user is the event owner
    if (!config.settings?.staffAccessCode || isEventOwner) {
      setIsAuthorized(true);
      // For owner, we don't need PIN - they use regular auth
    } else {
      // Check if already authorized in this session
      const savedAuth = sessionStorage.getItem(sessionKey);
      if (savedAuth === config.settings.staffAccessCode) {
        setIsAuthorized(true);
        setAuthorizedPin(savedAuth); // Store the PIN for API calls
      }
    }

    console.log('📊 Staff Dashboard - Config loaded:', {
      eventId: config._id,
      postgres_event_id: config.postgres_event_id,
      title: config.title,
      albumTracking: config.albumTracking?.enabled,
      isEventOwner,
      hasCurrentUser: !!currentUser
    });
  }, [config, routeEventId, isEventOwner, currentUser]);

  // Load albums when authorized - only run once when conditions are met
  const hasLoadedInitial = useRef(false);
  useEffect(() => {
    if (!isAuthorized || !config?.postgres_event_id) return;
    if (hasLoadedInitial.current) return; // Only load once
    
    // Need either currentUser (owner) or authorizedPin (staff)
    if (!currentUser && !authorizedPin) {
      console.warn('⚠️ Authorized but no auth method available');
      setIsLoading(false);
      return;
    }
    
    hasLoadedInitial.current = true;
    loadAlbumsRef.current?.();
  }, [isAuthorized, config?.postgres_event_id, currentUser, authorizedPin]);

  // Polling effect - use ref to avoid dependency on loadAlbums
  useEffect(() => {
    if (!isAuthorized || !config?.postgres_event_id || !isPolling) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Start polling using ref to always call latest function
    pollingIntervalRef.current = setInterval(() => {
      loadAlbumsRef.current?.();
    }, POLLING_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isAuthorized, config?.postgres_event_id, isPolling]);

  // Load payment requests (silent - no notifications, just data refresh)
  const loadPaymentRequests = useCallback(async (showNotification = false) => {
    if (!config?.postgres_event_id) return;
    try {
      let requests = await getPaymentRequests(config.postgres_event_id);
      
      // Filter out dismissed requests
      requests = requests.filter(r => !dismissedPaymentRequestsRef.current.has(r.code));
      
      // Find truly new requests (codes we haven't notified about)
      const newRequests = requests.filter(r => !lastNotifiedPaymentCodesRef.current.has(r.code));
      
      // Notify for new requests only if explicitly requested AND we have prior context
      if (showNotification && newRequests.length > 0 && prevPaymentRequestsCount.current > 0) {
        const newestRequest = newRequests[0];
        
        // Deduplicate using recentlyNotifiedRef
        const notificationKey = `pay-${newestRequest.code}`;
        if (!recentlyNotifiedRef.current.has(notificationKey)) {
          recentlyNotifiedRef.current.add(notificationKey);
          setTimeout(() => recentlyNotifiedRef.current.delete(notificationKey), 30000);
          
          // Play notification sound
          try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.3;
            oscillator.start();
            setTimeout(() => { oscillator.frequency.value = 1000; }, 150);
            setTimeout(() => { oscillator.stop(); audioContext.close(); }, 300);
          } catch (e) { /* ignore audio errors */ }
          
          toast.info(`💳 New payment request!`, {
            description: `${newestRequest?.owner_name || newestRequest?.code || 'A visitor'} wants to pay`,
            duration: 10000,
          });
        }
        
        // Mark these as notified
        newRequests.forEach(r => lastNotifiedPaymentCodesRef.current.add(r.code));
      }
      
      // On first load, just track existing codes without notifying
      if (prevPaymentRequestsCount.current === 0) {
        requests.forEach(r => lastNotifiedPaymentCodesRef.current.add(r.code));
      }
      
      prevPaymentRequestsCount.current = requests.length;
      setPaymentRequests(requests);
    } catch (error) {
      console.error('Failed to load payment requests:', error);
    }
  }, [config?.postgres_event_id]);

  // Poll for payment requests every 5 seconds (faster than album polling)
  useEffect(() => {
    if (!isAuthorized || !config?.postgres_event_id) return;
    
    // Initial load (no notification)
    loadPaymentRequests(false);
    
    // Poll every 5 seconds (with notification for new requests)
    const interval = setInterval(() => loadPaymentRequests(true), 5000);
    return () => clearInterval(interval);
  }, [isAuthorized, config?.postgres_event_id, loadPaymentRequests]);

  // Helper function to handle incoming bigscreen request
  const handleBigScreenRequestNotification = useCallback((albumData: { code: string; owner_name?: string; photo_count?: number }) => {
    // Deduplicate: ignore if we already notified for this album in the last 10 seconds
    const notificationKey = `${albumData.code}-${Math.floor(Date.now() / 10000)}`; // 10 second window
    if (recentlyNotifiedRef.current.has(notificationKey)) {
      console.log('📺 Ignoring duplicate bigscreen notification for:', albumData.code);
      return;
    }
    recentlyNotifiedRef.current.add(notificationKey);
    // Clean up old entries after 15 seconds
    setTimeout(() => recentlyNotifiedRef.current.delete(notificationKey), 15000);
    
    console.log('📺 BigScreen request detected!', albumData);
    
    // Play notification sound
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 600;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      oscillator.start();
      setTimeout(() => { oscillator.frequency.value = 800; }, 100);
      setTimeout(() => { oscillator.frequency.value = 1000; }, 200);
      setTimeout(() => { oscillator.stop(); audioContext.close(); }, 350);
    } catch (e) { /* ignore audio errors */ }
    
    toast.info('📺 Big Screen Request!', {
      description: `${albumData.owner_name || albumData.code || 'A visitor'} wants to display photos`,
      duration: 15000,
    });
    
    // Add to requests (avoid duplicates) and persist to localStorage
    setBigScreenRequests(prev => {
      if (prev.some(r => r.code === albumData.code)) return prev;
      const updated = [{
        code: albumData.code,
        owner_name: albumData.owner_name,
        photo_count: albumData.photo_count || 0,
        created_at: new Date().toISOString(),
      }, ...prev];
      localStorage.setItem('bigscreen_requests', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // BroadcastChannel listener for same-origin notifications (works across tabs)
  useEffect(() => {
    if (!isAuthorized) return;

    try {
      const channel = new BroadcastChannel('pictureme_staff_notifications');
      console.log('📡 BroadcastChannel listening for notifications');
      
      channel.onmessage = (event) => {
        console.log('📡 BroadcastChannel message received:', event.data);
        const message = event.data;
        
        if (message.type === 'bigscreen_request' && message.data) {
          handleBigScreenRequestNotification(message.data);
        }
        
        if (message.type === 'payment_request' && message.data) {
          console.log('💳 Payment request via BroadcastChannel:', message.data);
          // Refresh payment requests list with notification enabled
          loadPaymentRequests(true);
        }
      };
      
      return () => {
        channel.close();
      };
    } catch (e) {
      console.log('BroadcastChannel not supported');
    }
  }, [isAuthorized, handleBigScreenRequestNotification, loadPaymentRequests]);

  // WebSocket connection for real-time notifications (cross-device)
  useEffect(() => {
    if (!isAuthorized || !config?.postgres_event_id) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = ENV.API_URL?.replace(/^https?:\/\//, '') || window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}/ws/albums/${config.postgres_event_id}`;
    
    console.log('🔌 WebSocket connecting to:', wsUrl);
    
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    
    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('✅ WebSocket connected successfully');
        };
        
        ws.onmessage = (event) => {
          console.log('📨 WebSocket message received:', event.data);
          try {
            const message = JSON.parse(event.data);
            console.log('📨 Parsed message:', message);
            
            // Handle big screen request
            if (message.type === 'bigscreen_request' && message.data) {
              handleBigScreenRequestNotification(message.data);
            }
            
            // Handle payment request (real-time via WebSocket)
            if (message.type === 'payment_request' && message.data) {
              console.log('💳 Payment request detected!', message.data);
              // Refresh payment requests list with notification
              loadPaymentRequests(true);
            }
          } catch (e) {
            console.error('Failed to parse WebSocket message:', e);
          }
        };
        
        ws.onclose = (event) => {
          console.log('🔌 WebSocket closed:', event.code, event.reason);
          // Reconnect after 5 seconds
          reconnectTimeout = setTimeout(connect, 5000);
        };
        
        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          ws?.close();
        };
      } catch (e) {
        console.error('WebSocket connection error:', e);
      }
    };
    
    connect();
    
    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [isAuthorized, config?.postgres_event_id, loadPaymentRequests, handleBigScreenRequestNotification]);

  // Handle marking album as paid from payment notification
  const handleMarkPaidFromNotification = async (albumCode: string) => {
    try {
      await updateAlbumStatus(albumCode, 'paid');
      toast.success('Album marked as paid!');
      // Remove from notified codes so it won't show again
      lastNotifiedPaymentCodesRef.current.delete(albumCode);
      // Refresh without notification (we already acted on it)
      loadPaymentRequests(false);
      loadAlbums();
    } catch (error) {
      toast.error('Failed to mark as paid');
    }
  };
  
  // Track dismissed payment requests to prevent them from reappearing
  const dismissedPaymentRequestsRef = useRef<Set<string>>(new Set());
  
  // Initialize dismissed requests from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dismissed_payment_requests');
      if (saved) {
        const parsed = JSON.parse(saved);
        dismissedPaymentRequestsRef.current = new Set(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  // Handle dismissing a payment request notification
  // Note: This only hides from UI. The visitor can send a new request if needed.
  // The payment_status stays as 'requested' until staff marks as paid or it expires.
  const handleDismissPaymentRequest = (albumCode: string) => {
    // Add to dismissed set and persist
    dismissedPaymentRequestsRef.current.add(albumCode);
    try {
      localStorage.setItem('dismissed_payment_requests', JSON.stringify([...dismissedPaymentRequestsRef.current]));
    } catch { /* ignore */ }
    
    // Remove from UI
    setPaymentRequests(prev => prev.filter(r => r.code !== albumCode));
    // Keep in notified codes so it won't trigger notification again
    lastNotifiedPaymentCodesRef.current.add(albumCode);
    toast.info('Request dismissed');
  };

  // Handle sending album to big screen from notification
  const handleSendToBigScreenFromNotification = async (albumCode: string, ownerName?: string) => {
    if (!config?.postgres_event_id) return;
    
    try {
      // Find the album to get the real isPaid status
      const albumFromList = albums.find(a => a.id === albumCode);
      const albumIsPaid = albumFromList?.isPaid ?? false;
      
      const success = await broadcastToBigScreen({
        albumCode,
        visitorName: ownerName,
        isPaid: albumIsPaid, // Use real payment status from album
        eventId: config.postgres_event_id,
        userSlug: effectiveUserSlug,
        eventSlug: effectiveEventSlug,
      });
      
      if (success) {
        toast.success(`Album ${albumCode} sent to Big Screen!`);
        // Remove from requests and persist to localStorage
        setBigScreenRequests(prev => {
          const updated = prev.filter(r => r.code !== albumCode);
          localStorage.setItem('bigscreen_requests', JSON.stringify(updated));
          return updated;
        });
      } else {
        toast.error('Failed to send to Big Screen');
      }
    } catch (error) {
      console.error('Failed to send to big screen:', error);
      toast.error('Failed to send to Big Screen');
    }
  };

  // Handle dismissing big screen request
  const handleDismissBigScreenRequest = (albumCode: string) => {
    setBigScreenRequests(prev => {
      const updated = prev.filter(r => r.code !== albumCode);
      localStorage.setItem('bigscreen_requests', JSON.stringify(updated));
      return updated;
    });
  };

  // Manual refresh
  const handleRefresh = () => {
    setIsLoading(true);
    loadAlbums();
    loadPaymentRequests(false); // No notification on manual refresh
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

  const handleMarkPaid = async (albumId: string) => {
    try {
      await updateAlbumStatus(albumId, 'paid');
      toast.success('Album marked as paid');
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
    return `${baseUrl}/${effectiveUserSlug}/${effectiveEventSlug}/album/${albumId}`;
  };

  const handleCopyAlbumUrl = async (albumId: string) => {
    try {
      await navigator.clipboard.writeText(getAlbumUrl(albumId));
      toast.success('Album URL copied to clipboard');
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  // Delete album handler
  const handleDeleteAlbum = async () => {
    if (!deleteConfirm.album) return;
    
    setIsDeleting(true);
    try {
      // Pass the staff PIN if we're using PIN-based auth (not the owner)
      const result = await deleteAlbum(deleteConfirm.album.id, authorizedPin || undefined);
      toast.success(`Album deleted successfully (${result.photosDeleted} photos removed)`);
      setDeleteConfirm({ open: false, album: null });
      loadAlbums(); // Refresh the list
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete album');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle album scan
  const handleAlbumScan = (albumId: string) => {
    setShowScanner(false);
    // Navigate to album or show album details
    const album = albums.find(a => a.id === albumId);
    if (album) {
      toast.success(`Album ${albumId} found - ${album.photoCount} photos`);
      navigate(`/${effectiveUserSlug}/${effectiveEventSlug}/album/${albumId}`);
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
      const handlePinSubmit = () => {
        if (pin === config.settings.staffAccessCode) {
          // Save to sessionStorage
          const eventKey = config._id || config.postgres_event_id || routeEventId;
          sessionStorage.setItem(`staff_auth_${eventKey}`, pin);
          setAuthorizedPin(pin); // Store PIN for API calls
          setIsAuthorized(true);
        } else {
          toast.error("Incorrect PIN");
        }
      };
      
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
                          onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
                          placeholder="Enter PIN"
                          className="bg-zinc-800 border-zinc-700 text-white text-center tracking-widest text-2xl"
                      />
                      <Button 
                          onClick={handlePinSubmit}
                          className="w-full"
                          style={{ backgroundColor: primaryColor }}
                      >
                          Access Dashboard
                      </Button>
                      {/* Only show Back to Admin for event owners */}
                      {isEventOwner && (
                        <Button 
                          variant="ghost"
                          onClick={() => navigate('/admin')}
                          className="w-full text-zinc-400 hover:text-white hover:bg-zinc-800"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Back to Admin
                        </Button>
                      )}
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
              onClick={() => isAdminRoute ? navigate('/admin') : navigate(-1)}
              className="text-zinc-400 hover:text-white"
              title={isAdminRoute ? 'Back to Admin Dashboard' : 'Go Back'}
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
            {/* Only show Admin Area button to the event owner */}
            {isEventOwner && (
              <Button
                size="sm"
                onClick={() => navigate('/admin')}
                className="ml-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700"
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Admin Area
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Payment Requests Bell */}
            {paymentRequests.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    className="relative bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 animate-pulse"
                  >
                    <Bell className="w-4 h-4" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-black text-xs font-bold rounded-full flex items-center justify-center">
                      {paymentRequests.length}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 bg-zinc-900 border-white/10">
                  <div className="px-3 py-2 border-b border-white/10">
                    <p className="font-semibold text-amber-400 flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      Payment Requests
                    </p>
                    <p className="text-xs text-zinc-500">Visitors waiting to pay</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {paymentRequests.map((req) => (
                      <div 
                        key={req.code}
                        className="px-3 py-2 hover:bg-white/5 flex items-center justify-between gap-2"
                      >
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => navigate(`/${effectiveUserSlug}/${effectiveEventSlug}/album/${req.code}`)}
                        >
                          <p className="font-mono text-sm text-white hover:text-cyan-400 transition-colors">{req.code}</p>
                          <p className="text-xs text-zinc-400">
                            {req.owner_name || 'Anonymous'} • {req.photo_count} photos
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDismissPaymentRequest(req.code)}
                            className="text-zinc-400 hover:text-red-400 text-xs px-2"
                            title="Dismiss"
                          >
                            <XCircle className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/${effectiveUserSlug}/${effectiveEventSlug}/album/${req.code}`)}
                            className="text-zinc-400 hover:text-white text-xs px-2"
                            title="View Album"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleMarkPaidFromNotification(req.code)}
                            className="bg-green-600 hover:bg-green-500 text-white text-xs"
                          >
                            <DollarSign className="w-3 h-3 mr-1" />
                            Paid
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {/* BigScreen Requests */}
            {bigScreenRequests.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    className="relative bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 animate-pulse"
                  >
                    <MonitorUp className="w-4 h-4" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-cyan-500 text-black text-xs font-bold rounded-full flex items-center justify-center">
                      {bigScreenRequests.length}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 bg-zinc-900 border-white/10">
                  <div className="px-3 py-2 border-b border-white/10">
                    <p className="font-semibold text-cyan-400 flex items-center gap-2">
                      <MonitorUp className="w-4 h-4" />
                      Big Screen Requests
                    </p>
                    <p className="text-xs text-zinc-500">Visitors want to display photos</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {bigScreenRequests.map((req) => (
                      <div 
                        key={req.code}
                        className="px-3 py-2 hover:bg-white/5 flex items-center justify-between gap-2"
                      >
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => navigate(`/${effectiveUserSlug}/${effectiveEventSlug}/album/${req.code}`)}
                        >
                          <p className="font-mono text-sm text-white hover:text-cyan-400 transition-colors">{req.code}</p>
                          <p className="text-xs text-zinc-400">
                            {req.owner_name || 'Anonymous'} • {req.photo_count} photos
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDismissBigScreenRequest(req.code)}
                            className="text-zinc-400 hover:text-red-400 text-xs px-2"
                            title="Dismiss"
                          >
                            <XCircle className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSendToBigScreenFromNotification(req.code, req.owner_name)}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs"
                          >
                            <MonitorPlay className="w-3 h-3 mr-1" />
                            Show
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {/* Polling indicator */}
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <div className={`w-2 h-2 rounded-full ${isPolling ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`} />
              {lastRefresh && (
                <span>Updated {lastRefresh.toLocaleTimeString()}</span>
              )}
            </div>
            <Button
              size="sm"
              onClick={() => setIsPolling(!isPolling)}
              className={`bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 ${isPolling ? 'text-green-400 hover:text-green-300' : 'text-zinc-400 hover:text-white'}`}
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
              size="icon"
              onClick={handleRefresh}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700"
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
            <TabsTrigger 
              value="overview" 
              className="text-zinc-400 data-[state=active]:bg-white/10 data-[state=active]:text-white"
            >
              Albums
            </TabsTrigger>
            <TabsTrigger 
              value="tools" 
              className="text-zinc-400 data-[state=active]:bg-white/10 data-[state=active]:text-white"
            >
              Tools
            </TabsTrigger>
            <TabsTrigger 
              value="stations" 
              className="text-zinc-400 data-[state=active]:bg-white/10 data-[state=active]:text-white"
            >
              Stations
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="text-zinc-400 data-[state=active]:bg-white/10 data-[state=active]:text-white"
            >
              Analytics
            </TabsTrigger>
            <TabsTrigger 
              value="display" 
              className="text-zinc-400 data-[state=active]:bg-white/10 data-[state=active]:text-white"
            >
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
              <Button className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700">
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
                  onClick={() => navigate(`/${effectiveUserSlug}/${effectiveEventSlug}/album/${album.id}`)}
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
                              navigate(`/${effectiveUserSlug}/${effectiveEventSlug}/album/${album.id}`);
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
                          {!album.isPaid && (
                            <DropdownMenuItem 
                              className="text-green-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkPaid(album.id);
                              }}
                            >
                              <DollarSign className="w-4 h-4 mr-2" />
                              Mark Paid
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
                          <DropdownMenuItem 
                            className="text-red-400 focus:text-red-300 focus:bg-red-500/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm({ open: true, album });
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Album
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
              postgresEventId={config.postgres_event_id}
              eventName={config.title}
              userSlug={effectiveUserSlug}
              eventSlug={effectiveEventSlug}
              stats={stats}
              primaryColor={primaryColor}
              eventLogoUrl={config.branding?.logoPath}
              onRefresh={handleRefresh}
            />
          </TabsContent>

          {/* Stations Tab */}
          <TabsContent value="stations">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Registration Station */}
              <Card className="bg-zinc-900/50 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-400" />
                    Registration
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    Where visitors register and get their album
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                    <p className="text-xs text-zinc-500 mb-1 font-mono break-all">
                      {config?.postgres_event_id 
                        ? `${window.location.origin}/e/${config.postgres_event_id}/${effectiveEventSlug}/registration`
                        : `${window.location.origin}/${effectiveUserSlug}/${effectiveEventSlug}/registration`
                      }
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white"
                      onClick={() => {
                        const url = config?.postgres_event_id 
                          ? `${window.location.origin}/e/${config.postgres_event_id}/${effectiveEventSlug}/registration`
                          : `${window.location.origin}/${effectiveUserSlug}/${effectiveEventSlug}/registration`;
                        navigator.clipboard.writeText(url);
                        toast.success('URL copied!');
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-purple-600 hover:bg-purple-500 text-white"
                      onClick={() => {
                        const url = config?.postgres_event_id 
                          ? `${window.location.origin}/e/${config.postgres_event_id}/${effectiveEventSlug}/registration`
                          : `${window.location.origin}/${effectiveUserSlug}/${effectiveEventSlug}/registration`;
                        window.open(url, '_blank');
                      }}
                    >
                      Open
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Photo Booth Station */}
              <Card className="bg-zinc-900/50 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Camera className="w-5 h-5 text-cyan-400" />
                    Photo Booth
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    Where visitors take their photos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                    <p className="text-xs text-zinc-500 mb-1 font-mono break-all">
                      {config?.postgres_event_id 
                        ? `${window.location.origin}/e/${config.postgres_event_id}/${effectiveEventSlug}/booth`
                        : `${window.location.origin}/${effectiveUserSlug}/${effectiveEventSlug}/booth`
                      }
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white"
                      onClick={() => {
                        const url = config?.postgres_event_id 
                          ? `${window.location.origin}/e/${config.postgres_event_id}/${effectiveEventSlug}/booth`
                          : `${window.location.origin}/${effectiveUserSlug}/${effectiveEventSlug}/booth`;
                        navigator.clipboard.writeText(url);
                        toast.success('URL copied!');
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white"
                      onClick={() => {
                        const url = config?.postgres_event_id 
                          ? `${window.location.origin}/e/${config.postgres_event_id}/${effectiveEventSlug}/booth`
                          : `${window.location.origin}/${effectiveUserSlug}/${effectiveEventSlug}/booth`;
                        window.open(url, '_blank');
                      }}
                    >
                      Open
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Viewer/Gallery Station */}
              <Card className="bg-zinc-900/50 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Eye className="w-5 h-5 text-emerald-400" />
                    Viewer / Gallery
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    Where visitors view and share their albums
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                    <p className="text-xs text-zinc-500 mb-1 font-mono break-all">
                      {config?.postgres_event_id 
                        ? `${window.location.origin}/e/${config.postgres_event_id}/${effectiveEventSlug}/viewer`
                        : `${window.location.origin}/${effectiveUserSlug}/${effectiveEventSlug}/viewer`
                      }
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white"
                      onClick={() => {
                        const url = config?.postgres_event_id 
                          ? `${window.location.origin}/e/${config.postgres_event_id}/${effectiveEventSlug}/viewer`
                          : `${window.location.origin}/${effectiveUserSlug}/${effectiveEventSlug}/viewer`;
                        navigator.clipboard.writeText(url);
                        toast.success('URL copied!');
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
                      onClick={() => {
                        const url = config?.postgres_event_id 
                          ? `${window.location.origin}/e/${config.postgres_event_id}/${effectiveEventSlug}/viewer`
                          : `${window.location.origin}/${effectiveUserSlug}/${effectiveEventSlug}/viewer`;
                        window.open(url, '_blank');
                      }}
                    >
                      Open
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Event Feed */}
              <Card className="bg-zinc-900/50 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-pink-400" />
                    Event Feed
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    Live feed of all event photos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                    <p className="text-xs text-zinc-500 mb-1 font-mono break-all">
                      {config?.postgres_event_id 
                        ? `${window.location.origin}/e/${config.postgres_event_id}/${effectiveEventSlug}/feed`
                        : `${window.location.origin}/${effectiveUserSlug}/${effectiveEventSlug}/feed`
                      }
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white"
                      onClick={() => {
                        const url = config?.postgres_event_id 
                          ? `${window.location.origin}/e/${config.postgres_event_id}/${effectiveEventSlug}/feed`
                          : `${window.location.origin}/${effectiveUserSlug}/${effectiveEventSlug}/feed`;
                        navigator.clipboard.writeText(url);
                        toast.success('URL copied!');
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-pink-600 hover:bg-pink-500 text-white"
                      onClick={() => {
                        const url = config?.postgres_event_id 
                          ? `${window.location.origin}/e/${config.postgres_event_id}/${effectiveEventSlug}/feed`
                          : `${window.location.origin}/${effectiveUserSlug}/${effectiveEventSlug}/feed`;
                        window.open(url, '_blank');
                      }}
                    >
                      Open
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Staff Dashboard */}
              <Card className="bg-zinc-900/50 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <LayoutDashboard className="w-5 h-5 text-[#D1F349]" />
                    Staff Dashboard
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    This dashboard (current page)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                    <p className="text-xs text-zinc-500 mb-1 font-mono break-all">
                      {config?.postgres_event_id 
                        ? `${window.location.origin}/e/${config.postgres_event_id}/${effectiveEventSlug}/staff`
                        : `${window.location.origin}/${effectiveUserSlug}/${effectiveEventSlug}/staff`
                      }
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white"
                      onClick={() => {
                        const url = config?.postgres_event_id 
                          ? `${window.location.origin}/e/${config.postgres_event_id}/${effectiveEventSlug}/staff`
                          : `${window.location.origin}/${effectiveUserSlug}/${effectiveEventSlug}/staff`;
                        navigator.clipboard.writeText(url);
                        toast.success('URL copied!');
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-[#D1F349] hover:bg-[#c5e73d] text-black"
                      onClick={() => {
                        const url = config?.postgres_event_id 
                          ? `${window.location.origin}/e/${config.postgres_event_id}/${effectiveEventSlug}/staff`
                          : `${window.location.origin}/${effectiveUserSlug}/${effectiveEventSlug}/staff`;
                        window.open(url, '_blank');
                      }}
                    >
                      Open
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
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
                        className="h-auto py-4 flex-col gap-2 bg-zinc-900/50 border-white/10 hover:bg-cyan-500/20 hover:border-cyan-500/30 text-zinc-300 hover:text-white"
                        onClick={() => {
                          // Build URL - prefer short URL format if we have postgres_event_id
                          let displayUrl: string;
                          if (config?.postgres_event_id && effectiveEventSlug) {
                            displayUrl = `${window.location.origin}/e/${config.postgres_event_id}/${effectiveEventSlug}/bigscreen`;
                          } else if (effectiveUserSlug && effectiveEventSlug) {
                            displayUrl = `${window.location.origin}/${effectiveUserSlug}/${effectiveEventSlug}/bigscreen`;
                          } else {
                            toast.error('Unable to open Big Screen - missing event info');
                            return;
                          }
                          window.open(displayUrl, 'bigscreen', 'width=1920,height=1080');
                          toast.success('Big Screen window opened! Move it to your display.');
                        }}
                      >
                        <MonitorPlay className="w-6 h-6 text-cyan-400" />
                        <span>Open Big Screen</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex-col gap-2 bg-zinc-900/50 border-white/10 hover:bg-purple-500/20 hover:border-purple-500/30 text-zinc-300 hover:text-white"
                        onClick={() => {
                          const registrationUrl = `${window.location.origin}/${effectiveUserSlug}/${effectiveEventSlug}/registration`;
                          navigator.clipboard.writeText(registrationUrl);
                          toast.success('Registration URL copied!');
                        }}
                      >
                        <QrCode className="w-6 h-6 text-purple-400" />
                        <span>Copy Registration URL</span>
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
                          id="bigscreen-album-input"
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              const input = e.target as HTMLInputElement;
                              if (input.value && config?.postgres_event_id) {
                                // Find the album to get isPaid status
                                const albumData = albums.find(a => a.id === input.value);
                                const success = await broadcastToBigScreen({
                                  albumCode: input.value,
                                  visitorName: albumData?.visitorName,
                                  isPaid: albumData?.isPaid || false,
                                  eventId: config.postgres_event_id,
                                  userSlug: effectiveUserSlug,
                                  eventSlug: effectiveEventSlug,
                                });
                                if (success) {
                                  toast.success(`Album ${input.value} sent to Big Screen!`);
                                  input.value = '';
                                } else {
                                  toast.error('Failed to send to Big Screen');
                                }
                              }
                            }
                          }}
                        />
                        <Button
                          className="bg-cyan-600 hover:bg-cyan-500 text-white"
                          onClick={async () => {
                            const input = document.getElementById('bigscreen-album-input') as HTMLInputElement;
                            if (input?.value && config?.postgres_event_id) {
                              // Find the album to get isPaid status
                              const albumData = albums.find(a => a.id === input.value);
                              const success = await broadcastToBigScreen({
                                albumCode: input.value,
                                visitorName: albumData?.visitorName,
                                isPaid: albumData?.isPaid || false,
                                eventId: config.postgres_event_id,
                                userSlug: effectiveUserSlug,
                                eventSlug: effectiveEventSlug,
                              });
                              if (success) {
                                toast.success(`Album ${input.value} sent to Big Screen!`);
                                input.value = '';
                              } else {
                                toast.error('Failed to send to Big Screen');
                              }
                            } else if (!input?.value) {
                              toast.error('Please enter an album code');
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({ open, album: open ? deleteConfirm.album : null })}>
        <AlertDialogContent className="bg-zinc-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              Delete Album?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {deleteConfirm.album && (
                <>
                  Are you sure you want to delete album <span className="font-mono text-cyan-400">{deleteConfirm.album.id}</span>
                  {deleteConfirm.album.visitorName && (
                    <> belonging to <span className="text-white font-medium">{deleteConfirm.album.visitorName}</span></>
                  )}
                  ?
                  <br /><br />
                  <span className="text-red-400 font-medium">
                    This will permanently delete {deleteConfirm.album.photoCount} photo{deleteConfirm.album.photoCount !== 1 ? 's' : ''} and cannot be undone.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-zinc-800 border-white/10 text-zinc-300 hover:bg-zinc-700 hover:text-white"
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAlbum}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Album
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

