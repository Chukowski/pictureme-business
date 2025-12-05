import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Sparkles, Plus, Zap, Layers, ArrowRight, 
  Clock, LayoutTemplate, Activity, AlertCircle,
  CheckCircle2, Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getCurrentUser, getUserEvents, type User, type EventConfig } from "@/services/eventsApi";
import { getPlanDisplayName } from "@/lib/planFeatures";

export default function HomeDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<EventConfig[]>([]);
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
      setUser(currentUser);

      const userEvents = await getUserEvents();
      setEvents(userEvents);
    } catch (error) {
      console.error("Failed to load home data", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Metrics
  const activeEvents = events.filter(e => e.is_active).length;
  const totalTemplates = events.reduce((acc, e) => acc + (e.templates?.length || 0), 0);
  const recentEvents = [...events].sort((a, b) => {
    // Sort by most recently created/updated if available, otherwise created
    return -1; // TODO: fix sorting when timestamps are consistent
  }).slice(0, 5);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-8">
      {/* Background Effects */}
      <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-900/20 to-transparent pointer-events-none -z-10" />
      
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Zone A: Welcome + Quick State (Left Column on Large Screens) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
              Welcome back,<br />
              {user?.full_name || user?.username || 'Creator'}
            </h1>
            <p className="text-sm text-zinc-500">
              Let's create something amazing today.
            </p>
          </div>

          {/* Plan Card */}
          <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/20 blur-2xl rounded-full -mr-10 -mt-10" />
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                  {getPlanDisplayName(user?.role)}
                </Badge>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400" onClick={() => navigate('/admin/settings')}>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
              
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-zinc-400">Tokens</span>
                  <span className="text-white font-medium">
                    {user?.tokens_remaining?.toLocaleString()} / {user?.tokens_total?.toLocaleString() || '∞'}
                  </span>
                </div>
                <Progress value={((user?.tokens_remaining || 0) / (user?.tokens_total || 1000)) * 100} className="h-1.5 bg-zinc-800" />
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Quick Actions</p>
            <Button 
              className="w-full justify-start bg-white text-black hover:bg-zinc-200"
              onClick={() => navigate('/admin/events/create')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Event
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start border-white/10 hover:bg-white/5 text-zinc-300"
              onClick={() => navigate('/admin/playground')}
            >
              <Zap className="w-4 h-4 mr-2 text-amber-400" />
              Open Playground
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start border-white/10 hover:bg-white/5 text-zinc-300"
              onClick={() => navigate('/admin/marketplace')}
            >
              <ShoppingBag className="w-4 h-4 mr-2 text-purple-400" />
              Browse Templates
            </Button>
          </div>
        </div>

        {/* Zone B: Activity Overview (Center/Wide Column) */}
        <div className="lg:col-span-6 space-y-8">
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Card className="bg-zinc-900/30 border-white/10">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 mb-1">Total Events</p>
                <p className="text-2xl font-bold text-white">{events.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/30 border-white/10">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 mb-1">Active Now</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-white">{activeEvents}</p>
                  {activeEvents > 0 && <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/30 border-white/10">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 mb-1">Templates</p>
                <p className="text-2xl font-bold text-white">{totalTemplates}</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity / Start Here */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
              <Button variant="link" className="text-zinc-500 hover:text-white text-xs" onClick={() => navigate('/admin/events')}>
                View All
              </Button>
            </div>

            {events.length === 0 ? (
              // Empty State
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card 
                  className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-white/10 hover:border-indigo-500/50 transition-all cursor-pointer group"
                  onClick={() => navigate('/admin/events/create')}
                >
                  <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
                    <div className="p-3 rounded-full bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Create your first event</h3>
                      <p className="text-xs text-zinc-500 mt-1">Set up a photo booth in minutes</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card 
                  className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-white/10 hover:border-amber-500/50 transition-all cursor-pointer group"
                  onClick={() => navigate('/admin/playground')}
                >
                  <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
                    <div className="p-3 rounded-full bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Try AI Playground</h3>
                      <p className="text-xs text-zinc-500 mt-1">Test prompts and models instantly</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              // Recent List
              <div className="space-y-3">
                {events.slice(0, 5).map(event => (
                  <div 
                    key={event._id}
                    onClick={() => navigate(`/admin/events/edit/${event._id}`)}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/30 border border-white/5 hover:bg-zinc-900/50 hover:border-white/10 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-white transition-colors">
                        <LayoutTemplate className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white group-hover:text-indigo-400 transition-colors">{event.title}</p>
                        <p className="text-xs text-zinc-500">/{event.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={`text-[10px] border-0 ${event.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-500/10 text-zinc-500'}`}>
                        {event.is_active ? 'Active' : 'Draft'}
                      </Badge>
                      <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* System Health (Optional Module) */}
          <Card className="bg-zinc-900/20 border-white/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium text-zinc-300">System Status</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-zinc-500">AI Processor</p>
                  <p className="text-emerald-400 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Operational
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500">Avg. Latency</p>
                  <p className="text-zinc-300">~4.2s</p>
                </div>
                <div>
                  <p className="text-zinc-500">Service</p>
                  <p className="text-zinc-300">v2.4.0</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Zone C: What's New / Updates (Right Column) */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="bg-indigo-900/10 border-indigo-500/20 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-indigo-300 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                What's New
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Badge className="bg-indigo-500 text-white hover:bg-indigo-600">New Feature</Badge>
                <h3 className="text-sm font-medium text-white">Live Event Mode</h3>
                <p className="text-xs text-zinc-400">
                  Monitor your events in real-time with our new command center. Track uploads, approve photos, and manage stations.
                </p>
                <Button size="sm" variant="link" className="p-0 h-auto text-indigo-400" onClick={() => navigate('/admin/events')}>
                  Try it out →
                </Button>
              </div>

              <div className="space-y-2 pt-4 border-t border-white/5">
                <h3 className="text-sm font-medium text-white">Pro Tip</h3>
                <p className="text-xs text-zinc-400">
                  Use the "Playground" to test prompts before creating templates. It saves tokens and time.
                </p>
              </div>

              <div className="space-y-2 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-amber-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">Maintenance</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Scheduled maintenance on Sunday at 2 AM UTC. Services may be interrupted for 15 mins.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}

