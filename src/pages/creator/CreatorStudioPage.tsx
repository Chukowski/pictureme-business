import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { getCurrentUser, getCurrentUserProfile, User } from "@/services/eventsApi";
import { getMarketplaceTemplates } from "@/services/marketplaceApi";

import { processImageWithAI, AspectRatio, AI_MODELS, resolveModelId } from "@/services/aiProcessor";
import { processCreatorImage } from "@/services/creatorAiProcessor";
import { ENV } from "@/config/env";
import { SaveTemplateModal } from "@/components/templates/SaveTemplateModal";
import { useMyTemplates, UserTemplate } from "@/hooks/useMyTemplates";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getThumbnailUrl, getProcessingUrl, getDownloadUrl, getProxyDownloadUrl } from "@/services/imgproxy";
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
import { MagicGeneratingButton } from "@/components/creator/studio/MagicGeneratingButton";
import { AnimatePresence } from "framer-motion";

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

function CreatorStudioPageContent() {
    const navigate = useNavigate();
    const location = useLocation();
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

    // View State
    const [activeView, setActiveView] = useState<MainView>((location.state as any)?.view || "create");

    // Update view if location state changes (e.g. navigation from bottom nav while on same page?)
    useEffect(() => {
        if ((location.state as any)?.view) {
            setActiveView((location.state as any).view);
        }
    }, [location.state]);
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

    // Create Mode State
    const [mode, setMode] = useState<SidebarMode>("image");
    const [prompt, setPrompt] = useState("");
    const [model, setModel] = useState("nano-banana");
    const [aspectRatio, setAspectRatio] = useState("9:16");
    const [duration, setDuration] = useState("5s");
    const [audioOn, setAudioOn] = useState(false);


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
    const [endFrameImage, setEndFrameImage] = useState<string | null>(null);
    const [referenceImages, setReferenceImages] = useState<string[]>([]);
    const [activeInputType, setActiveInputType] = useState<"main" | "end" | "ref" | "subject">("main");
    const [remixFrom, setRemixFrom] = useState<number | null>(null);
    const [remixFromUsername, setRemixFromUsername] = useState<string | null>(null);

    // Unified Remix State Handler
    useEffect(() => {
        const state = location.state as any;
        if (!state) return;

        console.log("[CreatorStudioPage] Consuming remix state:", state);

        if (state.prompt) setPrompt(state.prompt);
        if (state.mode) setMode(state.mode);

        // If we have a source image, set it as the main input
        if (state.sourceImageUrl) {
            setInputImage(state.sourceImageUrl);
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

    // Template Resolution Effect (for templateId from feed)
    useEffect(() => {
        const pendingTemplateId = (location.state as any)?.templateId;
        if (pendingTemplateId && marketplaceTemplates.length > 0 && !selectedTemplate) {
            const found = marketplaceTemplates.find(t => t.id === pendingTemplateId || (t as any).template_id === pendingTemplateId);
            if (found) {
                console.log("[CreatorStudioPage] Resolved template from ID:", pendingTemplateId);
                applyTemplate(found);
            }
        }
    }, [marketplaceTemplates, location.state, selectedTemplate]);

    // Processing
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState("Preparing...");

    // History
    const [history, setHistory] = useState<GalleryItem[]>([]);
    const [previewItem, setPreviewItem] = useState<GalleryItem | null>(null);
    const [showSaveTemplate, setShowSaveTemplate] = useState(false);
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
    useEffect(() => {
        if (!currentUser?.id) {
            navigate("/admin/auth");
            return;
        }
        const loadHistory = async () => {
            const token = localStorage.getItem("auth_token");
            if (!token) return;
            try {
                const completedRes = await fetch(`${ENV.API_URL}/api/creations`, { headers: { "Authorization": `Bearer ${token}` } });
                let allItems: GalleryItem[] = [];

                if (completedRes.ok) {
                    const data = await completedRes.json();
                    if (data.creations && Array.isArray(data.creations)) {
                        allItems = data.creations.map((c: any) => {
                            const realId = c.id.toString();
                            return {
                                id: realId,
                                url: c.url,
                                previewUrl: c.thumbnail_url || c.url,
                                type: c.type || 'image',
                                timestamp: new Date(c.created_at).getTime(),
                                prompt: c.prompt,
                                model: c.model_id || c.model,
                                ratio: c.aspect_ratio,
                                isPublic: c.is_published || c.visibility === 'public',
                                status: 'completed',
                                isOwner: true,  // User's own creations - enables delete and visibility toggle
                                template: getTemplateMeta([realId, c.url]) // Hydrate from ID or URL lookup
                            };
                        });
                    }
                }

                const pendingRes = await fetch(`${ENV.API_URL}/api/generate/pending`, { headers: { "Authorization": `Bearer ${token}` } });
                if (pendingRes.ok) {
                    const pData = await pendingRes.json();
                    if (pData.pending && Array.isArray(pData.pending)) {
                        const pendingItems = pData.pending.map((p: any) => ({
                            id: `pending-${p.id}`, url: '', previewUrl: '', type: p.type || 'image',
                            timestamp: new Date(p.created_at).getTime(), prompt: p.prompt, model: p.model_id,
                            ratio: p.aspect_ratio, status: p.status, jobId: p.id
                        }));
                        allItems = [...pendingItems, ...allItems];
                    }
                }

                // Deduplicate by ID to prevent ghost items
                const uniqueMap = new Map();

                // First add all items, normalizing IDs
                allItems.forEach(item => {
                    const realId = item.id.toString().replace('pending-', '');

                    // If we already have a completed version (id without pending-), keep it
                    // If the current item is pending and we have a completed one, skip
                    if (item.id.toString().startsWith('pending-') && uniqueMap.has(realId)) {
                        return;
                    }

                    // If we have a pending version and now find a completed version, replace it
                    if (uniqueMap.has(realId)) {
                        const existing = uniqueMap.get(realId);
                        if (existing.id.toString().startsWith('pending-')) {
                            // Replace pending with real
                            uniqueMap.set(realId, item);
                        }
                        // If both are real (shouldn't happen with Map), overwrite is fine
                    } else {
                        // New item
                        uniqueMap.set(realId, item);
                    }
                });

                setHistory(Array.from(uniqueMap.values()));
            } catch (e) { console.error(e); }
        };
        loadHistory();

        // POLL FOR UPDATES: Every 10 seconds if there are pending items
        // This fixes the "vanishing indicator" glitch by ensuring the status is refreshed
        const interval = setInterval(() => {
            const hasPending = history.some(item => item.status !== 'completed' && item.status !== 'failed');
            if (hasPending || history.length === 0) {
                loadHistory();
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [currentUser?.id, navigate, history.length]); // Dependencies ensure we check when history items change status

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

    const handleReusePrompt = (item: GalleryItem) => {
        setPrompt(item.prompt || "");
        if (item.model) setModel(item.model);
        if (item.ratio) setAspectRatio(item.ratio);
        setMode(item.type);

        // Set the creation's image as the subject input (matching public feed remix behavior)
        const sourceUrl = item.url || item.previewUrl;
        if (sourceUrl) {
            // Use imgproxy-processed URL for reference to avoid payload issues
            const refUrl = getThumbnailUrl(sourceUrl, 800);
            setInputImage(refUrl);
        }

        // Restore template if available
        if (item.template) {
            // Check if we can find the full template in our current list
            const found = marketplaceTemplates.find(t => t.id === item.template?.id) ||
                myLibraryTemplates.find(t => t.id === item.template?.id);

            if (found) {
                setSelectedTemplate(found);
            } else {
                // If not found (e.g. from older session), construct a minimal shell
                // This isn't perfect but allows the UI to show the selected template pill
                setSelectedTemplate({
                    id: item.template.id,
                    name: item.template.name,
                    // We don't have the original template images/backgrounds here unfortunately
                    // unless we persist them. For now, we restore the identity.
                    images: [item.template.image],
                    preview_images: [item.template.image],
                    type: 'image'
                } as MarketplaceTemplate);
            }
        } else {
            setSelectedTemplate(null);
        }

        // Close the detail view and switch to create mode
        setPreviewItem(null);
        setActiveView("create");
        toast.success("Prompt and settings restored");
    };

    const handleUseAsTemplate = (item: GalleryItem) => {
        if (item.type === "video") return toast.error("Images only");
        setSelectedTemplate({
            id: `history-${item.id}`, name: "From history", prompt: item.prompt, images: [item.url],
            ai_model: item.model, aspectRatio: item.ratio, type: "image"
        });
        handleReusePrompt(item);
    };

    const handleDownload = async (item: GalleryItem) => {
        try {
            if (item.type === 'video') {
                // Videos proxy too just to be safe with headers/CORS
                const proxyUrl = getProxyDownloadUrl(item.url, `creation-${item.id}.mp4`);
                window.location.href = proxyUrl;
                return;
            }

            // 1. Get the optimized imgproxy URL based on tier
            const optimizedUrl = getDownloadUrl(item.url, userTier);

            // 2. Wrap it in our backend proxy to force download header and bypass CORS
            const proxyUrl = getProxyDownloadUrl(optimizedUrl, `creation-${item.id}.webp`);

            // 3. Simply navigate to it - the Content-Disposition header will trigger save
            window.location.href = proxyUrl;

            toast.success("Download started");
        } catch (e) {
            console.error("Download failed", e);
            window.open(item.url, '_blank');
        }
    };

    const handleTogglePublic = async (item: GalleryItem) => {
        const newVisibility = !item.isPublic;

        // Optimistic update for both list and preview
        setHistory(prev => prev.map(h => h.id === item.id ? { ...h, isPublic: newVisibility } : h));
        if (previewItem?.id === item.id) {
            setPreviewItem(prev => prev ? { ...prev, isPublic: newVisibility } : null);
        }

        try {
            const token = localStorage.getItem("auth_token");
            if (!token) return;
            await fetch(`${ENV.API_URL}/api/creations/${item.id}/visibility`, {
                method: "PUT", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ visibility: newVisibility ? 'public' : 'private' })
            });
            toast.success(newVisibility ? "Published" : "Private");
        } catch (e) {
            // Revert on failure
            setHistory(prev => prev.map(h => h.id === item.id ? { ...h, isPublic: !newVisibility } : h));
            if (previewItem?.id === item.id) {
                setPreviewItem(prev => prev ? { ...prev, isPublic: !newVisibility } : null);
            }
            toast.error("Failed to update visibility");
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
            toast.info("Booth generation is handled in the Booth Dashboard.");
            return;
        }
        if (mode === "image" && !inputImage) return toast.error("Upload image first");
        if (mode === "video" && !inputImage && !prompt) return toast.error("Provide a start frame or prompt"); // Relaxed for video

        setIsProcessing(true);
        setStatusMessage("Thinking...");
        try {
            if (mode === "image") {
                const templateBgs = selectedTemplate?.images || selectedTemplate?.backgrounds || [];
                const result = await processCreatorImage({
                    userPhotoBase64: inputImage!,
                    backgroundPrompt: prompt || selectedTemplate?.prompt || "portrait",
                    backgroundImageUrls: [...referenceImages, ...templateBgs],
                    aspectRatio: aspectRatio as "auto" | "1:1" | "4:5" | "3:2" | "16:9" | "9:16",
                    aiModel: model,
                    onProgress: setStatusMessage,
                    isPublic,
                    parent_id: remixFrom
                });

                const templateInfo = selectedTemplate ? {
                    id: selectedTemplate.id,
                    name: selectedTemplate.name,
                    image: selectedTemplate.preview_images?.[0] || selectedTemplate.images?.[0] || ""
                } : undefined;

                // CRITICAL: Save template metadata using the RAW FAL URL (if available) 
                // because that is what the backend auto-saves. This ensures hydration works on refresh.
                if (result.rawUrl && templateInfo) {
                    saveTemplateMeta(result.rawUrl, templateInfo);
                }

                addToHistory({
                    id: crypto.randomUUID(),
                    url: result.url,
                    type: 'image',
                    timestamp: Date.now(),
                    prompt,
                    model,
                    ratio: aspectRatio,
                    status: 'completed',
                    template: templateInfo,
                    isPublic,
                    parent_id: remixFrom,
                    parent_username: remixFromUsername
                }, true); // Skip backend save because the backend generation endpoint auto-saves
            } else if (mode === "video") {
                const endpoint = `${ENV.API_URL || "http://localhost:3002"}/api/generate/video`;
                const resp = await fetch(endpoint, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        prompt,
                        model_id: model,
                        duration: duration.replace("s", ""),
                        aspect_ratio: aspectRatio,
                        audio: audioOn,
                        start_image_url: inputImage,
                        end_image_url: endFrameImage,
                        visibility: isPublic ? 'public' : 'private',
                        parent_id: remixFrom
                    })
                });
                if (!resp.ok) throw new Error("Failed");
                const data = await resp.json();
                addToHistory({
                    id: crypto.randomUUID(),
                    url: data.url,
                    type: 'video',
                    timestamp: Date.now(),
                    prompt,
                    model,
                    ratio: aspectRatio,
                    status: 'completed',
                    isPublic,
                    parent_id: remixFrom,
                    parent_username: remixFromUsername
                });
            }
            toast.success("Created!");
        } catch (e) { toast.error("Failed"); } finally { setIsProcessing(false); }
    };

    // File upload ref
    const fileInputRef = useRef<HTMLInputElement>(null);
    const triggerFileUpload = (type: any) => { setActiveInputType(type); fileInputRef.current?.click(); };
    const handleFileUpload = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const res = ev.target?.result as string;
            if (activeInputType === 'main') setInputImage(res);
            else if (activeInputType === 'end') setEndFrameImage(res);
            else if (activeInputType === 'ref') setReferenceImages(prev => [...prev, res]);
        };
        reader.readAsDataURL(file);
    };

    const applyTemplate = (tpl: MarketplaceTemplate) => {
        setSelectedTemplate(tpl);
        setPrompt(tpl.prompt || "");
        if (tpl.ai_model) setModel(tpl.ai_model);
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
        <div className="min-h-dvh h-screen overflow-hidden pt-20 flex flex-col md:flex-row bg-black text-white font-sans relative">



            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col md:flex-row min-w-0 transition-all duration-300 pb-32 md:pb-0">
                {activeView === "templates" ? (
                    <TemplatesView />
                ) : activeView === "booths" ? (
                    <div className="flex-1 bg-black md:overflow-y-auto overflow-visible w-full"><BoothDashboard /></div>
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
                                    if (window.history.length > 2) {
                                        navigate(-1);
                                    } else {
                                        navigate('/creator/dashboard');
                                    }
                                }}
                                availableModels={availableModels}
                                remixFromUsername={remixFromUsername}
                            />
                        </div>

                        {/* COLUMN 3: CANVAS / TIMELINE */}
                        <div className="flex-1 md:pl-[360px]">
                            <TimelineView
                                history={history}
                                isProcessing={isProcessing}
                                statusMessage={statusMessage}
                                setPreviewItem={setPreviewItem}
                                onReusePrompt={handleReusePrompt}
                                onDownload={handleDownload}
                                mode={mode}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Hidden Input */}
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*" />

            {/* --- OVERLAYS & MOBILE NAV --- */}

            {/* Template Library Overlay (Full Screen) */}
            {
                showTemplateLibrary && (
                    <div className="fixed inset-0 z-[60] bg-[#121212] flex flex-col animate-in slide-in-from-bottom-5 duration-300">
                        <TemplateLibrary
                            onClose={() => setShowTemplateLibrary(false)}
                            onSelect={applyTemplate}
                            marketplaceTemplates={marketplaceTemplates}
                            myLibraryTemplates={myLibraryTemplates}
                            selectedTemplateId={selectedTemplate?.id}
                        />
                    </div>
                )
            }

            {/* Mobile Create Mode Header */}
            {/* Mobile Bottom Navigation (Hidden in Create Mode) */}
            {
                activeView !== "create" && (
                    <CreatorBottomNav
                        onOpenCreate={() => setActiveView("create")}
                        onLibraryClick={() => setActiveView("gallery")}
                        activeTab={activeView}
                    />
                )
            }

            {/* immersive vertical navigation detail view */}
            <CreationDetailView
                items={history}
                initialIndex={history.findIndex(h => h.id === previewItem?.id)}
                open={!!previewItem}
                onClose={() => setPreviewItem(null)}
                onTogglePublic={handleTogglePublic}
                onReusePrompt={handleReusePrompt}
                onUseAsTemplate={handleUseAsTemplate}
                onDownload={handleDownload}
                onDelete={handleDeleteHistory}
            />

            <SaveTemplateModal
                open={showSaveTemplate}
                onClose={() => setShowSaveTemplate(false)}
                defaults={{ prompt: prompt, model: model, aspectRatio: aspectRatio, type: mode === 'booth' ? 'image' : mode }}
                onSave={(p) => { saveTemplate({ id: crypto.randomUUID(), ...p }); setShowSaveTemplate(false); }}
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
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-l-2xl py-6 px-2 flex flex-col items-center gap-3 shadow-2xl animate-pulse">
                        <ChevronLeft className="w-5 h-5 text-white animate-bounce-horizontal" />
                        <span className="text-[10px] font-bold text-white tracking-[0.2em] uppercase" style={{ writingMode: 'vertical-lr' }}>
                            Slide
                        </span>
                    </div>
                </div>
            )}

            <AnimatePresence>
                <MagicGeneratingButton
                    count={history.filter(item => item.status !== 'completed' && item.status !== 'failed').length}
                    onClick={() => setActiveView('gallery')}
                />
            </AnimatePresence>
        </div>
    );
}

export default function CreatorStudioPage() {
    return (
        <ErrorBoundary>
            <CreatorStudioPageContent />
        </ErrorBoundary>
    );
}
