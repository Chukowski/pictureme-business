import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Smartphone, Monitor, Tablet, Save, ChevronRight,
  Settings2, Palette, Sparkles, Share2, Settings,
  Grid3X3, ZoomIn, ZoomOut, Rocket, Menu
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

interface EventEditorLayoutProps {
  children: ReactNode;
  preview: ReactNode;
  title: string;
  onTitleChange?: (title: string) => void;
  status: 'active' | 'draft';
  onStatusChange?: (status: 'active' | 'draft') => void;
  onSave: () => void;
  isSaving?: boolean;
  currentStep: string;
  onStepChange: (step: string) => void;
}

export function EventEditorLayout({
  children,
  preview,
  title,
  onTitleChange,
  status,
  onStatusChange,
  onSave,
  isSaving = false,
  currentStep,
  onStepChange
}: EventEditorLayoutProps) {
  const navigate = useNavigate();
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));

  const steps = [
    { id: 'setup', label: 'Setup', icon: Settings2, description: 'Core details & branding' },
    { id: 'design', label: 'Design', icon: Palette, description: 'Look & feel' },
    { id: 'experience', label: 'Experience', icon: Sparkles, description: 'Templates & flows' },
    { id: 'workflow', label: 'Logistics', icon: Share2, description: 'Emails & sharing' },
    { id: 'settings', label: 'Settings', icon: Settings, description: 'Advanced config' },
  ];

  return (
    <div className="h-screen w-full flex flex-col bg-[#101112] overflow-hidden font-sans">
      {/* Sticky Header */}
      <header className="h-14 border-b border-white/10 bg-card flex items-center justify-between px-4 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-zinc-400 hover:text-white -ml-2">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85%] max-w-[300px] p-0 bg-[#101112] border-r border-white/10">
                <SheetTitle className="sr-only">Event Navigation</SheetTitle>
                <SidebarContent
                  steps={steps}
                  currentStep={currentStep}
                  onStepChange={onStepChange}
                />
              </SheetContent>
            </Sheet>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin/events')}
              className="text-zinc-400 hover:text-white h-8 w-8 hidden md:flex"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-5 bg-white/10 hidden md:block" />

          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-400 cursor-pointer hover:text-white transition-colors hidden md:inline" onClick={() => navigate('/admin/events')}>
              Events
            </span>
            <ChevronRight className="w-3 h-3 text-zinc-600 hidden md:inline" />
            <span className="font-semibold text-white truncate max-w-[150px] md:max-w-none">{title || 'New Event'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Toggle */}
          <div className="flex items-center gap-1 bg-[#101112]/30 p-1 rounded-lg border border-white/5">
            <button
              onClick={() => onStatusChange?.('draft')}
              className={cn(
                "px-3 py-1 text-[10px] font-medium rounded-md transition-all",
                status === 'draft'
                  ? "bg-zinc-700 text-zinc-200"
                  : "text-zinc-500 hover:text-zinc-400"
              )}
            >
              Draft
            </button>
            <button
              onClick={() => onStatusChange?.('active')}
              className={cn(
                "px-3 py-1 text-[10px] font-medium rounded-md transition-all flex items-center gap-1.5",
                status === 'active'
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                  : "text-zinc-500 hover:text-zinc-400"
              )}
            >
              <div className={cn("w-1.5 h-1.5 rounded-full bg-emerald-500", status === 'active' && "animate-pulse")} />
              Live
            </button>
          </div>

          <Button
            onClick={onSave}
            disabled={isSaving}
            className="bg-white text-black hover:bg-zinc-200 h-8 text-xs font-medium px-4 rounded-lg"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-black"></span>
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-3.5 h-3.5" />
                Save Changes
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT SIDEBAR - WORKFLOW (Desktop) */}
        <aside className="w-64 bg-card border-r border-white/10 flex-col shrink-0 hidden md:flex">
          <SidebarContent
            steps={steps}
            currentStep={currentStep}
            onStepChange={onStepChange}
          />
        </aside>

        {/* MAIN CONTENT - SPLIT VIEW */}
        <div className="flex-1 flex overflow-hidden bg-card">

          {/* Center Panel - Form */}
          <div className="flex-1 flex flex-col min-w-0 bg-card relative z-10 shadow-2xl border-r border-white/5">
            <ScrollArea className="flex-1">
              <div className="p-4 md:p-8 max-w-3xl mx-auto w-full pb-32 space-y-8">
                {children}
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel - Device Canvas (Hidden on mobile/tablet) */}
          <div className="w-[45%] min-w-[450px] max-w-[800px] flex-col bg-[#09090b] relative shrink-0 hidden xl:flex">

            {/* Canvas Toolbar */}
            <div className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-card/50 backdrop-blur-sm z-20">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Live Preview</span>

                <div className="h-4 w-px bg-white/10" />

                {/* Device Selector */}
                <div className="flex items-center bg-card rounded-lg p-0.5 border border-white/5">
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
                <div className="flex items-center bg-card rounded-lg p-0.5 border border-white/5">
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

              <div
                className="transition-transform duration-300 ease-out origin-center"
                style={{ transform: `scale(${zoom / 100})` }}
              >
                <div className={cn(
                  "relative bg-[#101112] border-[8px] border-zinc-800 shadow-2xl overflow-hidden transition-all duration-500",
                  previewDevice === 'mobile' ? "w-[375px] h-[812px] rounded-[3rem]" :
                    previewDevice === 'tablet' ? "w-[768px] h-[1024px] rounded-[2rem]" :
                      "w-[1280px] h-[800px] rounded-xl border-[12px]" // Desktop
                )}>
                  {/* Notch / Header for Mobile */}
                  {previewDevice === 'mobile' && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-7 bg-zinc-800 rounded-b-2xl z-50 flex items-center justify-center">
                      <div className="w-16 h-1 rounded-full bg-[#101112]/40" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="w-full h-full bg-card overflow-y-auto scrollbar-hide">
                    {preview}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarContent({ steps, currentStep, onStepChange }: any) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-4 px-2">Event Configuration</h2>
        <div className="space-y-1">
          {steps.map((step: any) => (
            <button
              key={step.id}
              onClick={() => onStepChange(step.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group text-left relative overflow-hidden",
                currentStep === step.id
                  ? "bg-zinc-800 text-white shadow-lg shadow-black/20"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
              )}
            >
              {/* Active Indicator */}
              {currentStep === step.id && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
              )}

              <div className={cn(
                "p-2 rounded-lg transition-colors",
                currentStep === step.id ? "bg-indigo-500/20 text-indigo-300" : "bg-card text-zinc-500 group-hover:text-zinc-300"
              )}>
                <step.icon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="leading-none">{step.label}</div>
                <div className="text-[10px] text-zinc-500 mt-1 font-normal opacity-80">{step.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Launch Box */}
      <div className="mt-auto p-4 border-t border-white/5">
        <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-xl p-4">
          <h3 className="text-xs font-medium text-indigo-200 mb-1 flex items-center gap-2">
            <Rocket className="w-3 h-3" />
            Ready to launch?
          </h3>
          <p className="text-[10px] text-indigo-300/70 mb-3 leading-relaxed">
            Preview your event flow thoroughly before going live.
          </p>
          <Button size="sm" variant="secondary" className="w-full h-7 text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20">
            Open Launch Checklist
          </Button>
        </div>
      </div>
    </div>
  );
}
