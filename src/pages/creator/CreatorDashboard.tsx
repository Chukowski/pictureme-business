import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, getUserEvents, EventConfig, User, getTokenStats } from "@/services/eventsApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus, Image, ShoppingBag, Zap, Sparkles, ArrowRight, Camera,
  Play, RotateCcw, RefreshCw, Wand2, Store, Layout, Clock,
  TrendingUp, Heart, Eye, ChevronRight, Loader2, X
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

  const recentCreations = creations.slice(0, 6);
  const hasCreations = creations.length > 0;
  const lastCreation = creations[0] || null;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 p-4 md:p-8 pb-24 md:pb-8">

      {/* ========================= */}
      {/* HERO SECTION - STATE AWARE */}
      {/* ========================= */}
      <HeroSection
        user={user}
        homeState={homeState}
        lastCreation={lastCreation}
        userMetadata={userMetadata}
        navigate={navigate}
      />

      {/* ========================= */}
      {/* QUICK ACTIONS - CONTEXT AWARE */}
      {/* ========================= */}
      <QuickActionsSection
        homeState={homeState}
        lastCreation={lastCreation}
        userMetadata={userMetadata}
        navigate={navigate}
      />

      {/* ========================= */}
      {/* TWO COLUMN LAYOUT */}
      {/* Left: Community Gallery (Main) | Right: My Creations & Info */}
      {/* ========================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

        {/* ========================= */}
        {/* LEFT/CENTER COLUMN: COMMUNITY GALLERY (Instagram-style) */}
        {/* ========================= */}
        <div className="lg:col-span-2 space-y-6">

          {/* Pending Generations (Processing) */}
          {pendingJobs.length > 0 && (
            <PendingGenerationsSection pendingJobs={pendingJobs} />
          )}

          {/* Creators Gallery - Instagram-style Masonry */}
          <CreatorsGallerySection
            creations={content?.public_creations || []}
            navigate={navigate}
          />

        </div>

        {/* ========================= */}
        {/* RIGHT COLUMN: MY CREATIONS & INFO */}
        {/* ========================= */}
        <div className="space-y-6">

          {/* Current Plan & Tokens */}
          <PlanInsightsCard user={user} />

          {/* My Recent Creations (Compact Card) */}
          <MyCreationsCard
            creations={recentCreations}
            hasCreations={hasCreations}
            navigate={navigate}
          />

          {/* What's New */}
          <div className="h-[300px]">
            <WhatsNewBlock content={content} />
          </div>

        </div>
      </div>

      {/* ========================= */}
      {/* BOTTOM: MARKETPLACE HIGHLIGHTS */}
      {/* ========================= */}
      <RecommendedTemplates content={content} />

    </div>
  );
}

// =======================
// HERO SECTION COMPONENT
// =======================

function HeroSection({ user, homeState, lastCreation, userMetadata, navigate }: {
  user: User | null;
  homeState: CreatorHomeState;
  lastCreation: UserCreation | null;
  userMetadata: UserMetadata;
  navigate: (path: string) => void;
}) {
  const tokens = user?.tokens_remaining ?? 0;

  // Dynamic content based on state
  const heroContent = {
    idle: {
      title: `Ready to create, ${user?.full_name?.split(' ')[0] || user?.username}?`,
      subtitle: "Transform your photos into stunning AI art",
      cta: "Start Creating",
      ctaIcon: Sparkles,
      ctaAction: () => navigate('/creator/studio'),
      ctaVariant: "primary" as const,
      showTokens: true
    },
    active: {
      title: `Welcome back, ${user?.full_name?.split(' ')[0]}!`,
      subtitle: "Continue where you left off or try something new",
      cta: "Continue Creating",
      ctaIcon: Play,
      ctaAction: () => navigate('/creator/studio'),
      ctaVariant: "primary" as const,
      showTokens: true
    },
    exploring: {
      title: `Good to see you, ${user?.full_name?.split(' ')[0]}!`,
      subtitle: "Discover new styles or remix your favorites",
      cta: "Explore Templates",
      ctaIcon: Store,
      ctaAction: () => navigate('/creator/templates'),
      ctaVariant: "secondary" as const,
      showTokens: true
    },
    out_of_tokens: {
      title: "You're out of tokens",
      subtitle: "Get more tokens to continue creating amazing content",
      cta: "Get More Tokens",
      ctaIcon: Zap,
      ctaAction: () => navigate('/creator/settings?tab=billing'),
      ctaVariant: "upgrade" as const,
      showTokens: false
    }
  };

  const h = heroContent[homeState];
  const Icon = h.ctaIcon;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900/40 via-purple-900/30 to-zinc-900 border border-white/10 p-6 md:p-8">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
            {h.title}
          </h1>
          <p className="text-zinc-400 mt-2 text-sm md:text-base max-w-lg">
            {h.subtitle}
          </p>

          {h.showTokens && tokens > 0 && (
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-zinc-300">
                <span className="font-semibold text-white">{tokens.toLocaleString()}</span> tokens available
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={h.ctaAction}
            className={`
                            rounded-full px-6 py-3 text-base font-semibold shadow-lg transition-all
                            ${h.ctaVariant === 'primary' ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-900/30' : ''}
                            ${h.ctaVariant === 'secondary' ? 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm' : ''}
                            ${h.ctaVariant === 'upgrade' ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black shadow-amber-900/30' : ''}
                        `}
          >
            <Icon className="w-5 h-5 mr-2" />
            {h.cta}
          </Button>

          {homeState === 'active' && (
            <Button
              onClick={() => navigate('/creator/templates')}
              variant="outline"
              className="rounded-full border-white/20 hover:bg-white/10"
            >
              <Store className="w-4 h-4 mr-2" />
              Browse Styles
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// =======================
// QUICK ACTIONS SECTION
// =======================

function QuickActionsSection({ homeState, lastCreation, userMetadata, navigate }: {
  homeState: CreatorHomeState;
  lastCreation: UserCreation | null;
  userMetadata: UserMetadata;
  navigate: (path: string) => void;
}) {
  const actions = [
    {
      icon: Wand2,
      label: "Create New",
      desc: "Start fresh",
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      action: () => navigate('/creator/studio'),
      show: true
    },
    {
      icon: RotateCcw,
      label: "Reuse Prompt",
      desc: userMetadata.last_prompt ? "Continue last" : "No recent",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      action: () => navigate('/creator/studio?reuse=true'),
      show: !!userMetadata.last_prompt,
      disabled: !userMetadata.last_prompt
    },
    {
      icon: RefreshCw,
      label: "Remix Creation",
      desc: "New variation",
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      action: () => lastCreation ? navigate(`/creator/studio?remix=${lastCreation.id}`) : navigate('/creator/studio'),
      show: !!lastCreation
    },
    {
      icon: Camera,
      label: "Launch Booth",
      desc: "Share mode",
      color: "text-green-400",
      bg: "bg-green-500/10",
      action: () => navigate('/creator/booth'),
      show: true
    },
    {
      icon: ShoppingBag,
      label: "Marketplace",
      desc: "Get styles",
      color: "text-pink-400",
      bg: "bg-pink-500/10",
      action: () => navigate('/creator/templates'),
      show: true
    },
    {
      icon: Layout,
      label: "My Gallery",
      desc: "All creations",
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      action: () => navigate('/creator/studio'),
      show: true
    }
  ];

  const visibleActions = actions.filter(a => a.show !== false);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Quick Actions</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {visibleActions.map((action, i) => (
          <button
            key={i}
            onClick={action.disabled ? undefined : action.action}
            disabled={action.disabled}
            className={`
                            flex flex-col items-center p-4 bg-zinc-900 border border-white/5 rounded-xl 
                            transition-all text-center group
                            ${action.disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:border-white/10 hover:bg-zinc-800/80 cursor-pointer'}
                        `}
          >
            <div className={`p-2.5 rounded-lg ${action.bg} ${action.color} mb-2 group-hover:scale-110 transition-transform`}>
              <action.icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-xs">{action.label}</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">{action.desc}</p>
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
// RECENT CREATIONS SECTION
// =======================

function RecentCreationsSection({ creations, hasCreations, navigate }: {
  creations: UserCreation[];
  hasCreations: boolean;
  navigate: (path: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Your Recent Creations</h2>
        {hasCreations && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/creator/studio')}
            className="text-zinc-400 hover:text-white"
          >
            View All <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>

      {hasCreations ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {creations.map((creation) => (
            <div
              key={creation.id}
              onClick={() => navigate('/creator/studio')}
              className="group relative aspect-square rounded-xl overflow-hidden bg-zinc-900 border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer"
            >
              {creation.url ? (
                <img
                  src={creation.url}
                  alt={creation.prompt || 'Creation'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                  <Image className="w-8 h-8 text-zinc-600" />
                </div>
              )}

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                <p className="text-xs text-white/80 line-clamp-2">{creation.prompt}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-zinc-400">{creation.model_id || creation.model}</span>
                  {creation.is_published && (
                    <span className="text-[10px] text-green-400 flex items-center gap-1">
                      <Eye className="w-3 h-3" /> Public
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-zinc-900/30 rounded-2xl border border-white/5 border-dashed">
          <div className="max-w-sm mx-auto space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">No creations yet</h3>
            <p className="text-sm text-zinc-400">
              Your AI-generated masterpieces will appear here. Ready to create your first?
            </p>
            <Button
              onClick={() => navigate('/creator/studio')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First
            </Button>
          </div>
        </div>
      )}
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Creators Gallery</h2>
          <p className="text-sm text-zinc-400 mt-0.5">Explore creations from the community</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/creator/feed')}
          className="text-zinc-400 hover:text-white"
        >
          See All <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

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

// =======================
// MY CREATIONS CARD (Sidebar)
// =======================

function MyCreationsCard({ creations, hasCreations, navigate }: {
  creations: UserCreation[];
  hasCreations: boolean;
  navigate: (path: string) => void;
}) {
  return (
    <Card className="bg-zinc-900 border-white/10">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Image className="w-4 h-4 text-indigo-400" />
            My Creations
          </h3>
          {hasCreations && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/creator/studio')}
              className="text-zinc-400 hover:text-white text-xs"
            >
              View All
            </Button>
          )}
        </div>

        {hasCreations ? (
          <div className="grid grid-cols-2 gap-2">
            {creations.slice(0, 4).map((creation) => (
              <div
                key={creation.id}
                onClick={() => navigate('/creator/studio')}
                className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer bg-zinc-800"
              >
                {creation.url ? (
                  <img
                    src={creation.url}
                    alt={creation.prompt || 'Creation'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-6 h-6 text-zinc-600" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Eye className="w-4 h-4 text-white" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-zinc-500 mb-3">No creations yet</p>
            <Button
              size="sm"
              onClick={() => navigate('/creator/studio')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Create First
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

