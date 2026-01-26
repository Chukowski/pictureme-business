import { ReactNode, useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Smartphone, Monitor, Tablet, Save, ChevronRight,
  Settings2, Palette, Sparkles, Share2, Settings,
  Grid3X3, ZoomIn, ZoomOut, Menu, Layout, RotateCw,
  PanelRight, X, Maximize2, Minimize2, Rocket
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";

interface Step {
  id: string;
  label: string;
  icon: any;
  description: string;
}

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
  steps?: Step[];
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
  onStepChange,
  steps: customSteps
}: EventEditorLayoutProps) {
  const navigate = useNavigate();
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [previewOrientation, setPreviewOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const lastInteraction = useRef(Date.now());

  // Notify global navbar to hide when any sidebar is open or in fullscreen
  useEffect(() => {
    const shouldHideNavbar = isMobileMenuOpen || (isRightSidebarOpen && isPreviewFullscreen) || (isSidebarOpen && isMobile);
    window.dispatchEvent(new CustomEvent('navbar-visibility', {
      detail: { visible: !shouldHideNavbar }
    }));
    return () => {
      window.dispatchEvent(new CustomEvent('navbar-visibility', {
        detail: { visible: true }
      }));
    };
  }, [isMobileMenuOpen, isRightSidebarOpen, isPreviewFullscreen, isSidebarOpen, isMobile]);

  useEffect(() => {
    const handleInactivity = () => {
      if (Date.now() - lastInteraction.current > 3000) {
        window.dispatchEvent(new CustomEvent('navbar-visibility', { detail: { visible: false } }));
      }
    };
    const interval = setInterval(handleInactivity, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleInteraction = useCallback(() => {
    lastInteraction.current = Date.now();
    window.dispatchEvent(new CustomEvent('navbar-visibility', { detail: { visible: true } }));
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));

  const defaultSteps = [
    { id: 'setup', label: 'Setup', icon: Settings2, description: 'Core details & access' },
    { id: 'design', label: 'Design', icon: Palette, description: 'Look & feel' },
    { id: 'experience', label: 'Experience', icon: Sparkles, description: 'Templates & badges' },
    { id: 'workflow', label: 'Logistics', icon: Share2, description: 'Stations & tracking' },
    { id: 'settings', label: 'Settings', icon: Settings, description: 'Advanced rules' },
  ];

  const steps = customSteps || defaultSteps;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card">
      <div className="p-4 border-b border-white/5">
        <h2 className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold px-2">
          Event Configuration
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto [webkit-overflow-scrolling:touch] min-h-0">
        <div className="p-2 space-y-0.5">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => {
                onStepChange(step.id);
                if (isMobile) {
                  setIsSidebarOpen(false);
                  setIsRightSidebarOpen(false);
                }
                setIsMobileMenuOpen(false);
              }}
              className={cn(
                "w-full px-3 py-3 rounded-xl transition-all flex items-center gap-3 text-left group relative",
                currentStep === step.id
                  ? "bg-indigo-500/10 text-indigo-300 shadow-lg shadow-black/10"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              )}
            >
              {currentStep === step.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full" />
              )}

              <div className={cn(
                "p-2 rounded-lg transition-colors shadow-sm",
                currentStep === step.id ? "bg-indigo-500/20 text-indigo-300" : "bg-zinc-900/50 text-zinc-500 group-hover:text-zinc-300"
              )}>
                <step.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="text-sm font-medium leading-none truncate">{step.label}</div>
                <div className="text-[10px] text-zinc-500 mt-1 font-normal opacity-80 truncate">{step.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Launch Box */}
      <div className="p-4 mt-auto border-t border-white/5">
        <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/20 rounded-2xl p-4">
          <h3 className="text-xs font-semibold text-indigo-200 mb-1 flex items-center gap-2">
            <Rocket className="w-3 h-3 text-indigo-400" />
            Ready to launch?
          </h3>
          <p className="text-[10px] text-indigo-300/70 mb-3 leading-relaxed">
            Preview your event flow thoroughly before going live.
          </p>
          <Button size="sm" variant="secondary" className="w-full h-8 text-[10px] font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 rounded-lg">
            Launch Checklist
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen h-[100dvh] w-full flex flex-col bg-[#09090b] overflow-hidden font-sans selection:bg-indigo-500/30 fixed inset-0">
      {/* Sticky Header */}
      <header className="h-14 border-b border-white/10 bg-card/80 backdrop-blur-xl flex items-center justify-between px-4 shrink-0 z-50">
        <div className="flex items-center gap-2">
          {/* Mobile Menu Trigger */}
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2 text-zinc-400 hover:text-white h-9 w-9">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85%] max-w-[300px] p-0 bg-[#09090b] border-r border-white/10">
                <SheetTitle className="sr-only">Event Navigation</SheetTitle>
                <SheetDescription className="sr-only">Choose a configuration step for your event.</SheetDescription>
                <SidebarContent />
              </SheetContent>
            </Sheet>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setIsSidebarOpen(!isSidebarOpen); handleInteraction(); }}
                  className={cn(
                    "text-zinc-500 hover:text-white h-8 w-8 hidden md:flex",
                    isSidebarOpen && "bg-white/5 text-white"
                  )}
                >
                  <Layout className={cn("w-4 h-4 transition-transform duration-300", !isSidebarOpen && "rotate-180")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isSidebarOpen ? 'Toggle Config Sidebar' : 'Show Config Sidebar'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/business/events')}
            className="text-zinc-500 hover:text-white h-8 w-8 hidden md:flex"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-5 bg-white/10 hidden md:block" />

          <div className="flex items-center gap-2 text-xs" onClick={handleInteraction}>
            <span
              className="text-zinc-500 cursor-pointer hover:text-white transition-colors hidden md:inline"
              onClick={() => navigate('/business/events')}
            >
              Events
            </span>
            <ChevronRight className="w-3 h-3 text-zinc-700 hidden md:inline" />
            <span className="font-bold text-white truncate max-w-[120px] md:max-w-none">{title || 'New Event'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3" onClick={handleInteraction}>
          {/* Status Toggle */}
          <div className="hidden sm:flex items-center gap-1 bg-[#050505]/40 p-1 rounded-lg border border-white/5">
            <button
              onClick={() => { onStatusChange?.('draft'); handleInteraction(); }}
              className={cn(
                "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                status === 'draft'
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-400"
              )}
            >
              Draft
            </button>
            <button
              onClick={() => { onStatusChange?.('active'); handleInteraction(); }}
              className={cn(
                "px-3 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1.5",
                status === 'active'
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "text-zinc-500 hover:text-zinc-400"
              )}
            >
              <div className={cn("w-1.5 h-1.5 rounded-full bg-emerald-500", status === 'active' && "animate-pulse")} />
              Live
            </button>
          </div>

          <Button
            onClick={() => { onSave(); handleInteraction(); }}
            disabled={isSaving}
            size="sm"
            className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white px-4 font-bold rounded-lg shadow-lg shadow-indigo-500/10"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-3 w-3 border-2 border-white/20 border-t-white"></span>
                <span className="hidden md:inline">Saving...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-3 h-3" />
                <span className="hidden md:inline">Save Changes</span>
                <span className="md:hidden">Save</span>
              </span>
            )}
          </Button>

          <Separator orientation="vertical" className="h-5 bg-white/10" />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setIsRightSidebarOpen(!isRightSidebarOpen); handleInteraction(); }}
                  className={cn(
                    "text-zinc-500 hover:text-white h-8 w-8",
                    isRightSidebarOpen && "bg-white/5 text-white"
                  )}
                >
                  <PanelRight className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isRightSidebarOpen ? 'Hide Preview' : 'Show Preview'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* LEFT SIDEBAR */}
        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-card border-r border-white/10 hidden md:flex flex-col shrink-0 overflow-hidden"
            >
              <SidebarContent />
            </motion.aside>
          )
          }
        </AnimatePresence>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex overflow-hidden bg-card/30 relative min-h-0">
          {/* Form Scroll Area */}
          <div className="flex-1 flex flex-col min-w-0 relative z-10 min-h-0">
            <div
              className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent [-webkit-overflow-scrolling:touch] min-h-0"
              style={{ touchAction: 'pan-y' }}
              onScroll={handleInteraction}
              onClick={handleInteraction}
            >
              <div className="max-w-4xl mx-auto p-4 md:p-10 pb-32">
                <motion.div
                  key={currentStep}
                  className="h-auto min-h-full w-full"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {children}
                </motion.div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR - PREVIEW */}
          <AnimatePresence mode="wait">
            {isRightSidebarOpen && (
              <motion.aside
                initial={isMobile || isPreviewFullscreen ? { opacity: 0, x: "100%" } : { width: 0, opacity: 0 }}
                animate={isMobile || isPreviewFullscreen
                  ? { opacity: 1, x: 0, width: "100%" }
                  : { width: "45%", opacity: 1 }
                }
                exit={isMobile || isPreviewFullscreen ? { opacity: 0, x: "100%" } : { width: 0, opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className={cn(
                  "bg-[#09090b] flex flex-col overflow-hidden border-l border-white/10 shadow-2xl transition-all",
                  (isPreviewFullscreen || isMobile) ? "fixed inset-0 z-[150]" : "relative min-w-[450px] max-w-[800px] shrink-0 z-40"
                )}
              >
                {/* Preview Toolbar */}
                <div className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-card/80 backdrop-blur-xl z-20 shrink-0">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsRightSidebarOpen(false)}
                      className="text-zinc-500 hover:text-white h-8 w-8"
                    >
                      <X className="w-5 h-5" />
                    </Button>

                    {!isMobile && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsPreviewFullscreen(!isPreviewFullscreen)}
                        className="text-zinc-500 hover:text-white h-8 w-8"
                      >
                        {isPreviewFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      </Button>
                    )}

                    <div className="h-4 w-px bg-white/10" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Live Preview</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Device Selector */}
                    <div className="flex items-center bg-[#050505]/60 p-0.5 rounded-lg border border-white/5">
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
                          <TooltipContent>Mobile</TooltipContent>
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
                          <TooltipContent>Tablet</TooltipContent>
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
                          <TooltipContent>Desktop</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <div className="h-4 w-px bg-white/10 mx-1" />

                    {/* Orientation Toggle */}
                    <button
                      onClick={() => setPreviewOrientation(prev => prev === 'portrait' ? 'landscape' : 'portrait')}
                      className={cn(
                        "p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-transform duration-300",
                        previewOrientation === 'landscape' && "rotate-90 text-indigo-400 bg-indigo-500/5 shadow-sm shadow-indigo-500/10"
                      )}
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>

                    <div className="h-4 w-px bg-white/10 mx-1" />

                    {/* Zoom / Grid Controls */}
                    <div className="flex items-center bg-[#050505]/60 p-0.5 rounded-lg border border-white/5">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-white" onClick={handleZoomOut}>
                        <ZoomOut className="w-4 h-4" />
                      </Button>
                      <span className="text-[10px] font-mono w-10 text-center text-zinc-600 font-bold">{zoom}%</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-white" onClick={handleZoomIn}>
                        <ZoomIn className="w-4 h-4" />
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("h-8 w-8 text-zinc-500 hover:text-white rounded-lg", showGrid && "bg-white/5 text-indigo-400")}
                      onClick={() => setShowGrid(!showGrid)}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Preview Canvas */}
                <div className={cn(
                  "flex-1 relative overflow-auto bg-[#050505] scrollbar-hide",
                  showGrid && "bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:20px_20px]"
                )}>
                  <div
                    className="absolute inset-0 flex items-center justify-center p-8 transition-all duration-500 ease-out"
                    style={{
                      transform: `scale(${zoom / 100})`,
                      transformOrigin: 'center'
                    }}
                  >
                    <div className={cn(
                      "relative bg-[#101112] shadow-2xl border border-white/10 overflow-hidden transition-all duration-500",
                      previewDevice === 'mobile' ? (previewOrientation === 'portrait' ? "w-[375px] h-[812px] rounded-2xl" : "w-[812px] h-[375px] rounded-2xl") :
                        previewDevice === 'tablet' ? (previewOrientation === 'portrait' ? "w-[768px] h-[1024px] rounded-2xl" : "w-[1024px] h-[768px] rounded-2xl") :
                          "w-full h-full max-w-[1280px] max-h-[800px] rounded-2xl"
                    )}>
                      {/* Preview Content */}
                      <div className="w-full h-full bg-card overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent [webkit-overflow-scrolling:touch]">
                        {preview}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
