import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import BoothDashboard from "./BoothDashboard";
import {
    LayoutTemplate,
    ArrowLeft,
    Camera,
    Sparkles,
    Upload,
    Clock,
    Ratio,
    BoxSelect,
    Pencil,
    X,
    Store,
    Search,
    LayoutGrid,
    List as ListIcon,
    Filter,
    MoreHorizontal,
    Loader2,
    Library,
    Globe,
    Plus,
    Zap,
    Image as ImageIcon,
    ChevronRight,
    ChevronLeft,
    Settings,
    Wand2,
    Coins,
    Copy,
    RefreshCw,
    Save,
    Download,
    ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { getCurrentUser, getCurrentUserProfile, User, getUserBooths, EventConfig, Template } from "@/services/eventsApi";
import { updateCreationAdultStatus, updatePhotoAdultStatus } from "@/services/api/business";
import { getMarketplaceTemplates } from "@/services/marketplaceApi";

import { processImageWithAI, AspectRatio, AI_MODELS, resolveModelId, normalizeModelId } from "@/services/aiProcessor";
import { processCreatorImage } from "@/services/creatorAiProcessor";
import { ENV } from "@/config/env";
import { SaveTemplateModal } from "@/components/templates/SaveTemplateModal";
import { useMyTemplates, UserTemplate } from "@/hooks/useMyTemplates";
import { ScrollArea } from "@/components/ui/scroll-area";
// CDN service for public content (Cloudflare Image Resizing)
import { getThumbnailUrl, getDownloadUrl, getProcessingUrl, getProxyDownloadUrl } from "@/services/cdn";
import { cn } from "@/lib/utils";
import { CreatorStudioSidebar, SidebarMode } from "@/components/creator/CreatorStudioSidebar";
import { TemplateLibrary, MarketplaceTemplate } from "@/components/creator/TemplateLibrary";
import { CreatorBottomNav } from "@/components/creator/CreatorBottomNav";
import { CreationDetailView, GalleryItem } from "@/components/creator/CreationDetailView";
import { useUserTier } from "@/services/userTier";

// Modular Components
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { AppRail, MainView } from "@/components/creator/studio/AppRail";
import { TemplatesView } from "@/components/creator/studio/TemplatesView";
import { TimelineView } from "@/components/creator/studio/TimelineView";
import { GalleryView } from "@/components/creator/studio/GalleryView";
import { MobileFloatingRail } from "@/components/creator/studio/MobileFloatingRail";

// --- Categories for browsing ---
const CATEGORIES = ["All", "Fantasy", "Portrait", "Cinematic", "Product", "UGC"];

// Helper for persisting template metadata (supports saving by ID or URL)
const saveTemplateMeta = (key: string, template: any) => {
    if (!key) return;
    try {
        localStorage.setItem(`tpl_meta_${key}`, JSON.stringify({
            id: template.id,
            name: template.name,
            image: template.images?.[0] || template.image
        }));
    } catch (e) { }
};

const getTemplateMeta = (keys: string[]) => {
    for (const key of keys) {
        if (!key) continue;
        const saved = localStorage.getItem(`tpl_meta_${key}`);
        if (saved) return JSON.parse(saved);
    }
    return null;
};

// GalleryItem moved to CreationDetailView.tsx for shared use

// Local models definitions removed to use shared constants from aiProcessor.ts
import { LOCAL_IMAGE_MODELS, LOCAL_VIDEO_MODELS } from "@/services/aiProcessor";

// Error Boundary Component

interface CreatorStudioPageProps {
    defaultView?: MainView;
}

function CreatorStudioPageContent({ defaultView }: CreatorStudioPageProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    // Initial user from local storage
    const initialUser = getCurrentUser();
    const [currentUser, setCurrentUser] = useState<User | null>(initialUser);
    const { tier: userTier } = useUserTier();

    const { templates: myTemplates, saveTemplate } = useMyTemplates();

    // Fetch fresh user profile on mount to get latest tier
    useEffect(() => {
        const fetchProfile = async () => {
            const freshUser = await getCurrentUserProfile();
            if (freshUser) {
                setCurrentUser(freshUser);
            }
        };
        fetchProfile();
    }, []);

    // View State - initialize from query param, then state, then default (Fallback to "create")
    const [activeView, setActiveView] = useState<MainView>(() => {
        const viewParam = searchParams.get("view") as MainView;
        const validViews: MainView[] = ["create", "templates", "booths", "gallery"];

        if (defaultView) return defaultView;
        if (viewParam && validViews.includes(viewParam)) return viewParam;

        const locationView = (location.state as any)?.view;
        if (locationView && validViews.includes(locationView)) return locationView;

        return "create";
    });

    // View Synchronization Ref - prevents infinite loops between state and URL
    const isInternalTransition = useRef(false);

    // Create Mode State
    const [mode, setMode] = useState<SidebarMode>(() => {
        const modeParam = searchParams.get("mode") as SidebarMode;
        const validModes: SidebarMode[] = ["image", "video", "booth"];
        if (modeParam && validModes.includes(modeParam)) return modeParam;
        return "image";
    });

    const [prompt, setPrompt] = useState(() => localStorage.getItem("creator_studio_prompt") || "");
    const [model, setModel] = useState("nano-banana");
    const [aspectRatio, setAspectRatio] = useState("auto");
    const [duration, setDuration] = useState("5s");
    const [audioOn, setAudioOn] = useState(false);
    const [resolution, setResolution] = useState("720p");
    const [numImages, setNumImages] = useState(1);

    // Save prompt to localStorage
    useEffect(() => {
        localStorage.setItem("creator_studio_prompt", prompt);
    }, [prompt]);

    // Effect 1: Sync URL param -> State
    useEffect(() => {
        const viewParam = searchParams.get("view") as MainView;
        const modeParam = searchParams.get("mode") as SidebarMode;
        const validViews: MainView[] = ["create", "templates", "booths", "gallery"];
        const validModes: SidebarMode[] = ["image", "video", "booth"];

        if (viewParam && validViews.includes(viewParam)) {
            if (viewParam !== activeView) {
                isInternalTransition.current = true;
                setActiveView(viewParam);
            }
        } else if (defaultView && activeView !== defaultView) {
            isInternalTransition.current = true;
            setActiveView(defaultView);
        }

        if (modeParam && validModes.includes(modeParam)) {
            if (modeParam !== mode) {
                isInternalTransition.current = true;
                setMode(modeParam);
            }
        }
    }, [searchParams, defaultView]);

    // Effect 2: Sync State -> URL param
    useEffect(() => {
        if (isInternalTransition.current) {
            isInternalTransition.current = false;
            return;
        }

        const currentViewParam = searchParams.get("view");
        const currentModeParam = searchParams.get("mode");

        if ((activeView && currentViewParam !== activeView) || (mode && currentModeParam !== mode)) {
            setSearchParams(prev => {
                const next = new URLSearchParams(prev);
                if (activeView) next.set("view", activeView);
                if (activeView === 'create') {
                    next.set("mode", mode);
                } else {
                    next.delete("mode");
                }
                return next;
            }, { replace: true });
        }
    }, [activeView, mode, searchParams, setSearchParams]);

    // Effect 3: Handle External Transitions (defaultView Prop or Location State)
    useEffect(() => {
        if (defaultView) {
            setActiveView(prev => (prev !== defaultView ? defaultView : prev));
        }
    }, [defaultView]);

    useEffect(() => {
        const stateView = (location.state as any)?.view;
        if (stateView && stateView !== activeView) {
            setActiveView(stateView);
        }
    }, [location.state, activeView]);
    const [availableModels, setAvailableModels] = useState<any[]>([]);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch(`${ENV.API_URL}/api/config`);
                const data = await res.json();
                if (data.supported_models) {
                    setAvailableModels(data.supported_models);
                }
            } catch (e) {
                console.error("Failed to load config", e);
            }
        };
        fetchConfig();
    }, []);

    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("All");

    // Privacy & Tier State
    const isFreeTier = useMemo(() => {
        if (!currentUser) return true;
        // Super admins can always toggle visibility
        if (currentUser.role === 'super_admin') return false;

        // Check 1: Explicit subscription status (safest indicator)
        if (currentUser.subscription_status === 'active' || currentUser.subscription_status === 'trialing') {
            return false;
        }

        // Check 2: Explicit Plan Names/Tiers
        const tier = currentUser.subscription_tier?.toLowerCase();
        const planName = currentUser.plan_name?.toLowerCase();
        const role = currentUser.role?.toLowerCase();

        // Check for Paid Individual Plans (Spark, Vibe, Studio)
        if (tier === 'spark' || planName === 'spark') return false;
        if (tier === 'vibe' || planName === 'vibe') return false;
        if (tier === 'studio' || planName === 'studio') return false;

        // Check for Business Plans
        if (role?.startsWith('business_') || tier?.startsWith('business_')) return false;

        // Check 3: Token Quota (Signal for paid plans if status/tier checks fail)
        // Free tier typically has 0 or minimal daily tokens. Spark has 50 monthly.
        if ((currentUser.tokens_total || 0) >= 40) return false;

        // Default to free
        return true;
    }, [currentUser]);

    const isSuperAdmin = currentUser?.role === 'super_admin';

    const maxImages = useMemo(() => {
        switch (userTier) {
            case 'business':
            case 'studio':
                return 4;
            case 'vibe':
                return 2;
            default:
                return 1;
        }
    }, [userTier]);

    // Default visibility: Free tier = public (forced), Paid tier = private (can toggle)
    const [isPublic, setIsPublic] = useState(false);

    // Set initial visibility based on tier (once we know)
    useEffect(() => {
        if (isFreeTier) {
            setIsPublic(true); // Free tier is forced public
        } else {
            setIsPublic(false); // Paid tier defaults to private
        }
    }, [isFreeTier]);




    // Templates
    const [selectedTemplate, setSelectedTemplate] = useState<MarketplaceTemplate | null>(null);
    const [templateTab, setTemplateTab] = useState<"library" | "marketplace">("marketplace");
    const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);

    // Templates Data State
    const [marketplaceTemplates, setMarketplaceTemplates] = useState<MarketplaceTemplate[]>([]);
    const [myLibraryTemplates, setMyLibraryTemplates] = useState<MarketplaceTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);

    // Input Media
    const [inputImage, setInputImage] = useState<string | null>(null);
    const [ghostPreviewUrl, setGhostPreviewUrl] = useState<string | null>(null);
    const [inputImages, setInputImages] = useState<string[]>([]); // Multiple images for booth
    const [endFrameImage, setEndFrameImage] = useState<string | null>(null);
    const [referenceImages, setReferenceImages] = useState<string[]>([]);
    const [activeInputType, setActiveInputType] = useState<"main" | "end" | "ref" | "subject">("main");
    const [remixFrom, setRemixFrom] = useState<number | null>(null);
    const [remixFromUsername, setRemixFromUsername] = useState<string | null>(null);

    // Sync inputImage to ghostPreviewUrl for template selector persistence
    useEffect(() => {
        if (inputImage) {
            setGhostPreviewUrl(inputImage);
        }
    }, [inputImage]);

    // Booth State
    const [userBooths, setUserBooths] = useState<EventConfig[]>([]);
    const [selectedBooth, setSelectedBooth] = useState<EventConfig | null>(null);
    const [selectedBoothTemplate, setSelectedBoothTemplate] = useState<Template | null>(null);

    useEffect(() => {
        if (mode === 'booth') {
            if (userBooths.length === 0) {
                getUserBooths().then(booths => {
                    setUserBooths(booths);
                });
            }
        } else {
            // Reset booth selection when leaving booth mode to ensure a fresh start next time
            setSelectedBooth(null);
            setSelectedBoothTemplate(null);
        }
    }, [mode]);

    // Unified Remix State Handler
    useEffect(() => {
        const state = location.state as any;
        if (!state) return;

        console.log("[CreatorStudioPage] Consuming remix state:", state);

        if (state.prompt) setPrompt(state.prompt);
        if (state.mode) setMode(state.mode);
        if (state.model) setModel(normalizeModelId(state.model));

        // If we have a source image, handle specialized routing
        if (state.sourceImageUrl) {
            const remixMode = state.remixMode;
            if (remixMode === 'last-frame') {
                setEndFrameImage(state.sourceImageUrl);
                setMode('video');
                setModel('veo-3.1-frames');
            } else {
                setInputImage(state.sourceImageUrl);
                if (remixMode === 'first-frame') {
                    setMode('video');
                    setModel('veo-3.1-frames');
                    setEndFrameImage(null);
                }
            }
        }

        // Attribution
        if (state.remixFrom) {
            const pid = typeof state.remixFrom === 'string' ? parseInt(state.remixFrom, 10) : state.remixFrom;
            if (!isNaN(pid)) setRemixFrom(pid);
        }
        if (state.remixFromUsername) setRemixFromUsername(state.remixFromUsername);

        // If we have a full template object, use it immediately
        if (state.selectedTemplate) {
            applyTemplate(state.selectedTemplate);
        }
        // Otherwise, if we only have an ID, we'll need to resolve it once templates load
        else if (state.templateId) {
            console.log("[CreatorStudioPage] Pending template resolution for ID:", state.templateId);
            // Trigger loading if not already
            setShowTemplateLibrary(true);
        }

        // Set view mode if provided
        if (state.view) {
            setActiveView(state.view);
        }

        // Clear state to avoid re-triggering on refresh
        window.history.replaceState({}, document.title);
    }, [location.state]);

    // Template Resolution Effect (for templateId from feed or marketplace)
    useEffect(() => {
        const pendingTemplateId = (location.state as any)?.templateId || (location.state as any)?.selectedTemplateId;
        if (pendingTemplateId && !selectedTemplate) {
            const fetchAndApply = async () => {
                try {
                    // Always fetch from specific endpoint to get fresh ownership and full prompt
                    const response = await fetch(`${ENV.API_URL}/api/marketplace/templates/${pendingTemplateId}`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` }
                    });
                    if (response.ok) {
                        const fullTemplate = await response.json();
                        console.log("[CreatorStudioPage] Resolved template from API:", pendingTemplateId);
                        applyTemplate(fullTemplate);
                    } else if (marketplaceTemplates.length > 0) {
                        // Fallback to local list if fetch fails
                        const found = marketplaceTemplates.find(t => t.id === pendingTemplateId || (t as any).template_id === pendingTemplateId);
                        if (found) {
                            console.log("[CreatorStudioPage] Resolved template from local list:", pendingTemplateId);
                            applyTemplate(found);
                        }
                    }
                } catch (e) {
                    console.error("Error resolving template:", e);
                }
            };
            fetchAndApply();
        }
    }, [marketplaceTemplates, location.state, selectedTemplate]);

    // Processing
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState("Preparing...");

    // History
    const [history, setHistory] = useState<GalleryItem[]>([]);
    const [previewItem, setPreviewItem] = useState<GalleryItem | null>(null);
    const [showSaveTemplate, setShowSaveTemplate] = useState(false);
    const [templatePreviewImage, setTemplatePreviewImage] = useState<string | undefined>(undefined);
    const [isPromptExpanded, setIsPromptExpanded] = useState(false);

    // Mobile Floating Rail State
    const [isMobileRailOpen, setIsMobileRailOpen] = useState(false);
    const [showIdleHint, setShowIdleHint] = useState(false);
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);

    // Idle Detection for Mobile Hint
    useEffect(() => {
        const resetIdleTimer = () => {
            setShowIdleHint(false);
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            idleTimerRef.current = setTimeout(() => {
                if (!isMobileRailOpen && window.innerWidth < 768) {
                    setShowIdleHint(true);
                }
            }, 10000); // 10 seconds of idle
        };

        const events = ['touchstart', 'touchmove', 'mousedown', 'scroll', 'keydown'];
        events.forEach(e => window.addEventListener(e, resetIdleTimer));

        resetIdleTimer(); // Initial start

        return () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            events.forEach(e => window.removeEventListener(e, resetIdleTimer));
        };
    }, [isMobileRailOpen]);

    // Swipe Gesture Handlers
    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            touchStartX.current = e.touches[0].clientX;
            touchStartY.current = e.touches[0].clientY;
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (touchStartX.current === null || touchStartY.current === null) return;

            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;

            const diffX = touchStartX.current - currentX;
            const diffY = Math.abs(touchStartY.current - currentY);

            // Detect swipe to left (diffX > 0)
            // Ensure swipe is horizontal (diffX > diffY)
            // Ensure swipe starts from near the right edge (touchStartX > window.innerWidth * 0.8)
            if (diffX > 50 && diffX > diffY && touchStartX.current > window.innerWidth * 0.7) {
                setIsMobileRailOpen(true);
                touchStartX.current = null;
                touchStartY.current = null;
            }
        };

        window.addEventListener('touchstart', handleTouchStart);
        window.addEventListener('touchmove', handleTouchMove);

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
        };
    }, []);

    const formatModelName = (modelId: string) => {
        const allModels = [...LOCAL_IMAGE_MODELS, ...LOCAL_VIDEO_MODELS];
        const found = allModels.find(m => m.id === modelId);
        if (found) return found.name;
        // Fallback cleanup
        if (modelId.includes('/')) {
            const parts = modelId.split('/');
            return parts[parts.length - 1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
        return modelId;
    };

    // Load templates logic
    useEffect(() => {
        if (showTemplateLibrary && marketplaceTemplates.length === 0) {
            const fetchT = async () => {
                setLoadingTemplates(true);
                try {
                    // Use the service to get templates
                    const templates = await getMarketplaceTemplates({ limit: 50 });
                    // Ensure robust handling if the API returns something nested or different, though TS says it returns MediaTemplate[]
                    console.log("[CreatorStudioPage] Fetched templates:", templates);

                    // Transform if necessary (e.g. if images are in preview_images)
                    // The service response type should match MarketplaceTemplate, but let's be safe
                    const safeTemplates = templates.map((t: any) => ({
                        ...t,
                        // Ensure images array is populated from available sources in order of preference
                        images: t.images || t.preview_images || t.backgrounds || [],
                        // If preview_url is set, make sure it is the first image
                        preview_images: t.preview_url ? [t.preview_url, ...(t.preview_images || [])] : (t.preview_images || []),
                        type: t.type || t.template_type || 'image'
                    }));

                    setMarketplaceTemplates(safeTemplates);

                    // Also fetch my library if user is logged in
                    const token = localStorage.getItem("auth_token");
                    if (token) {
                        const lRes = await fetch(`${ENV.API_URL}/api/marketplace/my-library`, { headers: { Authorization: `Bearer ${token}` } });
                        if (lRes.ok) setMyLibraryTemplates(await lRes.json());
                    }
                } catch (e) { console.error("Error fetching templates:", e); } finally { setLoadingTemplates(false); }
            };
            fetchT();
        }
    }, [showTemplateLibrary]);



    // Load history logic
    const loadHistory = useCallback(async () => {
        if (!currentUser?.id) return;
        const token = localStorage.getItem("auth_token");
        if (!token) return;
        try {
            const cb = Date.now();
            console.log("📥 [Studio] Loading history for user:", currentUser.id);
            const completedRes = await fetch(`${ENV.API_URL}/api/creations?cb=${cb}`, { headers: { "Authorization": `Bearer ${token}` } });
            let allItems: GalleryItem[] = [];

            if (completedRes.ok) {
                const data = await completedRes.json();
                console.log(`📥 [Studio] Fetched ${data.creations?.length || 0} completed items`);
                if (data.creations && Array.isArray(data.creations)) {
                    allItems = data.creations.map((c: any) => {
                        const realId = c.id.toString();
                        const ts = new Date(c.created_at).getTime();
                        const isVideo = c.type === 'video';
                        // For videos: only use thumbnail_url if available (don't fallback to video URL)
                        // For images: use thumbnail_url or URL
                        const previewSource = isVideo ? c.thumbnail_url : (c.thumbnail_url || c.url);
                        return {
                            id: realId,
                            url: c.url,
                            previewUrl: previewSource,
                            thumbnail_url: c.thumbnail_url, // Pass through for getMediaPreviewUrl
                            type: c.type || 'image',
                            timestamp: isNaN(ts) ? Date.now() : ts,
                            prompt: c.prompt,
                            model: c.model_id || c.model,
                            ratio: c.aspect_ratio,
                            isPublic: c.is_published || c.visibility === 'public',
                            isAdult: c.is_adult,
                            status: 'completed',
                            isOwner: true,
                            original_url: c.original_url,
                            template: getTemplateMeta([realId, c.url])
                        };
                    });
                }
            }

            const pendingRes = await fetch(`${ENV.API_URL}/api/generate/pending?cb=${cb}`, { headers: { "Authorization": `Bearer ${token}` } });
            if (pendingRes.ok) {
                const pData = await pendingRes.json();
                const rawPending = pData.pending || pData.pending_generations;

                if (rawPending && Array.isArray(rawPending)) {
                    console.log(`📥 [Studio] Fetched ${rawPending.length} pending items`);
                    const pendingItems = rawPending.map((p: any) => {
                        const ts = new Date(p.created_at).getTime();
                        // Heuristic: If job is stuck in processing for > 5 minutes, assume it failed (backend crash?)
                        const isStale = (Date.now() - ts) > 5 * 60 * 1000;
                        const status = isStale ? 'failed' : p.status;
                        const error = isStale ? 'Timed out (Backend unresponsive)' : p.error_message;

                        return {
                            id: `pending-${p.id}`, url: '', previewUrl: '', type: p.type || 'image',
                            timestamp: isNaN(ts) ? Date.now() : ts, prompt: p.prompt, model: p.model_id,
                            ratio: p.aspect_ratio, status: status, jobId: p.id,
                            error: error,
                            template: getTemplateMeta([p.id.toString(), `pending-${p.id}`, p.request_id])
                        };
                    });
                    allItems = [...pendingItems, ...allItems];
                }
            }
            // Sort combined items by timestamp DESC before putting into uniqueMap
            // to ensure easiest deduplication and final order
            allItems.sort((a, b) => b.timestamp - a.timestamp);

            const uniqueMap = new Map<string, GalleryItem>();
            allItems.forEach(item => {
                const realId = item.id.toString().replace('pending-', '');

                // If we have both real and pending, the sort might put them in either order.
                // But generally completed items have slightly different timestamps than pending ones.
                // We prefer the completed item if both exist.
                if (uniqueMap.has(realId)) {
                    const existing = uniqueMap.get(realId);
                    if (existing.status !== 'completed' && item.status === 'completed') {
                        uniqueMap.set(realId, item);
                    }
                } else {
                    uniqueMap.set(realId, item);
                }
            });

            // Convert map back to array and sort one last time to be absolute
            const finalItems = Array.from(uniqueMap.values()).sort((a, b) => b.timestamp - a.timestamp);
            setHistory(finalItems);
        } catch (e) { console.error(e); }
    }, [currentUser?.id]);

    // Dispatch creating count for Navbar
    useEffect(() => {
        const creatingCount = history.filter(item => item.status !== 'completed' && item.status !== 'failed').length;
        window.dispatchEvent(new CustomEvent('creating-count-updated', { detail: { count: creatingCount } }));
    }, [history]);

    useEffect(() => {
        if (!currentUser?.id) {
            navigate("/auth");
            return;
        }

        loadHistory();

        // 1. EVENT-BASED UPDATES (SSE) - Primary mechanism
        const handleJobUpdate = (event: any) => {
            const data = event.detail;
            console.log("🔔 [Studio] Job update received:", data.job_id, data.status);
            loadHistory();
        };

        const handleTokensUpdate = () => {
            loadHistory();
        };

        window.addEventListener('job-updated', handleJobUpdate);
        window.addEventListener('tokens-updated', handleTokensUpdate);

        // 2. SMART FALLBACK POLLING - Only when needed
        let intervalId: NodeJS.Timeout | null = null;

        const startPolling = () => {
            if (intervalId) return; // Already polling
            intervalId = setInterval(() => {
                // Only poll if tab is visible AND there are pending items
                if (document.visibilityState === 'visible') {
                    setHistory(prev => {
                        const hasPending = prev.some(item => item.status !== 'completed' && item.status !== 'failed');
                        if (hasPending) {
                            console.log("🔄 [Studio] Polling for pending items...");
                            loadHistory();
                        }
                        return prev; // Don't modify state, just check
                    });
                }
            }, 15000); // 15s fallback
        };

        const stopPolling = () => {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
        };

        // Handle tab visibility changes
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Tab became visible - reload and start polling
                loadHistory();
                startPolling();
            } else {
                // Tab hidden - stop polling to save resources
                stopPolling();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Start polling if tab is visible
        if (document.visibilityState === 'visible') {
            startPolling();
        }

        return () => {
            window.removeEventListener('job-updated', handleJobUpdate);
            window.removeEventListener('tokens-updated', handleTokensUpdate);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            stopPolling();
        };
    }, [loadHistory, navigate, currentUser?.id]);

    // Handlers
    const handleDeleteHistory = async (id: string) => {
        const itemToDelete = history.find(i => i.id === id);
        setHistory(prev => prev.filter(i => i.id !== id));
        if (previewItem?.id === id) setPreviewItem(null);
        if (!isNaN(Number(id))) {
            try {
                const token = localStorage.getItem("auth_token");
                if (token) {
                    const res = await fetch(`${ENV.API_URL}/api/creations/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } });
                    if (!res.ok) throw new Error("Failed");
                }
                toast.success("Deleted");
            } catch (e) {
                setHistory(prev => itemToDelete ? [itemToDelete, ...prev] : prev);
                toast.error("Failed to delete");
            }
        }
    };

    const handleReusePrompt = (item: GalleryItem, remixMode?: 'full' | 'video' | 'prompt' | 'first-frame' | 'last-frame') => {
        // Core settings
        setPrompt(item.prompt || "");
        if (item.model) setModel(normalizeModelId(item.model));
        if (item.ratio) setAspectRatio(item.ratio);

        // Mode handling
        if (remixMode === 'video' || remixMode === 'first-frame' || remixMode === 'last-frame') {
            setMode('video');
            if (remixMode === 'first-frame' || remixMode === 'last-frame') {
                setModel('veo-3.1-frames'); // Default to interpolation model
            }
        } else if (remixMode === 'prompt') {
            setMode(item.type);
        } else {
            setMode(item.type);
        }

        // Image handling
        if (remixMode !== 'prompt') {
            const sourceUrl = item.url || item.previewUrl;
            if (sourceUrl) {
                const refUrl = getThumbnailUrl(sourceUrl, 800);

                if (remixMode === 'last-frame') {
                    setEndFrameImage(refUrl);
                } else {
                    // Default or first-frame
                    setInputImage(refUrl);
                    setGhostPreviewUrl(refUrl);
                    if (remixMode === 'first-frame') {
                        setEndFrameImage(null); // Clear end frame if we are setting first
                    }
                }
            }
        } else {
            setInputImage(null);
            setEndFrameImage(null);
            const sourceUrl = item.url || item.previewUrl;
            if (sourceUrl) {
                setGhostPreviewUrl(getThumbnailUrl(sourceUrl, 800));
            }
        }

        // Restore template if available
        if (item.template) {
            const tId = item.template.id;
            const found = marketplaceTemplates.find(t => t.id === tId) ||
                myLibraryTemplates.find(t => t.id === tId || (t as any).template_id === tId);

            if (found) {
                setSelectedTemplate(found);
            } else {
                setSelectedTemplate({
                    id: item.template.id,
                    name: item.template.name,
                    images: [item.template.image],
                    preview_images: [item.template.image],
                    type: 'image'
                } as MarketplaceTemplate);
            }
        } else {
            setSelectedTemplate(null);
        }

        setPreviewItem(null);
        setActiveView("create");

        let modeLabel = 'Settings Restored';
        if (remixMode === 'video') modeLabel = 'Video Remix';
        else if (remixMode === 'prompt') modeLabel = 'Prompt Restored';
        else if (remixMode === 'first-frame') modeLabel = 'Added as Start Frame';
        else if (remixMode === 'last-frame') modeLabel = 'Added as End Frame';

        toast.success(modeLabel);
    };

    const handleUseAsTemplate = (item: GalleryItem) => {
        // Set values as if we are about to save this template
        setPrompt(item.prompt || "");
        if (item.model) setModel(item.model);
        if (item.ratio) setAspectRatio(item.ratio);
        setMode(item.type);
        setTemplatePreviewImage(item.url);
        setShowSaveTemplate(true);
    };

    const handleDownload = async (item: GalleryItem) => {
        try {
            // Extract the path from the R2 URL
            // URL format: https://r2.pictureme.now/pictureme-media/creations/...
            let path = '';
            try {
                const url = new URL(item.url);
                path = url.pathname;
                // Remove leading slash and bucket name if present
                if (path.startsWith('/pictureme-media/')) {
                    path = path.substring('/pictureme-media/'.length);
                } else if (path.startsWith('/')) {
                    path = path.substring(1);
                }
            } catch {
                toast.error("Invalid image URL");
                return;
            }

            // Use backend endpoint to download with authentication
            const token = localStorage.getItem('auth_token');
            const apiUrl = ENV.API_URL || 'http://localhost:3002';
            const filename = item.type === 'video' ? `creation-${item.id}.mp4` : `creation-${item.id}.png`;
            const downloadUrl = `${apiUrl}/api/media/private/${path}?download=${encodeURIComponent(filename)}`;

            // Fetch with auth token
            const response = await fetch(downloadUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Download failed: ${response.status}`);
            }

            // Create blob and download
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);

            toast.success("Download started");
        } catch (e) {
            console.error("Download failed", e);
            toast.error("Download failed. Please try again.");
        }
    };

    const handleTogglePublic = async (item: GalleryItem) => {
        const newStatus = !item.isPublic;
        // Optimistic update for both list and preview
        setHistory(prev => prev.map(h => h.id === item.id ? { ...h, isPublic: newStatus } : h));
        if (previewItem?.id === item.id) {
            setPreviewItem(prev => prev ? { ...prev, isPublic: newStatus } : null);
        }

        try {
            const token = localStorage.getItem("auth_token");
            if (!token) return;
            await fetch(`${ENV.API_URL}/api/creations/${item.id}/visibility`, {
                method: "PUT", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ visibility: newStatus ? "public" : "private" })
            });
            toast.success(newStatus ? "Published" : "Private");
        } catch (e) {
            // Revert on failure
            setHistory(prev => prev.map(h => h.id === item.id ? { ...h, isPublic: !newStatus } : h));
            if (previewItem?.id === item.id) {
                setPreviewItem(prev => prev ? { ...prev, isPublic: !newStatus } : null);
            }
            toast.error("Failed to update visibility");
        }
    };

    const handleToggleAdult = async (item: GalleryItem) => {
        const newStatus = !item.isAdult;
        // Optimistic update
        setHistory(prev => prev.map(i => i.id === item.id ? { ...i, isAdult: newStatus } : i));
        if (previewItem?.id === item.id) setPreviewItem(prev => prev ? { ...prev, isAdult: newStatus } : null);

        try {
            if (item.id.toString().startsWith('pending-')) {
                toast.error("Wait for generation to complete");
                return;
            }

            // If it has a shareCode, it's a "booth photo", otherwise it's a "creation"
            if (item.shareCode) {
                await updatePhotoAdultStatus(item.shareCode, newStatus);
            } else {
                await updateCreationAdultStatus(Number(item.id), newStatus);
            }
            toast.success(newStatus ? "Marked as Adult Content" : "Adult Content filter removed");
        } catch (e) {
            // Revert
            setHistory(prev => prev.map(i => i.id === item.id ? { ...i, isAdult: !newStatus } : i));
            if (previewItem?.id === item.id) setPreviewItem(prev => prev ? { ...prev, isAdult: !newStatus } : null);
            toast.error("Failed to update adult status");
        }
    };

    const addToHistory = async (item: GalleryItem, skipBackendSave = false) => {
        setHistory(prev => [item, ...prev]); // optimistic

        // Always persist template meta by URL if available, as a fallback
        if (item.template && item.url) {
            saveTemplateMeta(item.url, item.template);
        }

        if (skipBackendSave) {
            return;
        }

        try {
            const token = localStorage.getItem("auth_token");
            if (!token) return;
            const res = await fetch(`${ENV.API_URL}/api/creations`, {
                method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({
                    image_url: item.url, thumbnail_url: item.previewUrl || item.url, prompt: item.prompt || "",
                    model_id: item.model || "", aspect_ratio: item.ratio || "1:1", type: item.type,
                    visibility: item.isPublic ? 'public' : 'private',
                    parent_id: item.parent_id
                })
            });
            if (res.ok) {
                const saved = await res.json();
                const realId = saved.id.toString();
                // Persist template metadata locally by ID
                if (item.template) {
                    saveTemplateMeta(realId, item.template);
                }
                setHistory(prev => prev.map(h => h.id === item.id ? { ...h, id: realId } : h));
            }
        } catch (e) { console.error(e); }
    };

    const handleGenerate = async () => {
        if (mode === "booth") {
            if (!selectedBoothTemplate) return toast.error("Select a style first");
            if (!inputImage) return toast.error("Upload a photo first");

            setIsProcessing(true);
            setStatusMessage("Processing Booth Photo...");

            try {
                // Use the creator processor but with booth parameters
                const result = await processCreatorImage({
                    userPhotoBase64: inputImage!,
                    backgroundPrompt: selectedBoothTemplate.prompt,
                    backgroundImageUrls: selectedBoothTemplate.images || [],
                    aspectRatio: selectedBoothTemplate.aspectRatio || "auto",
                    aiModel: selectedBoothTemplate.pipelineConfig?.imageModel || "nano-banana",
                    onProgress: setStatusMessage,
                    isPublic
                });

                addToHistory({
                    id: crypto.randomUUID(),
                    url: result.url,
                    type: 'image',
                    timestamp: Date.now(),
                    prompt: selectedBoothTemplate.prompt,
                    model: selectedBoothTemplate.pipelineConfig?.imageModel || "nano-banana",
                    ratio: selectedBoothTemplate.aspectRatio || "auto",
                    status: 'completed',
                    isPublic,
                    template: {
                        id: selectedBoothTemplate.id,
                        name: selectedBoothTemplate.name,
                        image: selectedBoothTemplate.images?.[0] || ""
                    }
                }, true);

                setIsProcessing(false);
                toast.success("Booth photo ready!");

            } catch (e) {
                console.error(e);
                toast.error("Failed to process photo");
                setIsProcessing(false);
            }
            return;
        }

        // Relax check for Text-to-Image models
        const selectedModelObj = Object.values(AI_MODELS).find(m => m.shortId === model || m.id === model);
        const isT2I = model.includes("-t2i") || 
                     model.includes("xai-grok-image") || 
                     (selectedModelObj && (selectedModelObj as any).capabilities?.includes('t2i'));

        if (mode === "image" && !inputImage && !isT2I) return toast.error("Upload image first");
        if (mode === "video" && !inputImage && !prompt) return toast.error("Provide a start frame or prompt"); // Relaxed for video

        setIsProcessing(true);
        setStatusMessage("Thinking...");
        try {
            if (mode === "image") {
                const templateBgs = selectedTemplate?.images || selectedTemplate?.backgrounds || [];
                const result = await processCreatorImage({
                    userPhotoBase64: inputImage || "", // Can be empty for T2I
                    backgroundPrompt: prompt || selectedTemplate?.prompt || "portrait",
                    backgroundImageUrls: [...referenceImages, ...templateBgs],
                    aspectRatio: aspectRatio as "auto" | "1:1" | "4:5" | "3:2" | "16:9" | "9:16",
                    aiModel: model,
                    onProgress: setStatusMessage,
                    isPublic,
                    numImages,
                    resolution,
                    parent_id: remixFrom,
                    skipWait: true
                });

                const templateInfo = selectedTemplate ? {
                    id: selectedTemplate.id,
                    name: selectedTemplate.name,
                    image: selectedTemplate.preview_images?.[0] || selectedTemplate.images?.[0] || ""
                } : undefined;

                // CRITICAL: Save template metadata using both Job ID and RAW FAL URL (if available) 
                // because the task moves between these states. This ensures hydration works at every stage.
                if (templateInfo) {
                    if (result.rawUrl) saveTemplateMeta(result.rawUrl, templateInfo);
                    if (result.jobId) saveTemplateMeta(result.jobId.toString(), templateInfo);
                }

                console.log("🏁 [CreatorAI] Generation complete, task queued", {
                    jobId: result.jobId,
                    count: (result as any).urls?.length || 1
                });

                // Small delay to ensure DB persistence indexing if needed, then await refresh
                await new Promise(r => setTimeout(r, 500));
                await loadHistory();
            } else if (mode === "video") {
                const endpoint = `${ENV.API_URL || "http://localhost:3002"}/api/generate/video`;

                // Auto-switch intelligence for video models
                let finalModelId = model;
                if (model === 'veo-3.1') {
                    if (inputImage && endFrameImage) finalModelId = 'fal-ai/veo3.1/first-last-frame-to-video';
                    else if (inputImage) finalModelId = 'fal-ai/veo3.1/image-to-video';
                    else finalModelId = 'fal-ai/veo3.1';
                } else if (model === 'veo-3.1-fast') {
                    if (inputImage && endFrameImage) finalModelId = 'fal-ai/veo3.1/fast/first-last-frame-to-video';
                    else if (inputImage) finalModelId = 'fal-ai/veo3.1/fast/image-to-video';
                    else finalModelId = 'fal-ai/veo3.1/fast';
                } else if (model === 'google-video') {
                    finalModelId = 'fal-ai/google/veo-3-1/image-to-video';
                } else if (model === 'kling-2.6' || model === 'kling-2.6-pro') {
                    if (inputImage) finalModelId = 'fal-ai/kling-video/v2.6/pro/image-to-video';
                    else finalModelId = 'fal-ai/kling-video/v2.6/pro/text-to-video';
                } else if (model === 'kling-2.5') {
                    if (inputImage) finalModelId = 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video';
                    else finalModelId = 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video';
                } else if (model === 'wan-v2') {
                    if (!inputImage) finalModelId = 'fal-ai/wan/v2.2-a14b/text-to-video';
                }

                console.log(`🎬 [Studio] Auto-switched model: ${model} -> ${finalModelId}`);

                const resp = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem("auth_token")}`
                    },
                    body: JSON.stringify({
                        prompt,
                        model_id: finalModelId,
                        duration: duration.replace("s", ""),
                        aspect_ratio: aspectRatio,
                        audio: audioOn,
                        resolution: resolution,
                        start_image_url: inputImage,
                        end_image_url: endFrameImage,
                        visibility: isPublic ? 'public' : 'private',
                        parent_id: remixFrom
                    })
                });
                if (!resp.ok) throw new Error("Failed");
                const data = await resp.json();
                loadHistory();
            }
            toast.success("in progress!");
        } catch (e) { toast.error("Failed"); } finally { setIsProcessing(false); }
    };

    // File upload ref
    const fileInputRef = useRef<HTMLInputElement>(null);
    const triggerFileUpload = (type: any) => { setActiveInputType(type); fileInputRef.current?.click(); };
    const handleFileUpload = (e: any) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        files.forEach((file: any) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const res = ev.target?.result as string;
                if (activeInputType === 'main') {
                    // For booth, append to list. For others, replace.
                    if (mode === 'booth') {
                        setInputImages(prev => [...prev, res]);
                        // Update primary inputImage to the last uploaded one for compatibility
                        setInputImage(res);
                    } else {
                        setInputImage(res);
                    }
                }
                else if (activeInputType === 'end') setEndFrameImage(res);
                else if (activeInputType === 'ref') setReferenceImages(prev => [...prev, res]);
            };
            reader.readAsDataURL(file);
        });
    };

    const applyTemplate = (tpl: MarketplaceTemplate) => {
        // Final safeguard: Check if template is usable (free, owned, or creator)
        const isFree = (tpl.price === 0 || !tpl.price) && (tpl.tokens_cost === 0 || !tpl.tokens_cost);
        
        // Robust creator check (comparing strings to avoid number/uuid mismatch)
        const currentUserIdStr = currentUser?.id?.toString();
        const isCreator = (tpl.creator_id && tpl.creator_id.toString() === currentUserIdStr) || 
                         (tpl.creator?.id && tpl.creator.id.toString() === currentUserIdStr) ||
                         (tpl.creator_id && currentUser?.username && tpl.creator_id === currentUser.username) ||
                         (tpl.creator_id && currentUser?.slug && tpl.creator_id === currentUser.slug);

        const isOwned = (tpl as any).is_owned || myLibraryTemplates.some(lib => lib.id === tpl.id || (lib as any).template_id === tpl.id);
        const canUse = isOwned || isFree || isCreator;

        if (!canUse) {
            toast.error("Purchase template to use", {
                description: `This style costs ${tpl.tokens_cost || tpl.price} tokens. Redirecting to marketplace...`
            });
            navigate(`/creator/marketplace?templateId=${tpl.id}`);
            return;
        }

        setSelectedTemplate(tpl);
        setPrompt(tpl.prompt || "");

        // Automatically switch mode based on template type
        const tplType = tpl.type || tpl.media_type;
        if (tplType === 'video' && mode !== 'video') {
            setMode('video');
        } else if ((tplType === 'image' || !tplType) && mode !== 'image') {
            setMode('image');
        }

        if (tpl.ai_model) setModel(normalizeModelId(tpl.ai_model));
        if (tpl.aspectRatio) setAspectRatio(tpl.aspectRatio);
        // Automatically set the first image as a style reference
        const templateImage = tpl.preview_url || (tpl.preview_images?.length ? tpl.preview_images[0] : null) || (tpl.backgrounds?.length ? tpl.backgrounds[0] : null) || (tpl as any).images?.[0];
        if (templateImage) {
            setReferenceImages([templateImage]);
        }
        setShowTemplateLibrary(false);
        toast.success(`Applied style: ${tpl.name}`);
    };

    if (!currentUser) return null;

    const handleRemoveInputImage = () => setInputImage(null);
    const handleRemoveEndFrameImage = () => setEndFrameImage(null);
    const handleRemoveReferenceImage = (index: number) => {
        setReferenceImages(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="flex-1 h-full overflow-hidden flex flex-col md:flex-row bg-[#101112] text-white font-sans relative">

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col md:flex-row min-w-0 transition-all duration-300 h-full overflow-hidden">
                {activeView === "templates" ? (
                    <TemplatesView />
                ) : activeView === "booths" ? (
                    <div className="flex-1 bg-[#101112] flex flex-col overflow-y-auto [webkit-overflow-scrolling:touch]"><BoothDashboard /></div>
                ) : (activeView === "gallery" || activeView === "home") ? (
                    <GalleryView
                        history={history}
                        setPreviewItem={setPreviewItem}
                        onReusePrompt={handleReusePrompt}
                        onDownload={handleDownload}
                    />
                ) : (
                    /* --- CREATE VIEW (Existing Layout) --- */
                    <>
                        {/* COLUMN 2: CONTROL PANEL (Refactored) - Now visible on all screen sizes */}
                        <div className="flex-shrink-0 w-full md:w-auto">
                            <CreatorStudioSidebar
                                mode={mode}
                                setMode={setMode}
                                prompt={prompt}
                                setPrompt={setPrompt}
                                model={model}
                                setModel={setModel}
                                aspectRatio={aspectRatio}
                                setAspectRatio={setAspectRatio}
                                duration={duration}
                                setDuration={setDuration}
                                audio={audioOn}
                                setAudio={setAudioOn}
                                resolution={resolution}
                                setResolution={setResolution}
                                numImages={numImages}
                                setNumImages={setNumImages}
                                maxImages={maxImages}
                                isProcessing={isProcessing}
                                onGenerate={handleGenerate}
                                inputImage={inputImage}
                                endFrameImage={endFrameImage}
                                onUploadClick={triggerFileUpload}
                                onRemoveInputImage={handleRemoveInputImage}
                                onRemoveEndFrameImage={handleRemoveEndFrameImage}
                                selectedTemplate={selectedTemplate}
                                onSelectTemplate={applyTemplate}
                                onToggleTemplateLibrary={() => setShowTemplateLibrary(true)}
                                referenceImages={referenceImages}
                                onRemoveReferenceImage={handleRemoveReferenceImage}
                                isPublic={isPublic}
                                setIsPublic={setIsPublic}
                                isFreeTier={isFreeTier}
                                onCloseMobile={() => {
                                    if (activeView === 'create') {
                                        setActiveView('gallery');
                                    } else if (window.history.length > 2) {
                                        navigate(-1);
                                    } else {
                                        navigate('/creator/dashboard');
                                    }
                                }}
                                availableModels={availableModels}
                                remixFromUsername={remixFromUsername}
                                ghostPreviewUrl={ghostPreviewUrl}
                                userBooths={userBooths}
                                selectedBooth={selectedBooth}
                                onSelectBooth={setSelectedBooth}
                                selectedBoothTemplate={selectedBoothTemplate}
                                onSelectBoothTemplate={setSelectedBoothTemplate}
                                onImageCaptured={(img) => {
                                    setInputImage(img);
                                    setInputImages(prev => [...prev, img]);
                                }}
                                inputImages={inputImages}
                                onRemoveInputImageObj={(index) => {
                                    // Filter once and update both relevant states
                                    setInputImages(prev => {
                                        const newList = prev.filter((_, i) => i !== index);
                                        // Update primary inputImage to the last remaining one for compatibility
                                        setInputImage(newList.length > 0 ? newList[newList.length - 1] : null);
                                        return newList;
                                    });
                                }}
                            />
                        </div>

                        {/* COLUMN 3: CANVAS / TIMELINE AREA */}
                        <div className="flex-1 md:pl-[410px] relative h-full">
                            {showTemplateLibrary && (
                                <div className={cn(
                                    "z-[130] bg-[#101112] flex flex-col animate-in duration-300 shadow-2xl",
                                    "fixed inset-0",
                                    "md:top-[80px] md:left-[405px] md:right-4 md:bottom-0 md:rounded-t-2xl md:rounded-b-0 md:border md:border-white/5 md:overflow-hidden",
                                    "slide-in-from-bottom-5 md:slide-in-from-right-5"
                                )}>
                                    <TemplateLibrary
                                        onClose={() => setShowTemplateLibrary(false)}
                                        onSelect={applyTemplate}
                                        marketplaceTemplates={marketplaceTemplates}
                                        myLibraryTemplates={myLibraryTemplates}
                                        selectedTemplateId={selectedTemplate?.id}
                                    />
                                </div>
                            )}

                            <TimelineView
                                history={history}
                                isProcessing={isProcessing}
                                statusMessage={statusMessage}
                                setPreviewItem={setPreviewItem}
                                onReusePrompt={handleReusePrompt}
                                onDownload={handleDownload}
                                onDelete={(item) => handleDeleteHistory(item.id.toString())}
                                mode={mode}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Hidden Input */}
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*" multiple />

            {/* --- OVERLAYS & MOBILE NAV --- */}


            {/* Mobile Create Mode Header */}
            {/* Mobile Bottom Navigation */}
            <CreatorBottomNav
                onOpenCreate={() => setActiveView("create")}
                onLibraryClick={() => setActiveView("gallery")}
                onHomeClick={() => navigate('/creator/dashboard')}
                activeTab={activeView}
            />

            {/* immersive vertical navigation detail view */}
            <CreationDetailView
                items={history}
                initialIndex={history.findIndex(h => h.id === previewItem?.id)}
                open={!!previewItem}
                onClose={() => setPreviewItem(null)}
                onTogglePublic={handleTogglePublic}
                onToggleAdult={handleToggleAdult}
                onReusePrompt={handleReusePrompt}
                onUseAsTemplate={handleUseAsTemplate}
                onDownload={handleDownload}
                onDelete={handleDeleteHistory}
                isSuperAdmin={isSuperAdmin}
            />

            <SaveTemplateModal
                open={showSaveTemplate}
                onClose={() => {
                    setShowSaveTemplate(false);
                    setTemplatePreviewImage(undefined);
                }}
                defaults={{
                    prompt: prompt,
                    model: model,
                    aspectRatio: aspectRatio,
                    type: mode === 'booth' ? 'image' : mode,
                    image: templatePreviewImage
                }}
                onSave={(p) => {
                    saveTemplate({
                        id: crypto.randomUUID(),
                        ...p,
                        images: p.image ? [p.image] : []
                    });
                    setShowSaveTemplate(false);
                    setTemplatePreviewImage(undefined);
                }}
            />

            <MobileFloatingRail
                isOpen={isMobileRailOpen}
                onClose={() => setIsMobileRailOpen(false)}
                activeView={activeView}
                onViewChange={setActiveView}
                user={currentUser}
                onMarketplaceClick={() => setShowTemplateLibrary(true)}
                notificationCount={history.filter(item => item.status === 'processing').length}
            />

            {/* Mobile Slide Hint */}
            {showIdleHint && !isMobileRailOpen && (
                <div
                    className="fixed right-0 top-1/2 -translate-y-1/2 z-[90] flex items-center md:hidden animate-in fade-in slide-in-from-right-4 duration-1000"
                    onClick={() => setIsMobileRailOpen(true)}
                >
                    <div className="bg-[#101112]/40 backdrop-blur-md border border-white/10 rounded-l-2xl py-6 px-2 flex flex-col items-center gap-3 shadow-2xl animate-pulse">
                        <ChevronLeft className="w-5 h-5 text-white animate-bounce-horizontal" />
                        <span className="text-[10px] font-bold text-white tracking-[0.2em] uppercase" style={{ writingMode: 'vertical-lr' }}>
                            Slide
                        </span>
                    </div>
                </div>
            )}

        </div>
    );
}

export default function CreatorStudioPage(props: CreatorStudioPageProps) {
    return (
        <ErrorBoundary>
            <CreatorStudioPageContent {...props} />
        </ErrorBoundary>
    );
}
