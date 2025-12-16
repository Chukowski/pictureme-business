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
import { PlanInsightsCard } from "@/components/home/PlanInsightsCard";
import { WhatsNewBlock } from "@/components/home/WhatsNewBlock";
import { RecommendedTemplates } from "@/components/home/RecommendedTemplates";
import { PublicFeedBlock } from "@/components/creator/PublicFeedBlock";
import { ENV } from "@/config/env";

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
  const [events, setEvents] = useState<EventConfig[]>([]);
  const [content, setContent] = useState<HomeContentResponse | null>(null);
  const [creations, setCreations] = useState<UserCreation[]>([]);
  const [pendingJobs, setPendingJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userMetadata, setUserMetadata] = useState<UserMetadata>({});

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

      const [userEvents, homeContent, tokenStats, creationsData, pendingData] = await Promise.all([
        getUserEvents().catch(() => []),
        getHomeContent('personal').catch(() => null),
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

      setEvents(userEvents);
      if (homeContent) setContent(homeContent);
      setCreations(creationsData.creations || []);
      setPendingJobs(pendingData.pending || []);

      // Load user metadata from localStorage
      const savedMeta = localStorage.getItem('creator_metadata');
      if (savedMeta) {
        try { setUserMetadata(JSON.parse(savedMeta)); } catch { }
      }

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
      {/* BENTO GRID DISCOVERY */}
      {/* ========================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 h-auto lg:h-[400px]">

        {/* 1. Featured Style (Large Vertical) - Span 1 Col */}
        <FeaturedStyleCard navigate={navigate} />

        {/* Center Column - Span 2 Cols */}
        {/* Recent Creations + Suggestions */}
        <div className="md:col-span-2 flex flex-col gap-6 h-full">
          {/* 2. Recent Creations (Horizontal) */}
          <RecentCreationsBento
            creations={recentCreations}
            hasCreations={hasCreations}
            navigate={navigate}
          />

          {/* Placeholder for Top Creators or New Block */}
          <div className="flex-1 bg-zinc-900/30 rounded-2xl border border-white/5 p-4 flex items-center justify-between group cursor-pointer hover:bg-zinc-900/50 transition-colors" onClick={() => navigate('/creator/feed')}>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-900"></div>
                ))}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Top Creators</h4>
                <p className="text-xs text-zinc-500">See who's trending this week</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
          </div>
        </div>

        {/* Right Column - Trending Tags & Community Challenge */}
        <div className="space-y-6 flex flex-col">
          {/* Trending Tags (Moved here) */}
          <TrendingTagsCard navigate={navigate} />

          {/* Community Challenge */}
          <div className="flex-1 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-2xl border border-white/5 p-5 relative overflow-hidden group cursor-pointer hover:border-indigo-500/30 transition-all">
            <div className="absolute top-0 right-0 p-3">
              <span className="text-[10px] font-bold text-indigo-400 bg-indigo-400/10 px-2 py-1 rounded-full uppercase tracking-wider">Weekly</span>
            </div>
            <div className="mt-6">
              <h3 className="text-lg font-bold text-white mb-1">Neon Portrait</h3>
              <p className="text-xs text-zinc-400 mb-4">Create a portrait with neon lighting.</p>
              <Button size="sm" variant="secondary" className="w-full text-xs h-8 bg-white/10 hover:bg-white/20 text-white border-0">
                Join Challenge
              </Button>
            </div>
          </div>
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
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-white mb-4">The Marketplace Feed</h2>
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
    <div className="relative w-full aspect-[21/9] md:aspect-[3/1] lg:aspect-[4/1] rounded-2xl overflow-hidden group bg-black">
      {/* Visual Proof Background (Collage/Video) */}
      <div className="absolute inset-0 opacity-40 z-0 select-none pointer-events-none">
        {creations.length > 0 ? (
          <div className="grid grid-cols-4 gap-0 w-full h-full">
            {creations.slice(0, 4).map((c, i) => (
              <div key={i} className="h-full relative overflow-hidden">
                <img src={c.url} className="w-full h-full object-cover grayscale mix-blend-luminosity hover:grayscale-0 transition-all duration-700 opacity-60" />
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center grayscale opacity-30"></div>
        )}
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent z-0"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-0"></div>

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-6">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-4 drop-shadow-2xl">
          Create iconic AI photos in seconds.
        </h1>
        <p className="text-zinc-400 text-sm md:text-base max-w-lg mb-8">
          The world's most advanced AI photobooth marketplace.
          {homeState === 'out_of_tokens' && <span className="block text-amber-400 mt-2">You are out of tokens. Upgrade to continue.</span>}
        </p>

        <Button
          size="lg"
          onClick={() => navigate(homeState === 'out_of_tokens' ? '/creator/settings?tab=billing' : '/creator/studio')}
          className="
                        rounded-full px-8 py-6 text-lg font-semibold 
                        bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500
                        shadow-lg shadow-indigo-900/50 hover:scale-105 transition-all
                        border border-white/10
                    "
        >
          <Sparkles className="w-5 h-5 mr-2 fill-white" />
          {homeState === 'active' ? 'Continue Creating' : 'Start Creating'}
        </Button>
      </div>
    </div>
  );
}

// =======================
// FEATURED STYLE CARD
// =======================
function FeaturedStyleCard({ navigate }: { navigate: (p: string) => void }) {
  return (
    <div
      onClick={() => navigate('/creator/templates')}
      className="group relative h-full min-h-[300px] rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-indigo-500/50 transition-all bg-zinc-900"
    >
      <img
        src="https://images.unsplash.com/photo-1620641788421-7f6c368615b8?q=80&w=2670&auto=format&fit=crop"
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        alt="Featured Style"
      />
      {/* Gradient Overlay for Text Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90"></div>

      <div className="absolute bottom-0 left-0 w-full p-6">
        <p className="text-xs font-bold text-indigo-400 mb-2 tracking-wider uppercase bg-black/50 backdrop-blur-md inline-block px-2 py-1 rounded">Featured Style</p>
        <h3 className="text-3xl font-bold text-white mb-2 leading-tight">Cyberpunk<br />Noir</h3>
        <p className="text-xs text-zinc-300 mb-4 line-clamp-2 max-w-[80%]">Neon lights, dark alleys, and futuristic vibes.</p>
        <div className="inline-flex items-center text-xs font-semibold text-white bg-white/10 px-4 py-2 rounded-full backdrop-blur-md group-hover:bg-white/20 transition-colors border border-white/10">
          Use Style <ArrowRight className="w-3 h-3 ml-1" />
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
    <div className="flex-[2] bg-zinc-900/50 rounded-2xl border border-white/5 p-6 relative overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-4 z-10">
        <div>
          <h3 className="text-lg font-semibold text-white">Your Recent Creations</h3>
          <p className="text-xs text-zinc-500">Ready to download</p>
        </div>
        {hasCreations && (
          <Button variant="ghost" size="sm" onClick={() => navigate('/creator/studio')} className="text-zinc-400 hover:text-white text-xs h-8">
            My Studio <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </div>

      {hasCreations ? (
        <div className="flex gap-4 h-full overflow-x-auto pb-1 scrollbar-hide z-10 items-stretch">
          {creations.map(c => (
            <div key={c.id} onClick={() => navigate('/creator/studio')} className="aspect-[3/4] h-full min-h-[140px] flex-shrink-0 rounded-xl overflow-hidden border border-white/5 cursor-pointer relative group hover:scale-[1.02] transition-transform bg-zinc-800">
              <img src={c.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" loading="lazy" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-white drop-shadow-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center z-10 bg-zinc-900/50 rounded-xl border border-white/5 border-dashed min-h-[140px]">
          <div className="text-center">
            <Image className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500 mb-3">No creations yet</p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate('/creator/studio')}
              className="text-xs bg-white/5 hover:bg-white/10 text-indigo-300 border border-white/5"
            >
              Start creating
            </Button>
          </div>
        </div>
      )}

      {/* Glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
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
  ];

  return (
    <div className="flex-1 bg-zinc-900/50 rounded-2xl border border-white/5 p-5 flex flex-col justify-center min-h-[140px]">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-pink-400" />
        <h3 className="text-sm font-semibold text-white">Trending Tags</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((t, i) => (
          <button key={i} onClick={() => navigate('/creator/templates')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 text-xs text-zinc-300 hover:text-white transition-colors">
            <t.icon className="w-3 h-3 opacity-60" />
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
// CREATORS GALLERY (Instagram-style Masonry)
// =======================
function CreatorsGallerySection({ creations, navigate }: { creations: any[]; navigate: (path: string) => void }) {
  if (!creations || creations.length === 0) {
    return (
      <div className="text-center py-12 bg-zinc-900/30 rounded-xl border border-white/5 border-dashed">
        <p className="text-zinc-500">Community gallery loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Masonry Grid - Instagram Style */}
      <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
        {creations.map((creation: any, index: number) => (
          <div
            key={creation.id || index}
            className="break-inside-avoid group relative rounded-xl overflow-hidden bg-zinc-900 border border-white/5 hover:border-white/20 transition-all cursor-pointer"
          >
            <img
              src={creation.image_url || creation.url}
              alt={creation.template_name || creation.prompt || ''}
              className="w-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
              loading="lazy"
            />

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Creator Avatar & Name */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-medium text-white overflow-hidden">
                  {creation.creator_username?.charAt(0)?.toUpperCase() || 'C'}
                </div>
                <span className="text-xs text-white/80 font-medium">
                  {creation.creator_username || 'Creator'}
                </span>
              </div>

              {/* Likes Badge */}
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
                <Heart className="w-3 h-3 text-white" />
                <span className="text-xs text-white">{creation.likes || 0}</span>
              </div>

              {/* Bottom Info */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-sm text-white font-medium line-clamp-1">
                  {creation.template_name || 'AI Creation'}
                </p>
                <p className="text-xs text-white/60 line-clamp-2 mt-1">
                  {creation.prompt || ''}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

