import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ChevronRight, Wand2, QrCode, Eye, Store, Gamepad2, Settings, Layout } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PlaygroundLayoutProps {
  children: ReactNode;
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export function PlaygroundLayout({
  children,
  currentTab,
  onTabChange
}: PlaygroundLayoutProps) {
  const navigate = useNavigate();

  const navItems = [
    { id: 'template', label: 'Template Test', icon: Wand2, description: 'Test AI templates' },
    { id: 'badge', label: 'Badge Test', icon: QrCode, description: 'Design badges' },
    { id: 'event', label: 'Event Preview', icon: Eye, description: 'Preview flow' },
    { id: 'booth', label: 'Booth Simulator', icon: Store, description: 'Full simulator' },
  ];

  const getTabLabel = () => navItems.find(t => t.id === currentTab)?.label || 'Playground';

  return (
    <div className="h-screen w-full flex flex-col bg-[#101112] overflow-hidden font-sans">
      {/* Sticky Header */}
      <header className="h-14 border-b border-white/10 bg-card flex items-center justify-between px-4 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/admin')}
            className="text-zinc-400 hover:text-white h-8 w-8"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          <Separator orientation="vertical" className="h-5 bg-white/10" />
          
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-400 cursor-pointer hover:text-white transition-colors" onClick={() => navigate('/admin')}>
              Dashboard
            </span>
            <ChevronRight className="w-3 h-3 text-zinc-600" />
            <span className="font-semibold text-white flex items-center gap-2">
              <Gamepad2 className="w-3 h-3 text-purple-400" />
              Playground
            </span>
          </div>
        </div>

        {/* Right Side Actions (Placeholder for HUD or other global actions) */}
        <div className="flex items-center gap-2">
            {/* Additional global tools can go here */}
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR - WORKFLOW COLUMN */}
        <aside className="w-64 bg-card border-r border-white/10 flex flex-col shrink-0">
          <div className="p-4">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4 px-2">Tools</h2>
            <div className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group text-left relative overflow-hidden",
                    currentTab === item.id
                      ? "bg-zinc-800 text-white shadow-lg shadow-black/20"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                  )}
                >
                  {/* Active Indicator */}
                  {currentTab === item.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500" />
                  )}
                  
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    currentTab === item.id ? "bg-purple-500/20 text-purple-300" : "bg-card text-zinc-500 group-hover:text-zinc-300"
                  )}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="leading-none">{item.label}</div>
                    <div className="text-[10px] text-zinc-500 mt-1 font-normal opacity-80">{item.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto p-4 border-t border-white/5">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors">
              <Settings className="w-4 h-4" />
              Playground Settings
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 flex overflow-hidden bg-card relative">
          {children}
        </main>
      </div>
    </div>
  );
}
