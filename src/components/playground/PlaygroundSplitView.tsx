import { ReactNode, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Smartphone, Monitor, Tablet } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlaygroundSplitViewProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
}

export function PlaygroundSplitView({ leftPanel, rightPanel }: PlaygroundSplitViewProps) {
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');

  return (
    <div className="flex w-full h-full overflow-hidden">
      {/* Left Panel - Controls */}
      <div className="flex-1 flex flex-col border-r border-white/10 min-w-[500px] bg-zinc-950 relative">
        <ScrollArea className="flex-1">
          <div className="p-8 max-w-4xl mx-auto w-full pb-32">
            {leftPanel}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel - Live Preview */}
      <div className="w-[400px] lg:w-[480px] flex flex-col bg-[#09090b] relative shrink-0 border-l border-white/5">
        <div className="h-12 border-b border-white/10 flex items-center justify-between px-4 bg-zinc-900/50">
          <span className="text-xs font-medium text-zinc-400 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live Preview
          </span>
          
          <div className="flex items-center gap-1 bg-black/30 rounded-lg p-0.5 border border-white/5">
            <button 
              onClick={() => setPreviewDevice('mobile')}
              className={cn("p-1.5 rounded-md transition-colors", previewDevice === 'mobile' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300")}
              title="Mobile View"
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setPreviewDevice('tablet')}
              className={cn("p-1.5 rounded-md transition-colors", previewDevice === 'tablet' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300")}
              title="Tablet View"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setPreviewDevice('desktop')}
              className={cn("p-1.5 rounded-md transition-colors", previewDevice === 'desktop' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300")}
              title="Desktop View"
            >
              <Monitor className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:16px_16px] bg-[#050505]">
          <div className={cn(
            "relative bg-black border-[8px] border-zinc-800 rounded-[3rem] shadow-2xl overflow-hidden transition-all duration-500",
            previewDevice === 'mobile' ? "w-[320px] h-[640px]" : 
            previewDevice === 'tablet' ? "w-[480px] h-[640px] rounded-[2rem]" : 
            "w-full h-full rounded-none border-0"
          )}>
            {/* Phone Header/Notch */}
            {previewDevice !== 'desktop' && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-800 rounded-b-2xl z-20 flex items-center justify-center">
                <div className="w-12 h-1 rounded-full bg-black/30" />
              </div>
            )}
            
            {/* Preview Content */}
            <div className="w-full h-full bg-zinc-900 overflow-y-auto scrollbar-hide">
              {rightPanel}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

