import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Circle, MoreVertical, QrCode, RefreshCw, Play, Pause, XCircle, Maximize2, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EventConfig } from "@/services/eventsApi";

interface LiveEventLayoutProps {
  children: ReactNode;
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
    { id: 'overview', label: 'Overview' },
    { id: 'queue', label: 'Queue / Albums' },
    { id: 'stations', label: 'Stations' },
    { id: 'sales', label: 'Payments' },
    { id: 'staff', label: 'Staff' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/80 backdrop-blur-md">
        <div className="flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/admin/events')}
              className="text-zinc-400 hover:text-white hover:bg-white/5 rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                {event?.title || 'Loading Event...'}
                <span className="text-zinc-500 font-normal hidden sm:inline-block">/ Live Mode</span>
              </h1>
              <div className="flex items-center gap-2 text-xs">
                <div className={`flex items-center gap-1.5 ${isPaused ? 'text-amber-400' : 'text-emerald-400'}`}>
                  <Circle className={`w-2 h-2 fill-current ${!isPaused && 'animate-pulse'}`} />
                  <span className="font-medium uppercase tracking-wide">{isPaused ? 'PAUSED' : 'LIVE NOW'}</span>
                </div>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400">{event?.slug}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
             {/* Status Control */}
             <Button 
              variant="outline" 
              size="sm" 
              onClick={onTogglePause}
              className={`hidden sm:flex h-9 border-white/10 ${isPaused ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'}`}
            >
              {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
              {isPaused ? 'Resume Event' : 'Pause Event'}
            </Button>

            {/* Quick Actions */}
            <div className="h-6 w-px bg-white/10 mx-2 hidden sm:block" />
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onOpenStation('registration')}
              className="hidden md:flex h-9 text-zinc-400 hover:text-white"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Scan Badge
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onOpenStation('bigscreen')}
              className="hidden md:flex h-9 text-zinc-400 hover:text-white"
            >
              <Maximize2 className="w-4 h-4 mr-2" />
              Big Screen
            </Button>

            <Button 
              variant="ghost" 
              size="icon"
              onClick={onOpenSettings}
              className="h-9 w-9 text-zinc-400 hover:text-white rounded-full"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 flex gap-1 overflow-x-auto no-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap
                ${activeTab === tab.id 
                  ? 'border-cyan-500 text-white' 
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

