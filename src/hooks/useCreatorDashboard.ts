import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, getTokenStats, User } from "@/services/eventsApi";
import { getHomeContent, getPublicCreations, HomeContentResponse, PublicCreation, FeaturedTemplate } from "@/services/contentApi";
import { getMarketplaceTemplates, MarketplaceTemplate } from "@/services/marketplaceApi";
import { ENV } from "@/config/env";
import { isUserAdult, cn } from "@/lib/utils";
import { CreatorHomeState, UserCreation, FeedCreation, RemixMode } from "@/pages/creator/dashboard/types";
import { isVideoUrl, getDownloadUrl, getProxyDownloadUrl, getProcessingUrl } from "@/services/cdn";
import { toast } from "sonner";

// Helper: Get Creator Home State
function getCreatorHomeState(user: User | null, creations: UserCreation[]): CreatorHomeState {
    if (!user) return 'idle';

    const tokens = user.tokens_remaining ?? 0;
    const hasRecentCreations = creations.length > 0;
    const recentCreationAge = hasRecentCreations
        ? (Date.now() - new Date(creations[0]?.created_at).getTime()) / (1000 * 60 * 60) // hours
        : Infinity;

    if (tokens <= 0) return 'out_of_tokens';
    if (hasRecentCreations && recentCreationAge < 24) return 'active';
    if (tokens > 0 && !hasRecentCreations) return 'idle';
    return 'exploring';
}

// Helper: Get Featured Templates
function getFeaturedTemplates(templates: MarketplaceTemplate[], adminFeatured: FeaturedTemplate[] = []): MarketplaceTemplate[] {
    if (!templates || templates.length === 0) return [];

    const adminIds = new Set(adminFeatured.map(f => f.template_id));
    const adminPicks = templates.filter(t => adminIds.has(t.id));

    const taggedFeatured = templates.filter(t =>
        !adminIds.has(t.id) &&
        t.tags?.some(tag => tag.toLowerCase() === 'featured')
    );

    const taggedPromoted = templates.filter(t =>
        !adminIds.has(t.id) &&
        t.tags?.some(tag => tag.toLowerCase() === 'promoted')
    );

    const pickedIds = new Set([
        ...adminPicks.map(t => t.id),
        ...taggedFeatured.map(t => t.id),
        ...taggedPromoted.map(t => t.id)
    ]);

    const topPerformers = [...templates]
        .filter(t => !pickedIds.has(t.id))
        .sort((a, b) => {
            const scoreA = (a.downloads || 0) * 0.7 + (a.rating || 0) * 100 * 0.3;
            const scoreB = (b.downloads || 0) * 0.7 + (b.rating || 0) * 100 * 0.3;
            return scoreB - scoreA;
        })
        .slice(0, 3);

    const combined = [...adminPicks, ...taggedFeatured, ...taggedPromoted, ...topPerformers];
    const unique = combined.filter((template, index, self) =>
        index === self.findIndex((t) => t.id === template.id)
    );

    return unique.slice(0, 5);
}

export function useCreatorDashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [content, setContent] = useState<HomeContentResponse | null>(null);
    const [marketplaceTemplates, setMarketplaceTemplates] = useState<MarketplaceTemplate[]>([]);
    const [creations, setCreations] = useState<UserCreation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Community Feed Pagination State
    const [publicCreations, setPublicCreations] = useState<PublicCreation[]>([]);
    const [isFeedLoading, setIsFeedLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [feedOffset, setFeedOffset] = useState(0);
    const [showAdultContent, setShowAdultContent] = useState(false);
    const [isMobileViewport, setIsMobileViewport] = useState(
        typeof window !== 'undefined' ? window.innerWidth < 768 : false
    );
    const [feedZoom, setFeedZoom] = useState(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) return [2];
        return [3];
    });
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewIndex, setPreviewIndex] = useState(0);

    const FEED_LIMIT = 12;
    const maxFeedColumns = isMobileViewport ? 4 : 6;

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mediaQuery = window.matchMedia('(max-width: 767px)');
        const updateViewport = (event: MediaQueryListEvent | MediaQueryList) => {
            setIsMobileViewport(event.matches);
        };
        updateViewport(mediaQuery);
        const listener = (event: MediaQueryListEvent) => updateViewport(event);
        mediaQuery.addEventListener('change', listener);
        return () => mediaQuery.removeEventListener('change', listener);
    }, []);

    useEffect(() => {
        setFeedZoom((prev) => [Math.min(Math.max(prev[0], 2), maxFeedColumns)]);
    }, [maxFeedColumns]);

    const isAdult = isUserAdult(user?.birth_date);

    const loadData = useCallback(async () => {
        try {
            const currentUser = getCurrentUser();
            if (!currentUser) {
                navigate('/auth');
                return;
            }

            const token = localStorage.getItem("auth_token");

            const [homeContent, templates, tokenStats, creationsData] = await Promise.all([
                getHomeContent('personal').catch(() => null),
                getMarketplaceTemplates({ limit: 10 }).catch(() => []),
                getTokenStats().catch(() => null),
                token ? fetch(`${ENV.API_URL}/api/creations?limit=20&sort=desc`, {
                    headers: { "Authorization": `Bearer ${token}` }
                }).then(r => r.ok ? r.json() : { creations: [] }).catch(() => ({ creations: [] })) : { creations: [] }
            ]);

            if (tokenStats) {
                setUser({
                    ...currentUser,
                    tokens_remaining: tokenStats.current_tokens,
                    tokens_total: tokenStats.tokens_total || currentUser.tokens_total
                });
            } else {
                setUser(currentUser);
            }

            if (homeContent) {
                setContent(homeContent);
                if (homeContent.public_creations) {
                    setPublicCreations(homeContent.public_creations);
                    setFeedOffset(homeContent.public_creations.length);
                    setHasMore(homeContent.public_creations.length >= 10);
                }
            }

            const userRole = tokenStats?.user?.role || currentUser.role;
            const isBusinessUser = userRole?.startsWith('business') || userRole === 'superadmin';
            const filteredTemplates = (templates || []).filter(t =>
                t.template_type !== 'business' || isBusinessUser
            );

            setMarketplaceTemplates(filteredTemplates);
            setCreations(creationsData.creations || []);
        } catch (error) {
            console.error("Failed to load dashboard", error);
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        loadData();

        const handleTokensUpdated = (event: CustomEvent<{ newBalance: number }>) => {
            const { newBalance } = event.detail;
            setUser(prev => prev ? ({
                ...prev,
                tokens_remaining: newBalance
            }) : null);
        };

        window.addEventListener('tokens-updated', handleTokensUpdated as EventListener);
        return () => window.removeEventListener('tokens-updated', handleTokensUpdated as EventListener);
    }, [loadData]);

    const handleDownload = async (item: any, userTier: string) => {
        try {
            if (item.type === 'video') {
                const proxyUrl = getProxyDownloadUrl(item.url, `community-${item.id}.mp4`);
                window.location.href = proxyUrl;
                return;
            }
            const optimizedUrl = getDownloadUrl(item.url, userTier);
            const proxyUrl = getProxyDownloadUrl(optimizedUrl, `community-${item.id}.webp`);
            window.location.href = proxyUrl;
            toast.success("Download started");
        } catch (e) {
            console.error("Download failed", e);
            window.open(item.url, '_blank');
        }
    };

    const handleReusePrompt = (item: any, remixMode: RemixMode = 'full') => {
        const optimizedSourceUrl = getProcessingUrl(item.url, 2048);
        const remixState = {
            prompt: item.prompt || '',
            templateId: item.template?.id || null,
            sourceImageUrl: optimizedSourceUrl,
            remixFrom: item.id,
            remixFromUsername: item.creator_username,
            model: item.model,
            view: 'create'
        };

        if (remixMode === 'video') {
            navigate('/creator/studio?view=create&mode=video', { state: remixState });
        } else if (remixMode === 'prompt') {
            navigate('/creator/studio?view=create&mode=image', { state: { prompt: item.prompt || '' } });
        } else {
            navigate('/creator/studio?view=create', { state: remixState });
        }
        setPreviewOpen(false);
    };

    const loadMorePublicCreations = useCallback(async () => {
        if (isFeedLoading || !hasMore) return;

        setIsFeedLoading(true);
        try {
            const moreCreations = await getPublicCreations({
                limit: FEED_LIMIT,
                offset: feedOffset
            });

            if (moreCreations.length < FEED_LIMIT) {
                setHasMore(false);
            }

            if (moreCreations.length > 0) {
                setPublicCreations(prev => {
                    const combined = [...prev, ...moreCreations];
                    const seen = new Set();
                    return combined.filter(c => {
                        if (seen.has(c.id)) return false;
                        seen.add(c.id);
                        return true;
                    });
                });
                setFeedOffset(prev => prev + moreCreations.length);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error("Error loading more public creations:", error);
        } finally {
            setIsFeedLoading(false);
        }
    }, [feedOffset, hasMore, isFeedLoading]);

    const homeState = useMemo(() => getCreatorHomeState(user, creations), [user, creations]);

    const featuredTemplates = useMemo(() =>
        getFeaturedTemplates(marketplaceTemplates, content?.featured_templates || []),
        [marketplaceTemplates, content?.featured_templates]);

    const imageOnlyCreations = useMemo(() =>
        publicCreations.filter(c => c.type !== 'video' && !isVideoUrl(c.image_url) && !c.is_adult)
        , [publicCreations]);

    return {
        user,
        content,
        marketplaceTemplates,
        creations,
        isLoading,
        publicCreations,
        isFeedLoading,
        hasMore,
        showAdultContent,
        setShowAdultContent,
        loadMorePublicCreations,
        homeState,
        featuredTemplates,
        imageOnlyCreations,
        isAdult,
        isMobileViewport,
        feedZoom,
        setFeedZoom,
        maxFeedColumns,
        previewOpen,
        setPreviewOpen,
        previewIndex,
        setPreviewIndex,
        handleDownload,
        handleReusePrompt
    };
}
