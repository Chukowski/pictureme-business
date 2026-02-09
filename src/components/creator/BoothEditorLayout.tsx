import { ReactNode, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft, Smartphone, Monitor, Tablet, Save, ChevronRight,
    Settings2, Palette, Sparkles, Share2, Settings,
    Grid3X3, ZoomIn, ZoomOut, Menu, Layout, RotateCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import { PanelRight, X, Maximize2, Minimize2 } from "lucide-react";

interface Step {
    id: string;
    label: string;
    icon: any;
    description: string;
}

interface BoothEditorLayoutProps {
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
    backUrl?: string;
    backLabel?: string;
    headerActions?: ReactNode;
}

export function BoothEditorLayout({
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
    steps: customSteps,
    backUrl = '/creator/booth',
    backLabel = 'My Booths',
    headerActions
}: BoothEditorLayoutProps) {
    const navigate = useNavigate();
    const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
    const [previewOrientation, setPreviewOrientation] = useState<'portrait' | 'landscape'>('portrait');
    const [zoom, setZoom] = useState(100);
    const [showGrid, setShowGrid] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Left sidebar
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true); // Preview panel
    const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (mobile) {
                setIsSidebarOpen(false);
                setIsRightSidebarOpen(false);
            }
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Notify global navbar to hide when mobile menu is open or desktop sidebar expanded
    useEffect(() => {
        // Hiding navbar if any mobile menu is open, or if fullscreen preview is active
        const shouldHide = isMobileMenuOpen || (isRightSidebarOpen && (isMobile || isPreviewFullscreen));
        window.dispatchEvent(new CustomEvent('navbar-visibility', {
            detail: { visible: !shouldHide }
        }));
        return () => {
            window.dispatchEvent(new CustomEvent('navbar-visibility', {
                detail: { visible: true }
            }));
        };
    }, [isMobileMenuOpen, isRightSidebarOpen, isMobile, isPreviewFullscreen]);

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 150));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));

    const defaultSteps = [
        { id: 'setup', label: 'Setup', icon: Settings2, description: 'Core details & branding' },
        { id: 'design', label: 'Design', icon: Palette, description: 'Look & feel' },
        { id: 'experience', label: 'Experience', icon: Sparkles, description: 'Templates & flows' },
        { id: 'workflow', label: 'Logistics', icon: Share2, description: 'Emails & sharing' },
        { id: 'settings', label: 'Settings', icon: Settings, description: 'Advanced config' },
    ];

    const steps = customSteps || defaultSteps;

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-card">
            <div className="p-3 border-b border-white/5">
                <h2 className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold px-2">
                    Booth Configuration
                </h2>
            </div>
            <div className="flex-1 overflow-y-auto [webkit-overflow-scrolling:touch]">
                <div className="p-2 space-y-0.5">
                    {steps.map((step) => (
                        <button
                            key={step.id}
                            onClick={() => {
                                onStepChange(step.id);
                                setIsMobileMenuOpen(false);
                            }}
                            className={cn(
                                "w-full px-3 py-2.5 rounded-lg transition-all flex items-center gap-3 text-left group relative",
                                currentStep === step.id
                                    ? "bg-indigo-500/10 text-indigo-300"
                                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                            )}
                        >
                            {currentStep === step.id && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-indigo-500 rounded-r-full" />
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

            {/* Quick Share Box */}
            <div className="p-4 border-y border-white/5 mt-4">
                <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-xl p-4">
                    <h3 className="text-xs font-medium text-indigo-200 mb-1 flex items-center gap-2">
                        <Share2 className="w-3 h-3" />
                        Share Your Booth
                    </h3>
                    <p className="text-[10px] text-indigo-300/70 mb-3 leading-relaxed">
                        Copy your booth link and share it with friends!
                    </p>
                    <Button size="sm" variant="secondary" className="w-full h-7 text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20">
                        Copy Booth Link
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-full w-full flex flex-col bg-[#101112] overflow-hidden font-sans">
            {/* Sticky Header */}
            <header className="h-14 border-b border-white/10 bg-card flex items-center justify-between px-4 shrink-0 z-50">
                <div className="flex items-center gap-2 md:gap-4">
                    {/* Mobile Menu Trigger */}
                    <div className="md:hidden">
                        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="-ml-2 text-zinc-400 hover:text-white h-9 w-9">
                                    <Menu className="w-5 h-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-[85%] max-w-[300px] p-0 bg-[#101112] border-r border-white/10">
                                <SheetTitle className="sr-only">Sidebar Navigation</SheetTitle>
                                <SidebarContent />
                            </SheetContent>
                        </Sheet>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="text-zinc-400 hover:text-white h-8 w-8 hidden md:flex"
                    >
                        <Layout className={cn("w-4 h-4 transition-transform", !isSidebarOpen && "rotate-180")} />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(backUrl)}
                        className="text-zinc-400 hover:text-white h-8 w-8 hidden md:flex"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>

                    <Separator orientation="vertical" className="h-5 bg-white/10 hidden md:block" />

                    <div className="flex items-center gap-2 text-xs">
                        <span className="hidden md:inline text-zinc-400 cursor-pointer hover:text-white transition-colors" onClick={() => navigate(backUrl)}>
                            {backLabel}
                        </span>
                        <ChevronRight className="w-3 h-3 text-zinc-600 hidden md:block" />
                        <span className="font-semibold text-white truncate max-w-[150px] md:max-w-none">{title || 'Untitled'}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Status Toggle - Only show if onStatusChange is provided */}
                    {onStatusChange && (
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
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Live
                            </button>
                        </div>
                    )}

                    {/* Save Button / Custom Header Actions */}
                    {headerActions ? (
                        headerActions
                    ) : (
                        <Button
                            onClick={onSave}
                            disabled={isSaving}
                            size="sm"
                            className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white px-4"
                        >
                            <Save className="w-3 h-3 mr-1.5" />
                            <span className="hidden md:inline">{isSaving ? 'Saving...' : 'Save Changes'}</span>
                            <span className="md:hidden">{isSaving ? '...' : 'Save'}</span>
                        </Button>
                    )}

                    <Separator orientation="vertical" className="h-5 bg-white/10 hidden lg:block" />

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                        className={cn(
                            "text-zinc-400 hover:text-white h-8 w-8 hidden lg:flex",
                            isRightSidebarOpen && "text-white bg-white/5"
                        )}
                        title="Toggle Preview"
                    >
                        <PanelRight className="w-4 h-4" />
                    </Button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* LEFT SIDEBAR - Desktop Navigation */}
                <AnimatePresence mode="wait">
                    {isSidebarOpen && (
                        <motion.aside
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 224, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="bg-card border-r border-white/10 hidden md:flex flex-col shrink-0 overflow-hidden"
                        >
                            <SidebarContent />
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* MAIN CONTENT - SPLIT VIEW */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-card relative min-h-0">
                    {/* Center Panel - Form */}
                    <div className="flex-1 flex flex-col min-w-0 bg-card relative z-10 shadow-2xl border-r border-white/5 min-h-0">
                        <div className="flex-1 overflow-y-auto [webkit-overflow-scrolling:touch] scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent min-h-0">
                            <div className="w-full pb-32">
                                {children}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Device Canvas */}
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
                                    "bg-[#09090b] flex flex-col z-40 overflow-hidden border-l border-white/10",
                                    (isMobile || isPreviewFullscreen) ? "fixed inset-0" : "relative min-w-[450px] max-w-[800px] shrink-0"
                                )}
                            >
                                {/* Canvas Toolbar */}
                                <div className="h-14 border-b border-white/10 flex items-center px-4 bg-card/80 backdrop-blur-xl z-20">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIsRightSidebarOpen(false)}
                                        className="mr-2 text-zinc-400 hover:text-white"
                                        title="Close Preview"
                                    >
                                        <X className="w-5 h-5" />
                                    </Button>

                                    {!isMobile && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setIsPreviewFullscreen(!isPreviewFullscreen)}
                                            className="mr-4 text-zinc-400 hover:text-white"
                                            title={isPreviewFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                                        >
                                            {isPreviewFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                        </Button>
                                    )}

                                    <div className="flex-1 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">LIVE PREVIEW</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Device Switcher */}
                                            <TooltipProvider>
                                                <div className="flex items-center gap-0.5 bg-card p-0.5 rounded-lg border border-white/5">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                onClick={() => setPreviewDevice('mobile')}
                                                                className={cn(
                                                                    "p-1.5 rounded transition-colors",
                                                                    previewDevice === 'mobile' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                                                                )}
                                                            >
                                                                <Smartphone className="w-3.5 h-3.5" />
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="bottom">Mobile</TooltipContent>
                                                    </Tooltip>

                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                onClick={() => setPreviewDevice('tablet')}
                                                                className={cn(
                                                                    "p-1.5 rounded transition-colors",
                                                                    previewDevice === 'tablet' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                                                                )}
                                                            >
                                                                <Tablet className="w-3.5 h-3.5" />
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="bottom">Tablet</TooltipContent>
                                                    </Tooltip>

                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                onClick={() => setPreviewDevice('desktop')}
                                                                className={cn(
                                                                    "p-1.5 rounded transition-colors",
                                                                    previewDevice === 'desktop' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                                                                )}
                                                            >
                                                                <Monitor className="w-3.5 h-3.5" />
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="bottom">Desktop</TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </TooltipProvider>

                                            <Separator orientation="vertical" className="h-5 bg-white/10 mx-1" />

                                            {/* Orientation Toggle */}
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            onClick={() => setPreviewOrientation(prev => prev === 'portrait' ? 'landscape' : 'portrait')}
                                                            className={cn(
                                                                "p-1.5 rounded transition-transform duration-300 text-zinc-500 hover:text-zinc-300 hover:bg-white/5",
                                                                previewOrientation === 'landscape' && "rotate-90 text-indigo-400"
                                                            )}
                                                        >
                                                            <RotateCw className="w-3.5 h-3.5" />
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom">Rotate Preview</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>

                                            <Separator orientation="vertical" className="h-5 bg-white/10 mx-1" />

                                            {/* Zoom Controls */}
                                            <div className="flex items-center gap-1">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                onClick={handleZoomOut}
                                                                className="p-1.5 rounded transition-colors text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                                                            >
                                                                <ZoomOut className="w-3.5 h-3.5" />
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="bottom">Zoom Out</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>

                                                <span className="text-[10px] text-zinc-500 w-10 text-center font-mono">{zoom}%</span>

                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                onClick={handleZoomIn}
                                                                className="p-1.5 rounded transition-colors text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                                                            >
                                                                <ZoomIn className="w-3.5 h-3.5" />
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="bottom">Zoom In</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>

                                            <Separator orientation="vertical" className="h-5 bg-white/10 mx-1" />

                                            {/* Grid Toggle */}
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            onClick={() => setShowGrid(!showGrid)}
                                                            className={cn(
                                                                "p-1.5 rounded transition-colors",
                                                                showGrid ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                                                            )}
                                                        >
                                                            <Grid3X3 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom">Toggle Grid</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    </div>
                                </div>

                                {/* Preview Canvas */}
                                <div className="flex-1 relative overflow-auto bg-gradient-to-br from-zinc-900 via-[#101112] to-zinc-950 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent [webkit-overflow-scrolling:touch]">
                                    {showGrid && (
                                        <div
                                            className="absolute inset-0 opacity-10 pointer-events-none"
                                            style={{
                                                backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                                                backgroundSize: '20px 20px'
                                            }}
                                        />
                                    )}

                                    <div
                                        className="min-h-full w-full flex items-center justify-center p-8 transition-all duration-300 pointer-events-none"
                                        style={{
                                            transform: `scale(${zoom / 100})`,
                                            transformOrigin: 'center'
                                        }}
                                    >
                                        <div className={cn(
                                            "bg-[#101112] rounded-2xl shadow-2xl border border-white/10 overflow-hidden transition-all duration-500 pointer-events-auto",
                                            previewDevice === 'mobile' && (previewOrientation === 'portrait' ? "w-[375px] h-[812px]" : "w-[812px] h-[375px]"),
                                            previewDevice === 'tablet' && (previewOrientation === 'portrait' ? "w-[768px] h-[1024px]" : "w-[1024px] h-[768px]"),
                                            previewDevice === 'desktop' && "w-full h-full max-w-[1200px]"
                                        )}>
                                            {preview}
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
