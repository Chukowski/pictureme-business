import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Circle, MoreVertical, QrCode, RefreshCw, Play, Pause, XCircle, Maximize2, Settings, Menu, LayoutDashboard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EventConfig } from "@/services/eventsApi";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface LiveEventLayoutProps {
  children: ReactNode;
  leftSidebar?: ReactNode;
  rightSidebar?: ReactNode;
  event: EventConfig | null;
  isPaused: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onTogglePause: () => void;
  onOpenSettings: () => void;
  onOpenStation: (type: string) => void;
}

export function LiveEventLayout({
  children,
  leftSidebar,
  rightSidebar,
  event,
  isPaused,
  activeTab,
  onTabChange,
  onTogglePause,
  onOpenSettings,
  onOpenStation
}: LiveEventLayoutProps) {
  const navigate = useNavigate();

  const TABS = [
    { id: 'overview', label: 'Command Center', icon: LayoutDashboard },
    { id: 'sales', label: 'Payments' },
    { id: 'staff', label: 'Staff' },
    // Removed Queue and Stations as tabs if they are always visible, but Queue might still be a focused view?
    // User requested "Command Center" style.
    // Let's keep tabs for specific deep dives but Overview is the main one.
  ];

  return (
    <div className="h-screen bg-[#101112] flex flex-col overflow-hidden relative selection:bg-indigo-500/30">
       {/* Background Layers - Consistent with Home Dashboard */}
       <div className="absolute inset-0 bg-[#101112] -z-20" />
       <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-950/20 via-[#101112]/50 to-[#101112] pointer-events-none -z-10" />
      
      {/* Sticky Header */}
      <header className="shrink-0 h-16 border-b border-white/10 bg-[#101112]/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-6 z-50">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/admin/events')}
              className="text-zinc-400 hover:text-white hover:bg-white/5 rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                {event?.title || 'Loading Event...'}
                <span className="text-zinc-500 font-normal hidden sm:inline-block">/ Live Mode</span>
              </h1>
              
              <div className={`hidden md:flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${isPaused ? 'border-amber-500/20 bg-amber-500/5 text-amber-400' : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'}`}>
                  <Circle className={`w-1.5 h-1.5 fill-current ${!isPaused && 'animate-pulse'}`} />
                  <span className="font-medium uppercase tracking-wide">{isPaused ? 'PAUSED' : 'LIVE NOW'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
             {/* Navigation Tabs (Desktop) */}
             <div className="hidden lg:flex items-center bg-card/50 p-1 rounded-full border border-white/5 mr-4">
               {TABS.map(tab => (
                 <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`
                      px-4 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-2
                      ${activeTab === tab.id 
                        ? 'bg-zinc-800 text-white shadow-sm' 
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}
                    `}
                  >
                    {tab.icon && <tab.icon className="w-3 h-3" />}
                    {tab.label}
                  </button>
               ))}
             </div>

             {/* Status Control */}
             <Button 
              variant="outline" 
              size="sm" 
              onClick={onTogglePause}
              className={`hidden sm:flex h-8 border-white/10 text-xs ${isPaused ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'}`}
            >
              {isPaused ? <Play className="w-3 h-3 mr-2" /> : <Pause className="w-3 h-3 mr-2" />}
              {isPaused ? 'Resume' : 'Pause'}
            </Button>

            <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

            <Button 
              variant="ghost" 
              size="icon"
              onClick={onOpenSettings}
              className="h-8 w-8 text-zinc-400 hover:text-white rounded-full"
            >
              <Settings className="w-4 h-4" />
            </Button>
            
            {/* Mobile Menu Trigger for Left Sidebar */}
            <Sheet>
               <SheetTrigger asChild>
                 <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 text-zinc-400">
                    <Menu className="w-4 h-4" />
                 </Button>
               </SheetTrigger>
               <SheetContent side="left" className="w-[300px] bg-card border-white/10 p-0">
                  <div className="p-4 border-b border-white/10">
                     <h2 className="text-lg font-bold text-white">Stations</h2>
                  </div>
                  <div className="p-4">
                     {leftSidebar}
                  </div>
               </SheetContent>
            </Sheet>
          </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (Stations) - Desktop */}
        {leftSidebar && (
          <aside className="hidden lg:block w-[280px] border-r border-white/10 bg-[#101112]/40 flex-shrink-0 overflow-y-auto p-4 custom-scrollbar">
             {leftSidebar}
          </aside>
        )}

        {/* Center Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 relative custom-scrollbar">
          <div className="max-w-5xl mx-auto space-y-6">
            {children}
          </div>
        </main>

        {/* Right Sidebar (Health) - Desktop */}
        {rightSidebar && (
          <aside className="hidden xl:block w-[280px] border-l border-white/10 bg-[#101112]/40 flex-shrink-0 overflow-y-auto p-4 custom-scrollbar">
             {rightSidebar}
          </aside>
        )}
      </div>
    </div>
  );
}
