import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Smartphone, Monitor, Tablet, ExternalLink, Save, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

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

  const steps = [
    { id: 'setup', label: '1. Setup' },
    { id: 'design', label: '2. Design' },
    { id: 'experience', label: '3. Experience' },
    { id: 'workflow', label: '4. Logistics' },
    { id: 'settings', label: '5. Settings' },
  ];

  return (
    <div className="h-screen w-full flex flex-col bg-black overflow-hidden">
      {/* Sticky Header */}
      <header className="h-16 border-b border-white/10 bg-zinc-900/80 backdrop-blur-md flex items-center justify-between px-4 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/admin/events')}
            className="text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <Separator orientation="vertical" className="h-6 bg-white/10" />
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">Event Editor</span>
              <ChevronRight className="w-3 h-3 text-zinc-600" />
              <span className="text-sm text-zinc-400">{title || 'New Event'}</span>
            </div>
          </div>
        </div>

        {/* Step Navigation - Centered */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 hidden md:flex bg-black/50 p-1 rounded-full border border-white/10">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => onStepChange(step.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium transition-all",
                currentStep === step.id
                  ? "bg-zinc-800 text-white shadow-sm ring-1 ring-white/10"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              )}
            >
              {step.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Status Toggle */}
          <div className="flex items-center gap-2 bg-black/30 p-1 rounded-lg border border-white/5">
            <button
              onClick={() => onStatusChange?.('draft')}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-all",
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
                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                status === 'active' 
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" 
                  : "text-zinc-500 hover:text-zinc-400"
              )}
            >
              Live
            </button>
          </div>

          <Button 
            onClick={onSave} 
            disabled={isSaving}
            className="bg-white text-black hover:bg-zinc-200"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></span>
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Changes
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Editor Form */}
        <div className="flex-1 flex flex-col border-r border-white/10 min-w-[500px] bg-zinc-950">
          <ScrollArea className="flex-1">
            <div className="p-8 max-w-4xl mx-auto w-full pb-32">
              {children}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Live Preview */}
        <div className="w-[400px] lg:w-[480px] flex flex-col bg-[#09090b] relative shrink-0">
          <div className="h-12 border-b border-white/10 flex items-center justify-between px-4 bg-zinc-900/50">
            <span className="text-xs font-medium text-zinc-400 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live Preview
            </span>
            
            <div className="flex items-center gap-1 bg-black/30 rounded-lg p-0.5 border border-white/5">
              <button 
                onClick={() => setPreviewDevice('mobile')}
                className={cn("p-1.5 rounded-md transition-colors", previewDevice === 'mobile' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300")}
              >
                <Smartphone className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setPreviewDevice('tablet')}
                className={cn("p-1.5 rounded-md transition-colors", previewDevice === 'tablet' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300")}
              >
                <Tablet className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setPreviewDevice('desktop')}
                className={cn("p-1.5 rounded-md transition-colors", previewDevice === 'desktop' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300")}
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
                {preview}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

