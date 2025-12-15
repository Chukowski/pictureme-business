import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getTokenStats, getUserEvents, getCurrentUser, type User, type EventConfig } from "@/services/eventsApi";
import { getHomeContent, type HomeContentResponse } from "@/services/contentApi";

// Components
import { UniversalActionBar } from "@/components/home/UniversalActionBar";
import { LiveEventCard } from "@/components/home/LiveEventCard";
import { SmartOnboarding } from "@/components/home/SmartOnboarding";
import { ActivitySystemBlock } from "@/components/home/ActivitySystemBlock";
import { ToolsGrid } from "@/components/home/ToolsGrid";
import { PlanInsightsCard } from "@/components/home/PlanInsightsCard";
import { WhatsNewBlock } from "@/components/home/WhatsNewBlock";
import { RecommendedTemplates } from "@/components/home/RecommendedTemplates";
import { DeveloperToolsCard } from "@/components/home/DeveloperToolsCard";
import { CommunityHighlightsCard } from "@/components/home/CommunityHighlightsCard";
import { Button } from "@/components/ui/button";
import { Crown, Check, ArrowRight } from "lucide-react";

export default function HomeDashboard() {
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

      // Parallel fetch: user events, home content, and FRESH token stats
      const [userEvents, homeContent, tokenStats] = await Promise.all([
        getUserEvents(),
        getHomeContent(currentUser.role?.startsWith('business') ? 'business' : 'personal'),
        getTokenStats().catch(() => null) // Fetch fresh token stats
      ]).catch(async (e) => {
        console.error("Error fetching content:", e);
        const events = await getUserEvents().catch(() => []);
        return [events, null, null] as const;
      });

      // Merge fresh token stats into user object
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
      if (homeContent) {
        setContent(homeContent);
      }
    } catch (error) {
      console.error("Failed to load home data", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Find active event for "Live" card
  const activeEvent = events.find(e => e.is_active);
  const isBusinessUser = user?.role?.startsWith('business') && user.role !== 'business_pending';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black text-white p-6 md:p-8 pt-24 md:pt-28 overflow-hidden">
      {/* Background Layers */}
      <div className="absolute inset-0 bg-black -z-20" />
      <div className="absolute top-0 left-0 w-full h-[520px] bg-gradient-to-b from-indigo-900/25 via-black/50 to-black pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-full h-[320px] bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">

        {/* HEADER SECTION */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                Welcome back, {user?.full_name?.split(' ')[0] || user?.username || 'Creator'}
              </h1>
              <p className="text-sm text-zinc-500">Here's what's happening with your events today.</p>
            </div>
            {/* Universal Action Bar (Moved here for better alignment) */}
            <UniversalActionBar activeEvent={activeEvent} isBusinessUser={isBusinessUser} />
          </div>
        </div>

        {/* SMART ONBOARDING (Conditional) */}
        <SmartOnboarding events={events} />

        {/* LIVE EVENT CARD (Conditional) */}
        {activeEvent && <LiveEventCard event={activeEvent} />}

        {/* MAIN GRID LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT COLUMN (Primary: Stats, Tools, Activity) - Spans 8/12 */}
          <div className="lg:col-span-8 space-y-8">

            {/* Tools Grid */}
            <ToolsGrid activeEvent={activeEvent} isBusinessUser={isBusinessUser} />

            {/* Recommended Templates Slider */}
            <RecommendedTemplates content={content} />

            {/* Activity & System Combined Block */}
            <ActivitySystemBlock events={events} isLoading={isLoading} user={user} />

          </div>

          {/* RIGHT COLUMN (Secondary: Insights, Updates) - Spans 4/12 */}
          <div className="lg:col-span-4 space-y-6">

            {/* Plan & Tokens Insight */}
            <PlanInsightsCard user={user} />

            {/* What's New Feed (Tabbed) */}
            <div className="h-[400px]">
              <WhatsNewBlock content={content} />
            </div>

            {/* Developer Tools (Business Only) */}
            <DeveloperToolsCard user={user} />

            {/* Community Highlights (optional, only if content exists) */}
            <CommunityHighlightsCard content={content} />

          </div>
        </div>
      </div>

      {/* Payment Activation Modal (Force for new business users) */}
      {isBusinessUser && user?.subscription_status !== 'active' && user?.subscription_status !== 'trialing' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-indigo-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

            <div className="text-center space-y-4 relative z-10">
              <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto border border-indigo-500/20">
                <Crown className="w-8 h-8 text-indigo-400" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Welcome to Business Tier! 🎉</h2>
                <p className="text-zinc-400">
                  Your application has been approved. To unlock your new features, unlimited events, and business tools, please activate your subscription.
                </p>
              </div>

              <div className="bg-zinc-800/50 rounded-lg p-4 text-left space-y-3">
                <div className="flex items-center gap-3 text-sm text-zinc-300">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                  Unlimited Events
                </div>
                <div className="flex items-center gap-3 text-sm text-zinc-300">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                  Custom Branding Removal
                </div>
                <div className="flex items-center gap-3 text-sm text-zinc-300">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                  Business Analytics & Models
                </div>
              </div>

              <Button
                onClick={() => navigate('/admin/settings/business?tab=billing&activate=true')}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-6 text-lg"
              >
                Activate Subscription <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              <button
                onClick={() => navigate('/admin/playground')}
                className="text-xs text-zinc-500 hover:text-white underline decoration-zinc-700"
              >
                Continue to playground with existing tokens
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
