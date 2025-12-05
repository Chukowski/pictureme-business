import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ChevronRight } from "lucide-react";
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

  const tabs = [
    { id: 'template', label: 'Template Test' },
    { id: 'badge', label: 'Badge Test' },
    { id: 'event', label: 'Event Preview' },
    { id: 'booth', label: 'Booth Simulator' },
  ];

  const getTabLabel = () => tabs.find(t => t.id === currentTab)?.label || 'Playground';

  return (
    <div className="h-screen w-full flex flex-col bg-black overflow-hidden">
      {/* Sticky Header */}
      <header className="h-16 border-b border-white/10 bg-zinc-900/80 backdrop-blur-md flex items-center justify-between px-4 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/admin')}
            className="text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <Separator orientation="vertical" className="h-6 bg-white/10" />
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-zinc-400 cursor-pointer hover:text-white transition-colors" onClick={() => navigate('/admin')}>
                Dashboard
              </span>
              <ChevronRight className="w-3 h-3 text-zinc-600" />
              <span className="font-semibold text-white">Playground</span>
              <ChevronRight className="w-3 h-3 text-zinc-600" />
              <span className="text-zinc-400">{getTabLabel()}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Centered */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 hidden lg:flex bg-black/50 p-1 rounded-full border border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium transition-all",
                currentTab === tab.id
                  ? "bg-zinc-800 text-white shadow-sm ring-1 ring-white/10"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
           {/* Empty right side for balance */}
           <div className="w-8" />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden bg-zinc-950">
        {children}
      </div>
    </div>
  );
}
