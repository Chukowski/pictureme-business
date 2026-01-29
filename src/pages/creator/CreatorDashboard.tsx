import { useState, useEffect, useMemo, useRef } from "react";
import { SEO } from "@/components/SEO";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, getUserEvents, EventConfig, User, getTokenStats, toggleLike } from "@/services/eventsApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus, Image, ShoppingBag, Zap, Sparkles, ArrowRight, Camera,
  Play, RotateCcw, RefreshCw, Wand2, Store, Layout, Clock,
  TrendingUp, Heart, Eye, ChevronRight, Loader2, X, UserRound, Video, Megaphone
} from "lucide-react";
import { WhatsNewCard } from "@/components/dashboard/WhatsNewCard";
import { motion, AnimatePresence } from "framer-motion";
import { getHomeContent, HomeContentResponse, getPublicCreations, PublicCreation, FeaturedTemplate } from "@/services/contentApi";
import { getMarketplaceTemplates, MarketplaceTemplate } from "@/services/marketplaceApi";
import { PlanInsightsCard } from "@/components/home/PlanInsightsCard";
import { WhatsNewBlock } from "@/components/home/WhatsNewBlock";
import { RecommendedTemplates } from "@/components/home/RecommendedTemplates";
import { PublicFeedBlock } from "@/components/creator/PublicFeedBlock";
import { Badge } from "@/components/ui/badge";
import { ENV } from "@/config/env";
import { toast } from "sonner";
import { CreationDetailView, GalleryItem } from "@/components/creator/CreationDetailView";
// CDN service for public content (Cloudflare Image Resizing)
import { getFeedUrl as getFeedImageUrl, getAvatarUrl, getThumbnailUrl, getViewUrl, getDownloadUrl, getProcessingUrl, getProxyDownloadUrl, getMediaPreviewUrl, getMediaFeedUrl, isVideoUrl } from "@/services/cdn";
import { cn, isUserAdult } from "@/lib/utils";
import { useUserTier } from "@/services/userTier";
import { Slider } from "@/components/ui/slider";


// ... existing types ...


// =======================
// MARKETPLACE FEED CARD (Private Component)
// =======================
// =======================
// MARKETPLACE FEED CARD (Private Component)
// =======================
function MarketplaceFeedCard({ creation, onImageClick, onRemixClick, showBlurred = false }: { creation: any, onImageClick: (e: React.MouseEvent) => void, onRemixClick: (e: React.MouseEvent, mode?: 'full' | 'video' | 'prompt') => void, showBlurred?: boolean }) {
  const isHero = creation.is_hero || false;

  const [likes, setLikes] = useState(creation.likes || 0);
  const [isLiked, setIsLiked] = useState(creation.is_liked || false);
  const [isLiking, setIsLiking] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isBlurred, setIsBlurred] = useState(showBlurred);
  const remixRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (expanded && remixRef.current && !remixRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    if (expanded) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [expanded]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Check auth
    if (!localStorage.getItem("auth_token")) {
      toast.error("Please login to like");
      return;
    }

    if (isLiking) return;
    setIsLiking(true);

    // Optimistic
    const prevLikes = likes;
    const prevIsLiked = isLiked;
    setLikes(prev => isLiked ? prev - 1 : prev + 1);
    setIsLiked(!isLiked);

    try {
      const res = await toggleLike(creation.id);
      if (!res.success) throw new Error("Failed");
    } catch (error) {
      console.error(error);
      setLikes(prevLikes);
      setIsLiked(prevIsLiked);
      toast.error("Failed to update like");
    } finally {
      setIsLiking(false);
    }
  };

  // Determine if this is a video and get the proper preview URL
  const isVideo = creation.type === 'video' || isVideoUrl(creation.image_url || creation.url);
  const previewUrl = getMediaFeedUrl({
    url: creation.image_url || creation.url,
    type: creation.type,
    thumbnail_url: creation.thumbnail_url,
    previewUrl: creation.previewUrl
  }, 600);

  return (
    <div
      className="break-inside-avoid group relative rounded-2xl overflow-hidden bg-card border border-white/5 hover:border-white/20 transition-all cursor-pointer shadow-lg aspect-[4/5] h-min"
      onClick={isBlurred ? undefined : onImageClick}
    >
      {/* Video indicator badge */}
      {isVideo && (
        <div className="absolute top-3 left-3 z-30 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-md">
          <Play className="w-3 h-3 text-white fill-white" />
        </div>
      )}

      {/* 18+ Badge */}
      {creation.is_adult && (
        <div className="absolute top-3 right-3 z-30 px-2 py-1 bg-red-500/80 backdrop-blur-sm rounded-md">
          <span className="text-white text-[10px] font-black">18+</span>
        </div>
      )}

      {/* Preview image (works for both images and videos) */}
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={creation.template_name || creation.prompt || ''}
          className={cn(
            "w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500",
            isBlurred && "blur-2xl"
          )}
          loading={isHero ? "eager" : "lazy"}
          decoding="async"
        />
      ) : (
        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
          <Play className="w-8 h-8 text-zinc-600" />
        </div>
      )}

      {/* Blur Overlay for 18+ content */}
      {isBlurred && (
        <div 
          className="absolute inset-0 backdrop-blur-2xl bg-black/40 flex flex-col items-center justify-center z-40 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setIsBlurred(false);
          }}
        >
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-4 border-2 border-red-500/50">
            <span className="text-red-400 font-black text-2xl">18+</span>
          </div>
          <p className="text-sm font-bold uppercase tracking-widest text-white/90 mb-1">Adult Content</p>
          <p className="text-xs text-white/60">Click to view</p>
        </div>
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#101112]/90 via-[#101112]/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>

      {/* Like Button (Top Right) */}
      <div className="absolute top-3 right-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleLike}
          className="p-2 rounded-full bg-[#101112]/40 backdrop-blur-md hover:bg-[#101112]/60 transition-colors border border-white/10"
        >
          <Heart className={`w-4 h-4 ${isLiked ? "fill-pink-500 text-pink-500" : "text-white"}`} />
        </button>
      </div>

      {/* Like Count (visible on hover or if liked) */}
      {(likes > 0 || isLiked) && (
        <div className="absolute top-3 right-3 z-20 pointer-events-none group-hover:opacity-0 transition-opacity">
          <Badge variant="secondary" className="bg-[#101112]/30 backdrop-blur-sm hover:bg-[#101112]/40 border-0 gap-1 pl-1.5 pr-2 h-8">
            <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-pink-500 text-pink-500" : "text-white"}`} />
            <span className="text-xs font-medium text-white">{likes}</span>
          </Badge>
        </div>
      )}

      {/* Content Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between z-20">
        {/* Creator Info */}
        <div
          className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity flex-1 min-w-0"
          onClick={onImageClick}
        >
          <div className="w-6 h-6 shrink-0 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden border border-white/20">
            {creation.creator_avatar ? (
              <img src={getAvatarUrl(creation.creator_avatar, 48)} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold text-white">
                {creation.creator_username?.charAt(0)?.toUpperCase() || 'C'}
              </span>
            )}
          </div>
          <div className="flex flex-col truncate">
            <span className="text-xs font-medium text-white/90 shadow-black drop-shadow-md truncate">
              @{creation.creator_username || 'Creator'}
            </span>
            {creation.parent_username && (
              <span className="text-[9px] font-bold text-[#D1F349] opacity-90 truncate">
                remixed from @{creation.parent_username}
              </span>
            )}
          </div>
        </div>

        {/* Dash Actions Group */}
        <div
          ref={remixRef}
          className="flex items-center gap-1.5 p-1 relative z-30 group/remix"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (expanded) {
                onRemixClick(e);
              } else {
                setExpanded(true);
              }
            }}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-lg",
              expanded ? "bg-white/10 text-white" : "bg-[#D1F349] text-black"
            )}
            title={expanded ? "Full Remix" : "Remix Options"}
          >
            {expanded ? <RefreshCw className="w-4 h-4 animate-spin-slow" /> : <Wand2 className="w-4 h-4" />}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="flex items-center gap-1.5 overflow-hidden"
              >
                <div className="w-px h-4 bg-white/10 mx-0.5" />

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemixClick(e, 'video');
                  }}
                  className="p-1.5 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all"
                  title="Remix to Video"
                >
                  <Video className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemixClick(e, 'prompt');
                  }}
                  className="p-1.5 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all transition-all"
                  title="Restore Prompt"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}


// =======================
// MARKETPLACE FEED (Remix Engine)
// =======================
function CreatorsGallerySection({ creations, onImageClick, onRemixClick, columnsCount = 3, showAdultContent = false }: {
  creations: any[];
  onImageClick: (creation: any, index: number) => void;
  onRemixClick: (creation: any, mode?: 'full' | 'video' | 'prompt') => void;
  columnsCount?: number;
  showAdultContent?: boolean;
}) {
  const currentUser = getCurrentUser();
  const isAdult = isUserAdult(currentUser?.birth_date);

  // Filter out 18+ content if toggle is off
  const filteredCreations = showAdultContent
    ? creations 
    : creations.filter(c => !c.is_adult);

  if (!filteredCreations || filteredCreations.length === 0) {
    return (
      <div className="text-center py-12 bg-card/30 rounded-xl border border-white/5 border-dashed">
        <p className="text-zinc-500">
          {creations.length > 0 && !showAdultContent 
            ? isAdult
              ? "All content is marked as 18+. Enable the filter to view."
              : "Some content is hidden based on your account age restrictions."
            : "Marketplace loading..."}
        </p>
      </div>
    );
  }

  // Custom stable masonry layout based on columnsCount
  const columns: any[][] = Array.from({ length: columnsCount }, () => []);
  filteredCreations.forEach((item, i) => {
    columns[i % columnsCount].push(item);
  });

  return (
    <div
      className="grid gap-4 pb-4"
      style={{
        gridTemplateColumns: `repeat(${columnsCount}, minmax(0, 1fr))`
      }}
    >
      {columns.map((colItems, colIndex) => (
        <div key={colIndex} className="flex flex-col gap-4">
          {colItems.map((creation) => (
            <MarketplaceFeedCard
              key={creation.id}
              creation={creation}
              showBlurred={creation.is_adult && showAdultContent}
              onImageClick={(e) => {
                e.stopPropagation();
                // Find visible index in original array if needed, or pass object
                onImageClick(creation, creations.findIndex(c => c.id === creation.id));
              }}
              onRemixClick={(e, mode = 'full') => {
                e.stopPropagation();
                onRemixClick(creation, mode);
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// =======================
// TYPES
// =======================

type CreatorHomeState = 'idle' | 'active' | 'exploring' | 'out_of_tokens';

interface UserCreation {
  id: number;
  url: string;
  thumbnail_url?: string;
  type: string;
  prompt?: string;
  model?: string;
  model_id?: string;
  aspect_ratio?: string;
  created_at: string;
  is_published?: boolean;
  visibility?: string;
}

interface UserMetadata {
  last_prompt?: string;
  last_model?: string;
  last_mode?: 'image' | 'video';
  last_creation_id?: number;
}

// =======================
// HELPER: Get Creator Home State
// =======================

function getCreatorHomeState(user: User | null, creations: UserCreation[]): CreatorHomeState {
  if (!user) return 'idle';

  const tokens = user.tokens_remaining ?? 0;
  const hasRecentCreations = creations.length > 0;
  const recentCreationAge = hasRecentCreations
    ? (Date.now() - new Date(creations[0]?.created_at).getTime()) / (1000 * 60 * 60) // hours
    : Infinity;

  // Out of tokens - push marketplace/upgrade
  if (tokens <= 0) {
    return 'out_of_tokens';
  }

  // Active creator - created something in last 24 hours
  if (hasRecentCreations && recentCreationAge < 24) {
    return 'active';
  }

  // Has tokens but hasn't created recently - encourage creating
  if (tokens > 0 && !hasRecentCreations) {
    return 'idle';
  }

  // Has creations but not recent - exploring/returning user
  return 'exploring';
}

// =======================
// MAIN COMPONENT
// =======================

export default function CreatorDashboard() {
  const navigate = useNavigate();
  const { tier: userTier } = useUserTier();
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
  const [feedZoom, setFeedZoom] = useState(() => {
    // Default to 2 columns on mobile, 3 on desktop
    if (typeof window !== 'undefined' && window.innerWidth < 768) return [2];
    return [3];
  });
  const [showAdultContent, setShowAdultContent] = useState(false);
  const FEED_LIMIT = 12;

  // Community Feed Preview State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const isAdult = isUserAdult(user?.birth_date);

  useEffect(() => {
    loadData();

    const handleTokensUpdated = (event: any) => {
      const { newBalance } = event.detail;
      setUser(prev => prev ? ({
        ...prev,
        tokens_remaining: newBalance
      }) : null);
    };

    window.addEventListener('tokens-updated', handleTokensUpdated);
    return () => window.removeEventListener('tokens-updated', handleTokensUpdated);
  }, []);

  const loadData = async () => {
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
        // Fetch user's creations from API (limit to 20 most recent)
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
  };

  const loadMorePublicCreations = async () => {
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
  };

  // Compute home state
  const homeState = useMemo(() => getCreatorHomeState(user, creations), [user, creations]);

  // Compute featured templates
  const featuredTemplates = useMemo(() =>
    getFeaturedTemplates(marketplaceTemplates, content?.featured_templates || []),
    [marketplaceTemplates, content?.featured_templates]);

  // Filter public creations for image-only for the hero section, EXCLUDING 18+ content
  const imageOnlyCreations = useMemo(() =>
    publicCreations.filter(c => c.type !== 'video' && !isVideoUrl(c.image_url) && !c.is_adult)
    , [publicCreations]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const recentCreations = creations.slice(0, 4);
  const hasCreations = creations.length > 0;

  return (
    <>
      <SEO
        title="Creator Dashboard"
        description="Manage your AI creative assets, browse templates, and create stunning new identities."
      />
      <div className="space-y-6 md:space-y-12 animate-in fade-in duration-500 p-4 md:p-12 pt-0 md:pt-4 pb-32">

        {/* ========================= */}
        {/* HERO SECTION (Spotlight Carousel) */}
        {/* ========================= */}
        <HeroSection
          user={user}
          homeState={homeState}
          publicCreations={imageOnlyCreations.slice(0, 6)} // Pass filtered creations
          navigate={navigate}
        />

        {/* Announcements for Creators */}
        <div className="w-full">
          <WhatsNewCard userType="personal" />
        </div>

        {/* ========================= */}
        {/* SECTION B: BENTO DASHBOARD GRID */}
        {/* ========================= */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Left Column: Featured Style (1 Col) */}
          <div className="lg:col-span-1 h-full">
            <FeaturedStyleCard navigate={navigate} templates={featuredTemplates} user={user} />
          </div>

          {/* Middle Column: Recent Creations & Marketplace (2 Cols) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <RecentCreationsBento
              creations={recentCreations}
              hasCreations={hasCreations}
              navigate={navigate}
            />

            <div className="bg-[#1A1A1A] rounded-2xl border border-white/5 p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-white tracking-wide">Explore Templates</h3>
                <Button variant="link" className="text-indigo-400 text-xs p-0 h-auto" onClick={() => navigate('/creator/marketplace')}>View All</Button>
              </div>
              <RecommendedTemplates templates={marketplaceTemplates} />
            </div>
          </div>

          {/* Right Column: Trending & Tags (1 Col) */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <TrendingTagsCard navigate={navigate} templates={marketplaceTemplates} />
            <CommunityChallengeCard navigate={navigate} />
          </div>

        </div>

        {/* ========================= */}
        {/* PENDING GENERATIONS */}
        {/* ========================= */}
        {/* Removed standalone PendingGenerationsSection as it's now in Hero Bar */}

        {/* ========================= */}
        {/* THE MARKETPLACE FEED */}
        {/* ========================= */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white tracking-tight">Feed</h2>

            <div className="flex items-center gap-4">
              {/* 18+ Filter Toggle */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-card/50 rounded-xl border border-white/5">
                <span className="text-xs text-zinc-400 font-medium">Show 18+</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAdultContent}
                    onChange={(e) => setShowAdultContent(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
                </label>
              </div>

              {/* Zoom Slider */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-card/50 rounded-xl border border-white/5">
                <Layout className="w-3.5 h-3.5 text-zinc-500" />
                <div className="w-24">
                  <Slider
                    value={feedZoom}
                    onValueChange={setFeedZoom}
                    min={2}
                    max={6}
                    step={1}
                    className="[&_.bg-primary]:bg-[#D1F349] [&_.border-primary]:border-[#D1F349]"
                  />
                </div>
                <span className="text-[10px] font-bold text-zinc-500 w-4">{feedZoom[0]}</span>
              </div>
            </div>
          </div>

          <CreatorsGallerySection
            creations={publicCreations}
            columnsCount={feedZoom[0]}
            showAdultContent={showAdultContent}
            onImageClick={(creation, index) => {
              setPreviewIndex(index);
              setPreviewOpen(true);
            }}
            onRemixClick={(creation, remixMode = 'full') => {
              // Use imgproxy-processed URL for remix to avoid 413 errors
              const optimizedSourceUrl = creation.image_url
                ? getProcessingUrl(creation.image_url, 2048)
                : null;

              const remixState = {
                prompt: creation.prompt || '',
                templateId: creation.template_id || null,
                sourceImageUrl: optimizedSourceUrl,
                remixFrom: creation.id,
                remixFromUsername: creation.creator_username,
                model: creation.model_id || creation.model,
                view: 'create' // Intent for Studio to open in create mode
              };

              // Check for custom remixMode passed from the card
              if (remixMode === 'video') {
                navigate('/creator/studio?view=create&mode=video', { state: remixState });
              } else if (remixMode === 'prompt') {
                navigate('/creator/studio?view=create&mode=image', { state: { prompt: creation.prompt || '' } });
              } else {
                navigate('/creator/studio?view=create', { state: remixState });
              }
            }}
          />

          {/* Infinite Scroll Trigger - only render if there's more to load */}
          {/* Infinite Scroll & Loading Combined - Stable Container */}
          {hasMore && (
            <div
              className="py-12 flex justify-center w-full min-h-[80px]"
              ref={(el) => {
                if (!el || isFeedLoading) return; // Don't re-observe if already loading
                const observer = new IntersectionObserver(
                  (entries) => {
                    if (entries[0].isIntersecting && !isFeedLoading) {
                      loadMorePublicCreations();
                    }
                  },
                  { threshold: 0.1 }
                );
                observer.observe(el);
                // Note: cleanup happens when hasMore becomes false and element unmounts
              }}
            >
              {isFeedLoading ? (
                <div className="flex items-center gap-2 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-[#D1F349]" />
                  <span className="text-xs font-bold uppercase tracking-widest text-[#D1F349]">Loading more...</span>
                </div>
              ) : (
                <div className="w-full h-1 bg-transparent" />
              )}
            </div>
          )}
        </div>

      </div>

      {/* Immersive Community Preview */}
      <CreationDetailView
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        items={publicCreations.map(c => ({
          ...c,
          url: c.image_url,
          previewUrl: c.thumbnail_url || c.image_url,
          type: c.type || 'image',
          prompt: c.prompt,
          model: c.model,
          creator_avatar: c.creator_avatar,
          creator_username: c.creator_username,
          creator_slug: c.creator_slug,
          isOwner: false,
          parent_id: c.parent_id,
          parent_username: c.parent_username
        })) as GalleryItem[]}
        initialIndex={previewIndex}
        onDownload={async (item) => {
          try {
            if (item.type === 'video') {
              const proxyUrl = getProxyDownloadUrl(item.url, `community-${item.id}.mp4`);
              window.location.href = proxyUrl;
              return;
            }

            // 1. Get optimized imgproxy URL
            const optimizedUrl = getDownloadUrl(item.url, userTier);

            // 2. Wrap in backend proxy to force download header
            const proxyUrl = getProxyDownloadUrl(optimizedUrl, `community-${item.id}.webp`);

            // 3. Trigger download
            window.location.href = proxyUrl;

            toast.success("Download started");
          } catch (e) {
            console.error("Download failed", e);
            window.open(item.url, '_blank');
          }
        }}
        onReusePrompt={(item, remixMode = 'full') => {
          setPreviewOpen(false);
          // Standardize state keys to match public feed remix behavior
          // Use item.url directly if it's already an optimized imgproxy url or wrap it
          const optimizedSourceUrl = getProcessingUrl(item.url, 2048);

          const remixState = {
            prompt: item.prompt || '',
            templateId: item.template?.id || null, // Works for both flat and nested template objects
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
        }}
        onDelete={undefined}
        onTogglePublic={undefined}
      />
    </>
  );
}

// =======================
// HERO SECTION
// =======================
function HeroSection({ user, homeState, publicCreations, navigate }: { user: User | null; homeState: CreatorHomeState; publicCreations: any[]; navigate: (path: string) => void }) {
  return (
    <div className="flex flex-col gap-3 mt-4 md:mt-0">
      <div className="relative w-full aspect-[3/2] md:aspect-[4/1] rounded-3xl overflow-hidden group bg-[#080808] shadow-2xl shadow-black/50 border border-white/5">
        <div className="absolute inset-0 z-0 select-none pointer-events-none scale-105">
          <div className="grid grid-cols-4 md:grid-cols-12 grid-rows-2 gap-2 w-full h-full opacity-60 p-2">
            {publicCreations.length > 0 ? (
              <>
                {/* Hero Grid PATTERN (Higgs Style) */}
                {/* Image 1: Top Left Big */}
                {publicCreations[0] && (
                  <div className="col-span-2 row-span-2 md:col-span-4 md:row-span-2 relative overflow-hidden rounded-2xl">
                    <img src={getFeedImageUrl(publicCreations[0]?.image_url, 800)} className="w-full h-full object-cover" />
                  </div>
                )}
                {/* Image 2: Top Right Long */}
                {publicCreations[1] && (
                  <div className="col-span-2 row-span-1 md:col-span-5 md:row-span-1 relative overflow-hidden rounded-2xl">
                    <img src={getFeedImageUrl(publicCreations[1]?.image_url, 800)} className="w-full h-full object-cover" />
                  </div>
                )}
                {/* Image 3: Center Bottom Block */}
                {publicCreations[2] && (
                  <div className="col-span-2 row-span-1 md:col-span-3 md:row-span-1 relative overflow-hidden rounded-2xl">
                    <img src={getFeedImageUrl(publicCreations[2]?.image_url, 800)} className="w-full h-full object-cover" />
                  </div>
                )}
                {/* Image 4: Right Bento Tile */}
                {publicCreations[3] && (
                  <div className="hidden md:block md:col-span-3 md:row-span-2 relative overflow-hidden rounded-2xl">
                    <img src={getFeedImageUrl(publicCreations[3]?.image_url, 800)} className="w-full h-full object-cover" />
                  </div>
                )}
                {/* Image 5: Remaining Bottom Bento */}
                {publicCreations[4] && (
                  <div className="hidden md:block md:col-span-3 md:row-span-1 relative overflow-hidden rounded-2xl">
                    <img src={getFeedImageUrl(publicCreations[4]?.image_url, 800)} className="w-full h-full object-cover" />
                  </div>
                )}
              </>
            ) : (
              // Curated "Visual Proof" Fallback (Bento Pattern)
              <>
                <div className="col-span-2 row-span-2 md:col-span-4 md:row-span-2 relative overflow-hidden rounded-2xl">
                  <img src={getFeedImageUrl("https://images.unsplash.com/photo-1620641788421-7f6c368615b8?q=80&w=800&auto=format&fit=crop", 800)} className="w-full h-full object-cover" />
                </div>
                <div className="col-span-2 row-span-1 md:col-span-5 md:row-span-1 relative overflow-hidden rounded-2xl">
                  <img src={getFeedImageUrl("https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=800&auto=format&fit=crop", 800)} className="w-full h-full object-cover" />
                </div>
                <div className="hidden md:block md:col-span-3 md:row-span-2 relative overflow-hidden rounded-2xl">
                  <img src={getFeedImageUrl("https://images.unsplash.com/photo-1635322966219-b75ed3a93227?q=80&w=800&auto=format&fit=crop", 800)} className="w-full h-full object-cover" />
                </div>
                <div className="col-span-2 row-span-1 md:col-span-3 md:row-span-1 relative overflow-hidden rounded-2xl">
                  <img src={getFeedImageUrl("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop", 800)} className="w-full h-full object-cover" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Gradient Overlays for Text Readability & Fade */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#080808] via-[#080808]/70 to-transparent z-0"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#080808]/20 via-transparent to-transparent z-0 md:hidden"></div>

        <div className="absolute w-full h-full z-10 flex flex-row items-center justify-between px-6 md:px-16 pt-2">
          <div className="flex flex-col items-start text-left max-w-[65%] md:max-w-[70%]">
            <h1 className="text-xl md:text-5xl font-black text-white tracking-tighter mb-0.5 md:mb-1 drop-shadow-2xl leading-[1.1]">
              Create iconic AI photos.
            </h1>
            <p className="text-[#AAAAAA] text-[10px] md:text-lg font-bold shadow-black drop-shadow-lg uppercase tracking-[0.15em]">
              The world's most advanced AI marketplace.
              {homeState === 'out_of_tokens' && <span className="block text-amber-400 mt-0.5 text-[8px] md:text-sm normal-case tracking-normal">Out of tokens. Upgrade to continue.</span>}
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => navigate(homeState === 'out_of_tokens' ? '/creator/settings?tab=billing' : '/creator/studio?view=create')}
            className="
                          relative -top-1 md:top-0
                          rounded-full px-4 md:px-10 py-2.5 md:py-7 text-[11px] md:text-lg font-black uppercase tracking-widest
                          bg-[#D1F349] hover:bg-[#b9d941] text-black
                          shadow-[0_8px_25px_rgba(209,243,73,0.3)] hover:shadow-[0_12px_35px_rgba(209,243,73,0.4)]
                          hover:scale-105 active:scale-95 transition-all duration-300
                          border border-white/10 shrink-0
                      "
          >
            {homeState === 'active' ? 'GO' : 'GO'}
            <ChevronRight className="w-3 h-3 md:w-6 md:h-6 ml-1 md:ml-1 font-black" />
          </Button>
        </div>
      </div>

    </div>
  );
}

// =======================
// FEATURED STYLE CARD
// =======================
// =======================
// FEATURED STYLE CARD
// =======================

// Helper to select featured templates based on weighted score:
// 1. Admin Featured (explicitly set in CMS) - prioritized
// 2. Manual ('featured' tag) - prioritized
// 3. Promoted ('promoted' tag) - randomized/rotated
// 4. Score (70% downloads weight + 30% rating weight) - top performers
function getFeaturedTemplates(templates: MarketplaceTemplate[], adminFeatured: FeaturedTemplate[] = []): MarketplaceTemplate[] {
  if (!templates || templates.length === 0) return [];

  // 0. Admin Featured (Explicit overrides)
  const adminIds = new Set(adminFeatured.map(f => f.template_id));
  const adminPicks = templates.filter(t => adminIds.has(t.id));

  // 1. Tagged Featured
  const taggedFeatured = templates.filter(t =>
    !adminIds.has(t.id) && // Avoid duplicates
    t.tags?.some(tag => tag.toLowerCase() === 'featured')
  );

  // 2. Tagged Promoted
  const taggedPromoted = templates.filter(t =>
    !adminIds.has(t.id) &&
    t.tags?.some(tag => tag.toLowerCase() === 'promoted')
  );

  // 3. Top Performers (exclude already picked)
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

  // Combine unique templates (Admin -> Featured -> Promoted -> Top)
  const combined = [...adminPicks, ...taggedFeatured, ...taggedPromoted, ...topPerformers];

  // Deduplicate by ID just in case
  const unique = combined.filter((template, index, self) =>
    index === self.findIndex((t) => t.id === template.id)
  );

  // Limit to 5 total to rotate
  return unique.slice(0, 5);
}

function FeaturedStyleCard({ navigate, templates, user }: { navigate: (p: string, options?: any) => void, templates: MarketplaceTemplate[], user: User | null }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleUseStyle = (template: MarketplaceTemplate) => {
    const isFree = (template.price === 0 || !template.price) && (template.tokens_cost === 0 || !template.tokens_cost);
    const isCreator = template.creator_id === user?.id;
    const canUse = template.is_owned || isFree || isCreator;

    if (canUse) {
      navigate('/creator/studio?view=create', { state: { view: 'create', selectedTemplate: template } });
    } else {
      toast.info("Purchase template to use", {
        description: `This style costs ${template.tokens_cost || template.price} tokens. Redirecting to marketplace...`
      });
      navigate(`/creator/marketplace?templateId=${template.id}`);
    }
  };

  // Rotate templates every 8 seconds
  useEffect(() => {
    if (!templates || templates.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % templates.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [templates]);

  if (!templates || templates.length === 0) return null;

  const template = templates[currentIndex];
  // Safe access for fallback
  const bgImage = template.preview_url || template.preview_images?.[0] || template.backgrounds?.[0] || (template as any).images?.[0];
  const title = template.name;
  const creatorName = template.creator?.name || "Pictureme.now";
  // Attempt to use creator avatar if available on the template object (depends on API)
  const creatorAvatar = (template as any).creator?.avatar_url;

  const tokenCost = template.tokens_cost ?? 0;
  const moneyCost = template.price ?? 0;
  const isFree = tokenCost === 0 && moneyCost === 0;

  return (
    <div
      className="group relative w-full h-[240px] md:h-full md:min-h-[400px] rounded-2xl overflow-hidden cursor-pointer border border-white/10 bg-card shadow-xl shadow-black/40 transition-all hover:border-white/20 select-none"
      onClick={() => handleUseStyle(template)}
    >
      {/* Background Image with Crossfade Transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={template.id}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          <img
            src={getFeedImageUrl(bgImage || '', 800)}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-[10s] ease-linear group-hover:scale-110"
          />
        </motion.div>
      </AnimatePresence>

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#101112] via-[#101112]/40 to-transparent opacity-90 z-10"></div>

      {/* Cost Badge (Top Right) */}
      <div className="absolute top-4 right-4 z-30">
        {isFree ? (
          <span className="px-3 py-1 rounded-full bg-emerald-500 text-black text-[10px] font-black uppercase tracking-wider shadow-lg">
            Free
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full bg-[#D1F349] text-black text-[10px] font-black uppercase tracking-wider shadow-lg">
            {(() => {
              const parts = [];
              if (tokenCost > 0) parts.push(`${tokenCost} Tokens`);
              if (moneyCost > 0) parts.push(`$${moneyCost}`);
              return parts.join(' + ');
            })()}
          </span>
        )}
      </div>

      {/* Progress Indicators (if multiple) */}
      {templates.length > 1 && (
        <div className="absolute top-4 left-0 right-0 z-30 flex justify-center gap-1.5 px-6">
          {templates.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                idx === currentIndex ? "w-6 bg-white" : "w-1.5 bg-white/30"
              )}
            />
          ))}
        </div>
      )}

      {/* Content Container */}
      <div className="absolute inset-0 p-5 md:p-6 z-20 flex flex-col justify-end">

        {/* Badge */}
        <div className="mb-2 md:mb-3">
          <Badge variant="secondary" className="bg-white/10 text-white backdrop-blur-md border-white/10 text-[10px] md:text-xs font-bold tracking-wider uppercase px-2 py-0.5 md:py-1 animate-in fade-in slide-in-from-bottom-2 duration-500">
            Featured Style
          </Badge>
        </div>

        {/* Title */}
        <motion.div
          key={`title-${template.id}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-1 md:mb-2 leading-none tracking-tight drop-shadow-lg line-clamp-2">
            {title}
          </h3>
        </motion.div>

        {/* Creator Byline */}
        <motion.div
          key={`creator-${template.id}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center gap-2 mb-4 md:mb-6"
        >
          {creatorAvatar && (
            <img src={getAvatarUrl(creatorAvatar, 32)} className="w-5 h-5 rounded-full border border-white/20" />
          )}
          <span className="text-xs md:text-sm text-zinc-300 font-medium drop-shadow-md">
            by {creatorName}
          </span>
        </motion.div>

        {/* CTA Button */}
        <button className="
            flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 w-fit
            bg-white text-black hover:bg-zinc-200
            rounded-full
            text-xs md:text-sm font-bold
            transition-all duration-300 transform group-hover:translate-x-1 shadow-lg
        ">
          Use Style <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
        </button>
      </div>
    </div>
  );
}

// =======================
// INFINITE SCROLL TRIGGER
// =======================
function InfiniteScrollTrigger({ onIntersect, isLoading }: { onIntersect: () => void; isLoading: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver((entries) => {
      // Only trigger if visible AND not currently loading
      if (entries[0].isIntersecting && !isLoadingRef.current) {
        onIntersect();
      }
    }, { threshold: 0.1 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [onIntersect]);

  return (
    <div className="py-8 flex justify-center" ref={ref}>
      {isLoading && (
        <div className="flex items-center gap-2 text-zinc-500 animate-pulse">
          <div className="w-2 h-2 rounded-full bg-[#D1F349]" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#D1F349]">Loading...</span>
        </div>
      )}
    </div>
  );
}

// =======================
// END OF FEED INDICATOR
// =======================
function EndOfFeedIndicator() {
  return (
    <div className="py-8 flex justify-center">
      <span className="text-xs text-zinc-600 uppercase tracking-widest">You've reached the end</span>
    </div>
  );
}

// =======================
// RECENT CREATIONS BENTO
// =======================
function RecentCreationsBento({ creations, hasCreations, navigate }: { creations: UserCreation[], hasCreations: boolean, navigate: (p: string) => void }) {
  return (
    <div className="bg-[#1A1A1A] rounded-2xl border border-white/5 p-5 relative overflow-hidden flex flex-col group shadow-lg h-auto">
      <div className="flex items-center justify-between mb-4 z-10 w-full">
        <h3 className="text-lg font-semibold text-white tracking-wide">Your Recent Creations</h3>
        <span onClick={() => navigate('/creator/studio?view=gallery')} className="text-xs text-zinc-400 cursor-pointer hover:text-white flex items-center gap-1">
          My Studio <ChevronRight className="w-3 h-3" />
        </span>
      </div>

      {hasCreations ? (
        <div className="grid grid-cols-4 gap-3 h-auto z-10">
          {creations.slice(0, 4).map(c => {
            const isVideo = c.type === 'video' || isVideoUrl(c.url);
            const previewSrc = getMediaPreviewUrl({ url: c.url, type: c.type as 'image' | 'video', thumbnail_url: c.thumbnail_url }, 200);

            return (
              <div key={c.id} onClick={() => navigate('/creator/studio?view=gallery')} className="aspect-square rounded-xl overflow-hidden border border-white/5 cursor-pointer relative group/item hover:scale-[1.02] transition-transform bg-zinc-800 shadow-md">
                {/* Video badge */}
                {isVideo && (
                  <div className="absolute top-1.5 left-1.5 z-10 p-1 bg-black/50 backdrop-blur-sm rounded">
                    <Play className="w-2.5 h-2.5 text-white fill-white" />
                  </div>
                )}
                {previewSrc ? (
                  <img src={previewSrc} className="w-full h-full object-cover opacity-90 group-hover/item:opacity-100 transition-opacity" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                    <Play className="w-6 h-6 text-zinc-600" />
                  </div>
                )}
              </div>
            );
          })}
          {/* Fillers if less than 4 */}
          {[...Array(Math.max(0, 4 - creations.length))].map((_, i) => (
            <div
              key={`empty-${i}`}
              onClick={() => navigate('/creator/studio')}
              className="aspect-square rounded-xl bg-zinc-800/20 border border-white/5 border-dashed flex items-center justify-center cursor-pointer hover:bg-zinc-800/40 transition-all group/empty"
            >
              <Plus className="w-5 h-5 text-zinc-700 group-hover/empty:text-[#D1F349] transition-transform group-hover/empty:scale-110" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center z-10 bg-card/50 rounded-xl border border-white/5 border-dashed mt-0">
          <div className="text-center p-4">
            <div className="w-12 h-12 rounded-full bg-zinc-800 mx-auto flex items-center justify-center mb-3">
              <Camera className="w-5 h-5 text-zinc-500" />
            </div>
            <p className="text-sm text-zinc-400 mb-4">No creations yet. Start your journey.</p>
            <Button
              variant="outline"
              className="rounded-full border-white/10 bg-white/5 hover:bg-white/10 text-white hover:text-white"
              onClick={() => navigate('/creator/studio')}
            >
              Start Creating
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// =======================
// TRENDING TAGS CARD
// =======================
function TrendingTagsCard({ navigate, templates }: { navigate: (p: string) => void, templates: MarketplaceTemplate[] }) {
  const dynamicTags = useMemo(() => {
    if (!templates || templates.length === 0) return [];

    // Aggregate tags
    const tagCounts: Record<string, number> = {};
    templates.forEach(t => {
      (t.tags || []).forEach(tag => {
        const normalized = tag.toLowerCase().trim();
        if (normalized === 'featured' || normalized === 'promoted') return;
        tagCounts[normalized] = (tagCounts[normalized] || 0) + 1;
      });
    });

    // Sort by frequency and take top 8
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label]) => {
        // Map common tags to icons
        let icon = Sparkles;
        if (label.includes('camera') || label.includes('photo') || label.includes('polaroid')) icon = Camera;
        if (label.includes('lego') || label.includes('blocks')) icon = Layout;
        if (label.includes('anime') || label.includes('comic')) icon = Sparkles;
        if (label.includes('user') || label.includes('headshot') || label.includes('person')) icon = UserRound;
        if (label.includes('cyber') || label.includes('neon') || label.includes('tech')) icon = Zap;
        if (label.includes('art') || label.includes('paint') || label.includes('studio')) icon = Image;
        if (label.includes('old') || label.includes('retro') || label.includes('time')) icon = Clock;
        if (label.includes('star') || label.includes('galaxy') || label.includes('space')) icon = Sparkles;

        return { label: label.charAt(0).toUpperCase() + label.slice(1), icon };
      });
  }, [templates]);

  // Fallback if no templates or tags found
  const tags = dynamicTags.length > 0 ? dynamicTags : [
    { label: "Polaroid", icon: Camera },
    { label: "Lego", icon: Layout },
    { label: "Anime", icon: Sparkles },
    { label: "Headshot", icon: UserRound },
    { label: "Cyberpunk", icon: Zap }
  ];

  return (
    <div className="flex-shrink-0 bg-[#1A1A1A] rounded-2xl border border-white/5 p-5 flex flex-col group shadow-lg min-h-[160px]">
      <div className="flex items-center justify-between mb-4 w-full cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/creator/marketplace')}>
        <h3 className="text-lg font-semibold text-white tracking-wide">Popular Tags</h3>
        <ChevronRight className="w-5 h-5 text-zinc-500" />
      </div>

      <div className="flex flex-wrap gap-2 content-start">
        {tags.map((t, i) => (
          <button
            key={i}
            onClick={() => navigate(`/creator/marketplace?search=${encodeURIComponent(t.label)}`)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 text-sm text-zinc-300 hover:text-white transition-all transform hover:scale-105 hover:shadow-md"
          >
            <t.icon className="w-3.5 h-3.5 opacity-70" />
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}


// =======================
// PENDING GENERATIONS
// =======================
function PendingGenerationsSection({ pendingJobs }: { pendingJobs: any[] }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white flex items-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
        Generating...
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {pendingJobs.map((job) => (
          <div key={job.id} className="aspect-square rounded-xl bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-white/10 flex flex-col items-center justify-center p-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-indigo-400 animate-spin"></div>
              <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
            <p className="mt-3 text-xs text-white/60 text-center line-clamp-2">{job.prompt || 'Processing...'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}




// =======================
// COMMUNITY CHALLENGE CARD (New)
// =======================
function CommunityChallengeCard({ navigate }: { navigate: (p: string) => void }) {
  return (
    <div className="flex-1 min-h-[180px] bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-2xl border border-indigo-500/20 p-5 flex flex-col relative overflow-hidden group cursor-pointer" onClick={() => navigate('/creator/challenges')}>
      {/* Abstract shapes */}
      <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl"></div>
      <div className="absolute bottom-[-10px] left-[-10px] w-20 h-20 bg-purple-500/20 rounded-full blur-xl"></div>

      <div className="flex items-center justify-between mb-3 relative z-10">
        <Badge variant="secondary" className="bg-indigo-500 text-white border-0 text-[10px] uppercase font-bold tracking-wider">
          Weekly Challenge
        </Badge>
        <span className="text-xs text-indigo-300 font-medium flex items-center gap-1">
          <Clock className="w-3 h-3" /> 2d left
        </span>
      </div>

      <h3 className="text-xl font-bold text-white mb-1 relative z-10">
        "Space Odyssey"
      </h3>
      <p className="text-xs text-indigo-200/70 mb-4 line-clamp-2 relative z-10">
        Create a sci-fi masterpiece featuring nebulae and astronauts.
      </p>

      <div className="mt-auto flex items-center justify-between relative z-10">
        <div className="flex -space-x-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-900 flex items-center justify-center text-[8px] text-white font-bold">
              {String.fromCharCode(64 + i)}
            </div>
          ))}
          <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-900 flex items-center justify-center text-[8px] text-white font-bold pl-1">
            +42
          </div>
        </div>
        <Button size="sm" className="h-7 text-xs bg-white text-indigo-900 hover:bg-indigo-50 font-semibold">Join</Button>
      </div>
    </div>
  );
}
