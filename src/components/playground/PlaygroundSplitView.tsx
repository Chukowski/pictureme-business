import { ReactNode, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Smartphone, Monitor, Tablet, Maximize, Grid3X3, 
  ZoomIn, ZoomOut, RotateCcw 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PlaygroundSplitViewProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  canvasOverlay?: ReactNode;
}

export function PlaygroundSplitView({ leftPanel, rightPanel, canvasOverlay }: PlaygroundSplitViewProps) {
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));
  const handleResetZoom = () => setZoom(100);

  return (
    <div className="flex w-full h-full overflow-hidden">
      {/* Center Panel - Configuration & Controls */}
      <div className="flex-1 flex flex-col min-w-[400px] bg-zinc-950 relative z-10 shadow-2xl border-r border-white/5">
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-3xl mx-auto w-full pb-32 space-y-8">
             {leftPanel}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel - Device Canvas */}
      <div className="w-[45%] min-w-[450px] max-w-[800px] flex flex-col bg-[#09090b] relative shrink-0">
        
        {/* Canvas Toolbar */}
        <div className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-zinc-900/50 backdrop-blur-sm z-20">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Device Canvas</span>
            
            <div className="h-4 w-px bg-white/10" />
            
            {/* Device Selector */}
            <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-white/5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={() => setPreviewDevice('mobile')}
                      className={cn("p-1.5 rounded-md transition-all", previewDevice === 'mobile' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
                    >
                      <Smartphone className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs bg-zinc-800 border-zinc-700 text-white">Mobile</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={() => setPreviewDevice('tablet')}
                      className={cn("p-1.5 rounded-md transition-all", previewDevice === 'tablet' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
                    >
                      <Tablet className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs bg-zinc-800 border-zinc-700 text-white">Tablet</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={() => setPreviewDevice('desktop')}
                      className={cn("p-1.5 rounded-md transition-all", previewDevice === 'desktop' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
                    >
                      <Monitor className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs bg-zinc-800 border-zinc-700 text-white">Desktop</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="flex items-center gap-2">
             {/* Zoom Controls */}
             <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-white/5">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white" onClick={handleZoomOut}>
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <span className="text-[10px] font-mono w-8 text-center text-zinc-500">{zoom}%</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white" onClick={handleZoomIn}>
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
             </div>

             <div className="h-4 w-px bg-white/10" />

             <TooltipProvider>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn("h-8 w-8 text-zinc-400 hover:text-white", showGrid && "bg-zinc-800 text-white")}
                    onClick={() => setShowGrid(!showGrid)}
                   >
                     <Grid3X3 className="w-4 h-4" />
                   </Button>
                 </TooltipTrigger>
                 <TooltipContent side="bottom" className="text-xs bg-zinc-800 border-zinc-700 text-white">Toggle Grid</TooltipContent>
               </Tooltip>
             </TooltipProvider>
          </div>
        </div>

        {/* Canvas Area */}
        <div className={cn(
          "flex-1 flex items-center justify-center overflow-hidden relative bg-[#050505]",
          showGrid && "bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:20px_20px]"
        )}>
          
          {/* Canvas Overlay (HUD, Floating Actions) */}
          {canvasOverlay && (
            <div className="absolute inset-0 z-50 pointer-events-none">
              {canvasOverlay}
            </div>
          )}

          <div 
            className="transition-transform duration-300 ease-out origin-center"
            style={{ transform: `scale(${zoom / 100})` }}
          >
            <div className={cn(
              "relative bg-black border-[8px] border-zinc-800 shadow-2xl overflow-hidden transition-all duration-500",
              previewDevice === 'mobile' ? "w-[375px] h-[812px] rounded-[3rem]" : 
              previewDevice === 'tablet' ? "w-[768px] h-[1024px] rounded-[2rem]" : 
              "w-[1280px] h-[800px] rounded-xl border-[12px]" // Desktop
            )}>
              {/* Notch / Header for Mobile */}
              {previewDevice === 'mobile' && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-7 bg-zinc-800 rounded-b-2xl z-50 flex items-center justify-center">
                   <div className="w-16 h-1 rounded-full bg-black/40" />
                </div>
              )}
              
              {/* Content */}
              <div className="w-full h-full bg-zinc-900 overflow-y-auto scrollbar-hide">
                {rightPanel}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
