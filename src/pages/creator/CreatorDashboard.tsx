import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, getUserEvents, EventConfig, User, getTokenStats } from "@/services/eventsApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus, Image, ShoppingBag, Zap, Sparkles, ArrowRight, Camera,
  Play, RotateCcw, RefreshCw, Wand2, Store, Layout, Clock,
  TrendingUp, Heart, Eye, ChevronRight, Loader2, X, UserRound
} from "lucide-react";
import { getHomeContent, HomeContentResponse } from "@/services/contentApi";
import { getMarketplaceTemplates, MarketplaceTemplate } from "@/services/marketplaceApi";
import { PlanInsightsCard } from "@/components/home/PlanInsightsCard";
import { WhatsNewBlock } from "@/components/home/WhatsNewBlock";
import { RecommendedTemplates } from "@/components/home/RecommendedTemplates";
import { PublicFeedBlock } from "@/components/creator/PublicFeedBlock";
import { Badge } from "@/components/ui/badge";
import { ENV } from "@/config/env";
import { toast } from "sonner";

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
  const [user, setUser] = useState<User | null>(null);
  const [content, setContent] = useState<HomeContentResponse | null>(null);
  const [marketplaceTemplates, setMarketplaceTemplates] = useState<MarketplaceTemplate[]>([]);
  const [creations, setCreations] = useState<UserCreation[]>([]);
  const [pendingJobs, setPendingJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        navigate('/admin/auth');
        return;
      }

      const token = localStorage.getItem("auth_token");

      const [homeContent, templates, tokenStats, creationsData, pendingData] = await Promise.all([
        getHomeContent('personal').catch(() => null),
        getMarketplaceTemplates({ limit: 10 }).catch(() => []),
        getTokenStats().catch(() => null),
        // Fetch user's creations from API
        token ? fetch(`${ENV.API_URL}/api/creations`, {
          headers: { "Authorization": `Bearer ${token}` }
        }).then(r => r.ok ? r.json() : { creations: [] }).catch(() => ({ creations: [] })) : { creations: [] },
        // Fetch pending generations
        token ? fetch(`${ENV.API_URL}/api/generate/pending`, {
          headers: { "Authorization": `Bearer ${token}` }
        }).then(r => r.ok ? r.json() : { pending: [] }).catch(() => ({ pending: [] })) : { pending: [] }
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

      if (homeContent) setContent(homeContent);
      setMarketplaceTemplates(templates || []);
      setCreations(creationsData.creations || []);
      setPendingJobs(pendingData.pending || []);

    } catch (error) {
      console.error("Failed to load dashboard", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Compute home state
  const homeState = useMemo(() => getCreatorHomeState(user, creations), [user, creations]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const recentCreations = creations.slice(0, 3);
  const hasCreations = creations.length > 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 p-4 md:p-8 pb-32">

      {/* ========================= */}
      {/* HERO SECTION (Spotlight Carousel) */}
      {/* ========================= */}
      <HeroSection
        user={user}
        homeState={homeState}
        creations={creations.slice(0, 4)}
        navigate={navigate}
      />

      {/* ========================= */}
      {/* SECTION B: BENTO DASHBOARD GRID */}
      {/* ========================= */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Left Column: Featured Style (1 Col) */}
        <div className="lg:col-span-1 h-full min-h-[400px]">
          <FeaturedStyleCard navigate={navigate} template={marketplaceTemplates[0]} />
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
              <Button variant="link" className="text-indigo-400 text-xs p-0 h-auto" onClick={() => navigate('/creator/templates')}>View All</Button>
            </div>
            <RecommendedTemplates templates={marketplaceTemplates} />
          </div>
        </div>

        {/* Right Column: Trending & Challenges (1 Col) */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <TrendingTagsCard navigate={navigate} />
          <CommunityChallengeCard navigate={navigate} />
        </div>

      </div>

      {/* ========================= */}
      {/* PENDING GENERATIONS */}
      {/* ========================= */}
      {pendingJobs.length > 0 && (
        <PendingGenerationsSection pendingJobs={pendingJobs} />
      )}

      {/* ========================= */}
      {/* THE MARKETPLACE FEED */}
      {/* ========================= */}
      <div className="mt-10">
        <h2 className="text-xl font-bold text-white mb-6 tracking-tight">Feed</h2>
        <CreatorsGallerySection
          creations={content?.public_creations || []}
          navigate={navigate}
        />
      </div>

    </div>
  );
}

// =======================
// HERO SECTION
// =======================
function HeroSection({ user, homeState, creations, navigate }: { user: User | null; homeState: CreatorHomeState; creations: UserCreation[]; navigate: (path: string) => void }) {
  return (
    <div className="relative w-full aspect-[21/9] md:aspect-[2.5/1] rounded-2xl overflow-hidden group bg-[#050505] shadow-2xl shadow-black/50 border border-white/5">
      {/* Visual Proof Background (Collage/Video) */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none mix-blend-screen scale-105">
        <div className="grid grid-cols-4 gap-0 w-full h-full filter blur-[2px] opacity-50">
          {creations.length > 0 ? (
            creations.slice(0, 4).map((c, i) => (
              <div key={i} className="h-full relative overflow-hidden">
                <img src={c.url} className="w-full h-full object-cover" />
              </div>
            ))
          ) : (
            // Curated "Visual Proof" for new users
            <>
              <div className="h-full relative overflow-hidden"><img src="https://images.unsplash.com/photo-1620641788421-7f6c368615b8?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover" /></div>
              <div className="h-full relative overflow-hidden"><img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover" /></div>
              <div className="h-full relative overflow-hidden"><img src="https://images.unsplash.com/photo-1635322966219-b75ed3a93227?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover" /></div>
              <div className="h-full relative overflow-hidden"><img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover" /></div>
            </>
          )}
        </div>
      </div>

      {/* Gradient Overlays for Text Readability & Fade */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/70 to-transparent z-0"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent z-0"></div>

      <div className="absolute inset-0 z-10 flex flex-col items-start justify-center text-left p-8 md:p-12 pl-10 md:pl-16">
        <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-4 drop-shadow-[0_4px_10px_rgba(255,255,255,0.1)] max-w-2xl">
          Create iconic AI photos in seconds.
        </h1>
        <p className="text-[#CCCCCC] text-sm md:text-lg max-w-lg mb-8 font-medium shadow-black drop-shadow-md">
          The world's most advanced AI photobooth marketplace.
          {homeState === 'out_of_tokens' && <span className="block text-amber-400 mt-2 text-sm">You are out of tokens. Upgrade to continue.</span>}
        </p>

        <Button
          size="lg"
          onClick={() => navigate(homeState === 'out_of_tokens' ? '/creator/settings?tab=billing' : '/creator/studio')}
          className="
                        rounded-full px-8 py-6 text-base font-semibold 
                        bg-[#8b5cf6] hover:bg-[#7c3aed] text-white
                        shadow-[0_0_20px_rgba(139,92,246,0.5)] hover:shadow-[0_0_30px_rgba(139,92,246,0.7)]
                        hover:scale-105 transition-all duration-300
                        border border-white/10
                    "
        >
          {homeState === 'active' ? 'Continue Creating' : 'Start Creating'}
          <Sparkles className="w-5 h-5 ml-2 fill-white" />
        </Button>
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

function FeaturedStyleCard({ navigate, template }: { navigate: (p: string) => void, template?: MarketplaceTemplate }) {
  // Fallback to static if no template provided
  const bgImage = template?.preview_url || template?.preview_images?.[0] || "https://images.unsplash.com/photo-1635322966219-b75ed3a93227?q=80&w=2000&auto=format&fit=crop";
  const title = template?.name || "Cyberpunk Noir";
  const subtitle = template?.template_type ? `${template.template_type} Style` : "Neon lights, dark alleys, and futuristic vibes.";

  return (
    <div
      onClick={() => navigate(template ? `/creator/templates/${template.id}` : '/creator/templates')}
      className="group relative h-full min-h-[400px] rounded-2xl overflow-hidden cursor-pointer border border-white/10 bg-zinc-900 shadow-xl shadow-black/40"
    >
      <img
        src={bgImage}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        alt="Featured Style"
      />
      {/* Improved Gradient Overlay matching reference - Stronger bottom for text contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90 z-10"></div>

      <div className="absolute bottom-0 left-0 w-full p-6 z-20 flex flex-col justify-end h-full">
        <div className="mt-auto">
          <Badge variant="secondary" className="mb-3 bg-indigo-500/20 text-indigo-300 border-indigo-500/30 backdrop-blur-md">FEATURED STYLE</Badge>
          <h3 className="text-4xl lg:text-5xl font-bold text-white mb-2 leading-none tracking-tight drop-shadow-lg">{title}</h3>
          <p className="text-base text-zinc-300 font-medium opacity-90 drop-shadow-md mb-6 leading-relaxed max-w-[80%] line-clamp-3">{subtitle}</p>

          <button className="
                      flex items-center gap-2 px-6 py-3
                      bg-white/10 hover:bg-white/20 backdrop-blur-md 
                      border border-white/20 rounded-full 
                      text-white text-sm font-semibold 
                  ">
            Use Style <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
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
        <span onClick={() => navigate('/creator/studio')} className="text-xs text-zinc-400 cursor-pointer hover:text-white flex items-center gap-1">
          My Studio <ChevronRight className="w-3 h-3" />
        </span>
      </div>

      {hasCreations ? (
        <div className="grid grid-cols-4 gap-3 h-auto z-10">
          {creations.slice(0, 4).map(c => (
            <div key={c.id} onClick={() => navigate('/creator/studio')} className="aspect-square rounded-xl overflow-hidden border border-white/5 cursor-pointer relative group/item hover:scale-[1.02] transition-transform bg-zinc-800 shadow-md">
              <img src={c.url} className="w-full h-full object-cover opacity-90 group-hover/item:opacity-100 transition-opacity" loading="lazy" />
            </div>
          ))}
          {/* Fillers if less than 4 */}
          {[...Array(Math.max(0, 4 - creations.length))].map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square rounded-xl bg-zinc-800/50 border border-white/5 flex items-center justify-center">
              <Image className="w-5 h-5 text-zinc-700" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center z-10 bg-zinc-900/50 rounded-xl border border-white/5 border-dashed mt-0">
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
function TrendingTagsCard({ navigate }: { navigate: (p: string) => void }) {
  const tags = [
    { label: "Polaroid", icon: Camera },
    { label: "Lego", icon: Layout },
    { label: "Anime", icon: Sparkles },
    { label: "Headshot", icon: UserRound },
    { label: "Cyberpunk", icon: Zap },
    { label: "Studio", icon: Image },
    { label: "Retro", icon: Clock },
  ];

  return (
    <div className="flex-shrink-0 bg-[#1A1A1A] rounded-2xl border border-white/5 p-5 flex flex-col group shadow-lg">
      <div className="flex items-center justify-between mb-4 w-full cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/creator/templates')}>
        <h3 className="text-lg font-semibold text-white tracking-wide">Tags</h3>
        <ChevronRight className="w-5 h-5 text-zinc-500" />
      </div>

      <div className="flex flex-wrap gap-2 content-start">
        {tags.map((t, i) => (
          <button key={i} onClick={() => navigate('/creator/templates')} className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 text-sm text-zinc-300 hover:text-white transition-all transform hover:scale-105 hover:shadow-md">
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
// MARKETPLACE FEED (Remix Engine)
// =======================
function CreatorsGallerySection({ creations, navigate }: { creations: any[]; navigate: (path: string, options?: any) => void }) {
  if (!creations || creations.length === 0) {
    return (
      <div className="text-center py-12 bg-zinc-900/30 rounded-xl border border-white/5 border-dashed">
        <p className="text-zinc-500">Marketplace loading...</p>
      </div>
    );
  }

  const handleImageClick = (creation: any, e: React.MouseEvent) => {
    e.stopPropagation();
    // Navigate to the creator's public profile
    // Use slug > username > user_id as fallback chain
    const creatorIdentifier = creation.creator_slug || creation.creator_username || creation.creator_user_id;
    if (creatorIdentifier) {
      navigate(`/profile/${creatorIdentifier}`);
    } else {
      // No identifier available, show toast
      toast.error("Creator profile not available");
    }
  };

  const handleRemixClick = (creation: any, e: React.MouseEvent) => {
    e.stopPropagation();
    // Navigate to creator studio with prompt and template pre-filled
    const remixState = {
      prompt: creation.prompt || '',
      templateId: creation.template_id || null,
      templateUrl: creation.template_url || null,
      sourceImageUrl: creation.image_url || creation.url || null,
      remixFrom: creation.id,
    };
    navigate('/creator/create', { state: remixState });
  };

  return (
    <div className="space-y-4">
      {/* Masonry Grid - 3 Columns as requested */}
      <div className="columns-1 md:columns-3 gap-4 space-y-4">
        {creations.map((creation: any, index: number) => (
          <div
            key={creation.id || index}
            className="break-inside-avoid group relative rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 hover:border-white/20 transition-all cursor-pointer shadow-lg"
            onClick={(e) => handleImageClick(creation, e)}
          >
            <img
              src={creation.image_url || creation.url}
              alt={creation.template_name || creation.prompt || ''}
              className="w-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
              loading="lazy"
            />

            {/* Gradient Overlay (Always visible at bottom, stronger on hover) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>

            {/* Content Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between z-20">
              {/* Creator Info */}
              <div
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(e) => handleImageClick(creation, e)}
              >
                <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden border border-white/20">
                  {creation.creator_avatar ? (
                    <img src={creation.creator_avatar} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold text-white">
                      {creation.creator_username?.charAt(0)?.toUpperCase() || 'C'}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium text-white/90 shadow-black drop-shadow-md">
                  @{creation.creator_username || 'Creator'}
                </span>
              </div>

              {/* Remix Button */}
              <button
                className="
                  flex items-center gap-1.5 px-3 py-1.5 
                  bg-white/10 hover:bg-white/20 backdrop-blur-md 
                  border border-white/20 rounded-full 
                  text-white text-[10px] font-bold uppercase tracking-wider
                  transition-all duration-300 hover:scale-105 group-hover:bg-white/25
               "
                onClick={(e) => handleRemixClick(creation, e)}
              >
                Remix <Zap className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              </button>
            </div>
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
