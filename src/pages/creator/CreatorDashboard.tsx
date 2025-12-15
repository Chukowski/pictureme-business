import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, getUserEvents, EventConfig, User, getTokenStats } from "@/services/eventsApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Image, ShoppingBag, Zap, Sparkles, ArrowRight, Camera } from "lucide-react";
import { getHomeContent, HomeContentResponse } from "@/services/contentApi";
import { PlanInsightsCard } from "@/components/home/PlanInsightsCard";
import { WhatsNewBlock } from "@/components/home/WhatsNewBlock";
import { CreatorSmartOnboarding } from "@/components/creator/CreatorSmartOnboarding";
import { RecommendedTemplates } from "@/components/home/RecommendedTemplates";
import { PublicFeedBlock } from "@/components/creator/PublicFeedBlock";

export default function CreatorDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<EventConfig[]>([]);
  const [content, setContent] = useState<HomeContentResponse | null>(null);
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

      const [userEvents, homeContent, tokenStats] = await Promise.all([
        getUserEvents().catch(() => []),
        getHomeContent('personal').catch(() => null),
        getTokenStats().catch(() => null)
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
    } catch (error) {
      console.error("Failed to load dashboard", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const recentEvents = events.slice(0, 3);
  const personalBooth = events.length > 0 ? events[0] : null;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 p-4 md:p-8 pb-20 md:pb-8">

      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
            Welcome, {user?.full_name?.split(' ')[0] || user?.username}
          </h1>
          <p className="text-zinc-400 mt-1 text-sm md:text-base">Ready to create something amazing today?</p>
        </div>

        {/* Hidden on mobile because we have the floating FAB in the bottom nav */}
        <div className="hidden md:flex items-center gap-4">
          <Button
            onClick={() => navigate('/creator/studio')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 shadow-lg shadow-indigo-900/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Creation
          </Button>
        </div>
      </div>

      {/* Smart Onboarding */}
      <CreatorSmartOnboarding events={events} />

      {/* Quick Actions (Shortcuts) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ShortcutCard
          icon={Zap}
          label="Quick Create"
          desc="Start from scratch"
          color="text-amber-400"
          bg="bg-amber-500/10"
          onClick={() => navigate('/creator/studio')}
        />
        <ShortcutCard
          icon={Image}
          label="My Booth"
          desc="View your gallery"
          color="text-indigo-400"
          bg="bg-indigo-500/10"
          onClick={() => navigate('/creator/studio')}
        />
        <ShortcutCard
          icon={ShoppingBag}
          label="Marketplace"
          desc="Get new styles"
          color="text-purple-400"
          bg="bg-purple-500/10"
          onClick={() => navigate('/creator/templates')}
        />
        <ShortcutCard
          icon={Sparkles}
          label="Inspiration"
          desc="See what's trending"
          color="text-pink-400"
          bg="bg-pink-500/10"
          onClick={() => navigate('/creator/templates?tab=trending')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

        {/* Left Column: Personal Booth & Recent Activity */}
        <div className="lg:col-span-2 space-y-8">

          {/* Personal Booth Direct Access */}
          {personalBooth && (
            <Card className="bg-zinc-900 border-white/10 overflow-hidden relative group cursor-pointer hover:border-indigo-500/30 transition-colors" onClick={() => navigate(`/creator/studio`)}>
              <div className="absolute top-0 right-0 p-4">
                <Badge className="bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20">Active</Badge>
              </div>
              <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center relative z-10">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                  <Camera className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div className="flex-1 w-full">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-1">Your Personal Booth</h3>
                  <p className="text-zinc-400 text-sm mb-3">
                    {personalBooth.title} • {new Date(personalBooth.start_date || Date.now()).toLocaleDateString()}
                  </p>
                  <div className="flex gap-3">
                    <Button size="sm" className="bg-white text-black hover:bg-zinc-200">
                      Open Booth
                    </Button>
                    <Button size="sm" variant="outline" className="border-white/10 hover:bg-white/5" onClick={(e) => {
                      e.stopPropagation();
                      navigate('/creator/studio');
                    }}>
                      View All
                    </Button>
                  </div>
                </div>
              </CardContent>
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/10 to-transparent pointer-events-none" />
            </Card>
          )}

          {/* Recent Creations Feed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Your Recent Creations</h2>
            </div>

            {recentEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentEvents.map(event => (
                  <Card key={event._id} className="bg-zinc-900 border-white/5 hover:border-white/10 transition-all cursor-pointer group" onClick={() => navigate(`/creator/studio`)}>
                    <CardContent className="p-0 relative aspect-video">
                      {/* Cover Image Placeholder */}
                      <div className="absolute inset-0 bg-zinc-800 rounded-t-lg overflow-hidden">
                        {event.branding?.logoPath ? (
                          <img src={event.branding.logoPath} className="w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity" alt={event.title} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                            <Image className="w-10 h-10 text-zinc-700" />
                          </div>
                        )}
                      </div>
                      <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/90 to-transparent pt-10">
                        <h3 className="font-semibold text-white">{event.title}</h3>
                        <p className="text-xs text-zinc-400">{new Date(event.start_date || Date.now()).toLocaleDateString()}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-zinc-900/30 rounded-xl border border-white/5 border-dashed">
                <p className="text-zinc-500">No creations yet. Your masterpieces will appear here.</p>
              </div>
            )}
          </div>

          {/* Public Community Feed */}
          {content?.public_creations && content.public_creations.length > 0 && (
            <PublicFeedBlock creations={content.public_creations} />
          )}

          {/* Recommended Templates */}
          <RecommendedTemplates content={content} />
        </div>

        {/* Right Column: Plan & Updates */}
        <div className="space-y-6">

          {/* Current Plan */}
          <PlanInsightsCard user={user} />

          {/* What's New */}
          <div className="h-[400px]">
            <WhatsNewBlock content={content} />
          </div>

        </div>
      </div>
    </div>
  );
}

function ShortcutCard({ icon: Icon, label, desc, color, bg, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start p-4 bg-zinc-900 border border-white/5 rounded-xl hover:border-white/10 hover:bg-zinc-800/80 transition-all text-left group"
    >
      <div className={`p-2.5 rounded-lg ${bg} ${color} mb-3 group-hover:scale-110 transition-transform`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-semibold text-white text-sm">{label}</h3>
      <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
    </button>
  );
}

function Badge({ children, className, variant }: any) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}
