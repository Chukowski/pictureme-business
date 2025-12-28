import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft, Smartphone, Monitor, Tablet, Save, ChevronRight,
    Settings2, Palette, Sparkles, Share2, Settings,
    Grid3X3, ZoomIn, ZoomOut
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    onStepChange
}: BoothEditorLayoutProps) {
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
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/creator/booth')}
                        className="text-zinc-400 hover:text-white h-8 w-8"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>

                    <Separator orientation="vertical" className="h-5 bg-white/10" />

                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-zinc-400 cursor-pointer hover:text-white transition-colors" onClick={() => navigate('/creator/booth')}>
                            My Booths
                        </span>
                        <ChevronRight className="w-3 h-3 text-zinc-600" />
                        <span className="font-semibold text-white">{title || 'Untitled'}</span>
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
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Live
                        </button>
                    </div>

                    {/* Save Button */}
                    <Button
                        onClick={onSave}
                        disabled={isSaving}
                        size="sm"
                        className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white px-4"
                    >
                        <Save className="w-3 h-3 mr-1.5" />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* LEFT SIDEBAR - Step Navigation */}
                <aside className="w-56 bg-card border-r border-white/10 flex flex-col shrink-0">
                    <div className="p-3 border-b border-white/5">
                        <h2 className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold px-2">
                            Booth Configuration
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <div className="p-2 space-y-0.5">
                            {steps.map((step) => (
                                <button
                                    key={step.id}
                                    onClick={() => onStepChange(step.id)}
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
                </aside>

                {/* MAIN CONTENT - SPLIT VIEW */}
                <div className="flex-1 flex overflow-hidden bg-card">

                    {/* Center Panel - Form - FULL WIDTH */}
                    <div className="flex-1 flex flex-col min-w-[500px] bg-card relative z-10 shadow-2xl border-r border-white/5">
                        <ScrollArea className="flex-1">
                            <div className="w-full pb-32">
                                {children}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Right Panel - Device Canvas */}
                    <div className="w-[45%] min-w-[450px] max-w-[800px] flex flex-col bg-[#09090b] relative shrink-0">

                        {/* Canvas Toolbar */}
                        <div className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-card/50 backdrop-blur-sm z-20">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-500 font-medium">LIVE PREVIEW</span>
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

                                {/* Zoom Controls */}
                                <div className="flex items-center gap-1">
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

                                    <span className="text-[10px] text-zinc-500 w-10 text-center font-mono">{zoom}%</span>

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
                                </div>

                                <Separator orientation="vertical" className="h-5 bg-white/10 mx-1" />

                                {/* Grid Toggle */}
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
                            </div>
                        </div>

                        {/* Preview Canvas */}
                        <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-zinc-900 via-[#101112] to-zinc-950">
                            {showGrid && (
                                <div
                                    className="absolute inset-0 opacity-10"
                                    style={{
                                        backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                                        backgroundSize: '20px 20px'
                                    }}
                                />
                            )}

                            <div
                                className="absolute inset-0 flex items-center justify-center p-8"
                                style={{ transform: `scale(${zoom / 100})` }}
                            >
                                <div className={cn(
                                    "bg-[#101112] rounded-2xl shadow-2xl border border-white/10 overflow-hidden transition-all",
                                    previewDevice === 'mobile' && "w-[375px] h-[812px]",
                                    previewDevice === 'tablet' && "w-[768px] h-[1024px]",
                                    previewDevice === 'desktop' && "w-full h-full max-w-[1200px]"
                                )}>
                                    {preview}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
