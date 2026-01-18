import { useState, useRef, useEffect } from "react";
import { EventFormData } from "./types";
import { QrCode, User, Calendar, PartyPopper, Sparkles, LayoutTemplate, FileDown, FileUp, Camera, ArrowLeft, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BadgeVisualEditor } from "@/badge-pro/BadgeVisualEditor";
import { BadgeTemplateConfig, CustomElementPositions } from "@/components/templates/BadgeTemplateEditor";
import { toast } from "sonner";
import { BackgroundSelector } from "@/components/BackgroundSelector";
import { CameraCapture } from "@/components/CameraCapture";
import { ProcessingLoader } from "@/components/ProcessingLoader";
import { ResultDisplay } from "@/components/ResultDisplay";
import { EventTitle } from "@/components/EventTitle";
import ShaderBackground from "@/components/ShaderBackground";
import { Template } from "@/services/eventsApi";

interface LivePreviewProps {
  formData: EventFormData;
  currentStep: string;
  previewMode?: 'event' | 'badge' | 'template' | 'badge-pro';
  onBadgeChange?: (config: BadgeTemplateConfig) => void;
}

export function LivePreview({ formData, currentStep, previewMode, onBadgeChange }: LivePreviewProps) {
  const { theme, title, description, branding, badgeTemplate, templates } = formData;
  const albumCode = (formData as any).slug || 'CODE';
  const layoutImportRef = useRef<HTMLInputElement>(null);

  // Status Machine for "Real" Preview
  const [internalState, setInternalState] = useState<'start' | 'select' | 'camera' | 'processing' | 'result'>('start');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [mockPhoto, setMockPhoto] = useState<string>("");

  // Sync internal state with step changes to "refresh" preview when nav changes
  useEffect(() => {
    if (previewMode === 'template' || currentStep === 'experience') {
      setInternalState('select');
    } else if (currentStep === 'setup') {
      setInternalState('start');
    }
  }, [currentStep, previewMode]);

  // Determine what to preview based on explicit mode only
  // Badge preview only shows when explicitly set to 'badge' mode
  const showBadgePreview = previewMode === 'badge';
  const showBadgeProPreview = previewMode === 'badge-pro';

  // Export current layout as JSON
  const handleExportLayout = () => {
    if (!badgeTemplate) return;

    const layoutExport = {
      id: `custom-${Date.now()}`,
      name: title ? `${title} Layout` : "Custom Layout",
      description: "Custom badge layout exported from Badge Designer Pro",
      layout: badgeTemplate.layout,
      print: (badgeTemplate as any).print || { widthInches: 4, heightInches: 3, dpi: 300, bleedInches: 0.125 },
      positions: badgeTemplate.customPositions,
      backgroundColor: badgeTemplate.backgroundColor,
      backgroundUrl: badgeTemplate.backgroundUrl,
      qrSize: badgeTemplate.qrCode?.size,
      photoSize: badgeTemplate.photoPlacement?.size,
    };

    const exportData = {
      version: "1.0",
      type: "badge-layout",
      exportDate: new Date().toISOString(),
      layout: layoutExport,
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `badge-layout-${layoutExport.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Layout exported");
  };

  // Import layout from JSON
  const handleImportLayout = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onBadgeChange || !badgeTemplate) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.type !== "badge-layout" || !data.layout) {
        throw new Error("Invalid badge layout file");
      }

      const imported = data.layout;

      // Apply imported layout to current badge config
      const updatedConfig: BadgeTemplateConfig = {
        ...badgeTemplate,
        layout: imported.layout || badgeTemplate.layout,
        customPositions: imported.positions as CustomElementPositions,
        useCustomPositions: true,
        backgroundColor: imported.backgroundColor || badgeTemplate.backgroundColor,
        backgroundUrl: imported.backgroundUrl || badgeTemplate.backgroundUrl,
        qrCode: {
          ...badgeTemplate.qrCode,
          size: imported.qrSize || badgeTemplate.qrCode.size,
        },
        photoPlacement: {
          ...badgeTemplate.photoPlacement,
          size: imported.photoSize || badgeTemplate.photoPlacement.size,
        },
      };

      // Also copy print settings if available
      if (imported.print) {
        (updatedConfig as any).print = imported.print;
      }

      onBadgeChange(updatedConfig);
      toast.success(`Imported: ${imported.name}`);
    } catch (err: any) {
      console.error("Import failed:", err);
      toast.error(err.message || "Failed to import layout");
    }

    e.target.value = "";
  };

  // Calculate theme styles
  const bgStyle = theme.mode === 'dark' ? 'bg-card' : 'bg-white';
  const textStyle = theme.mode === 'dark' ? 'text-white' : 'text-zinc-900';
  const subTextStyle = theme.mode === 'dark' ? 'text-zinc-400' : 'text-zinc-500';

  const primaryBtnStyle = {
    backgroundColor: theme.primaryColor,
    color: '#ffffff',
  };

  // Badge Pro Visual Editor Content
  const BadgeProContent = () => {
    if (!badgeTemplate) return null;
    return (
      <div className="w-full h-full flex flex-col">
        {/* Import/Export Toolbar */}
        <div className="flex items-center justify-end gap-2 px-4 py-2 border-b border-white/5 bg-card/30">
          <input
            ref={layoutImportRef}
            type="file"
            accept=".json"
            onChange={handleImportLayout}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => layoutImportRef.current?.click()}
            className="h-7 text-xs text-zinc-400 hover:text-white hover:bg-white/10"
          >
            <FileUp className="w-3.5 h-3.5 mr-1.5" />
            Import Layout
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportLayout}
            className="h-7 text-xs text-zinc-400 hover:text-white hover:bg-white/10"
          >
            <FileDown className="w-3.5 h-3.5 mr-1.5" />
            Export Layout
          </Button>
        </div>

        {/* Visual Editor */}
        <div className="flex-1 flex items-center justify-center p-4">
          <BadgeVisualEditor
            config={badgeTemplate}
            onChange={onBadgeChange || (() => { })}
            eventName={title}
            albumCode={albumCode}
            className="border-zinc-800 shadow-2xl"
          />
        </div>
      </div>
    );
  };

  // Badge preview dimensions
  const badgeDimensions = {
    portrait: { width: 200, height: 267 },
    landscape: { width: 267, height: 200 },
    square: { width: 220, height: 220 },
  };

  const photoSizeMap = { small: 50, medium: 70, large: 90 };

  // Badge Preview Component
  const BadgePreviewContent = () => {
    if (!badgeTemplate?.enabled) {
      return (
        <div className="text-center text-zinc-500 p-8">
          <LayoutTemplate className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Badge generation is disabled</p>
          <p className="text-xs mt-2 opacity-60">Enable it in the Badge Template section</p>
        </div>
      );
    }

    const dims = badgeDimensions[badgeTemplate.layout || 'portrait'];
    const photoSize = photoSizeMap[badgeTemplate.photoPlacement?.size || 'medium'];

    // Find the selected template for badge photo enhancement
    const selectedTemplate = badgeTemplate.aiPipeline?.sourceTemplateId
      ? templates?.find(t => t.id === badgeTemplate.aiPipeline.sourceTemplateId)
      : null;
    const now = new Date();
    const datePreviewText = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timePreviewText = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/2c70787a-617e-4831-a3a3-a75ccfa621a2', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'debug-session', runId: 'run1', hypothesisId: 'H1', location: 'LivePreview.tsx:BadgePreviewContent', message: 'Rendering badge preview date/time text', data: { datePreviewText, timePreviewText, showDateTime: badgeTemplate.fields?.showDateTime, previewMode }, timestamp: Date.now() }) }).catch(() => { });
    // #endregion

    return (
      <div className="flex flex-col items-center gap-4">
        {/* Badge Card */}
        <div
          className="relative rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl transition-all duration-300"
          style={{
            width: dims.width,
            height: dims.height,
            backgroundColor: badgeTemplate.backgroundColor || '#1e293b',
            backgroundImage: badgeTemplate.backgroundUrl ? `url(${badgeTemplate.backgroundUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Photo Placeholder */}
          <div
            className={cn(
              "absolute bg-white/10 border-2 border-dashed border-white/30 flex items-center justify-center backdrop-blur-[2px]",
              badgeTemplate.photoPlacement?.shape === 'circle' && "rounded-full",
              badgeTemplate.photoPlacement?.shape === 'rounded' && "rounded-xl",
              badgeTemplate.photoPlacement?.position === 'top' && "top-4 left-1/2 -translate-x-1/2",
              badgeTemplate.photoPlacement?.position === 'center' && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
              badgeTemplate.photoPlacement?.position === 'left' && "top-1/2 left-4 -translate-y-1/2",
              badgeTemplate.photoPlacement?.position === 'right' && "top-1/2 right-4 -translate-y-1/2"
            )}
            style={{ width: photoSize, height: photoSize }}
          >
            <User className="w-6 h-6 text-white/50" />
          </div>

          {/* QR Code */}
          {badgeTemplate.qrCode?.enabled && (
            <div
              className={cn(
                "absolute bg-white p-1 rounded-md shadow-sm",
                badgeTemplate.qrCode.position === 'top-left' && "top-3 left-3",
                badgeTemplate.qrCode.position === 'top-right' && "top-3 right-3",
                badgeTemplate.qrCode.position === 'bottom-left' && "bottom-3 left-3",
                badgeTemplate.qrCode.position === 'bottom-right' && "bottom-3 right-3",
                badgeTemplate.qrCode.position === 'center' && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              )}
              style={{
                width: badgeTemplate.qrCode.size === 'small' ? 30 : badgeTemplate.qrCode.size === 'medium' ? 40 : 50,
                height: badgeTemplate.qrCode.size === 'small' ? 30 : badgeTemplate.qrCode.size === 'medium' ? 40 : 50,
              }}
            >
              <QrCode className="w-full h-full text-black" />
            </div>
          )}

          {/* Text Fields */}
          <div className="absolute bottom-3 left-3 right-3 space-y-0.5 pointer-events-none">
            {badgeTemplate.fields?.showName && (
              <p className="text-sm font-bold text-white truncate drop-shadow-md">John Doe</p>
            )}
            {badgeTemplate.fields?.showEventName && (
              <p className="text-[10px] font-medium text-white/80 truncate drop-shadow-sm">{title || 'Event Name'}</p>
            )}
            {badgeTemplate.fields?.showDateTime && (
              <>
                <p className="text-[8px] text-white/60 truncate drop-shadow-sm">{datePreviewText}</p>
                <p className="text-[8px] text-white/60 truncate drop-shadow-sm">{timePreviewText}</p>
              </>
            )}
            {badgeTemplate.fields?.customField1 && (
              <p className="text-[8px] text-white/60 truncate"><span className="opacity-70">{badgeTemplate.fields.customField1}:</span> Value</p>
            )}
          </div>

          {/* AI Badge indicator */}
          {badgeTemplate.aiPipeline?.enabled && (
            <div className="absolute top-2 left-2">
              <Badge className="bg-purple-500/90 text-white text-[8px] px-1.5 py-0 border-0 backdrop-blur-sm">
                <Sparkles className="w-2 h-2 mr-0.5" /> AI
              </Badge>
            </div>
          )}
        </div>

        {/* Info below badge */}
        <div className="text-center space-y-1">
          <p className="text-xs text-zinc-400">
            {badgeTemplate.layout?.charAt(0).toUpperCase() + badgeTemplate.layout?.slice(1)} Badge
          </p>
          {selectedTemplate && (
            <p className="text-[10px] text-purple-400">
              Using template: {selectedTemplate.name}
            </p>
          )}
          {badgeTemplate.aiPipeline?.enabled && !selectedTemplate && (
            <p className="text-[10px] text-purple-400">
              AI Enhancement: {badgeTemplate.aiPipeline.model?.split('/').pop() || 'Custom'}
            </p>
          )}
        </div>
      </div>
    );
  };

  // Event/Home Preview
  const EventPreviewContent = () => (
    <div className="flex-1 flex flex-col">
      {/* Status Bar Mock */}
      <div className="h-6 w-full flex items-center justify-between px-4 text-[10px] font-medium text-zinc-500 shrink-0">
        <span>9:41</span>
        <div className="flex gap-1">
          <span className="w-3 h-3 rounded-sm bg-current opacity-50" />
          <span className="w-3 h-3 rounded-sm bg-current opacity-50" />
          <span className="w-4 h-3 rounded-sm bg-current opacity-50" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative z-10">
        <div className="min-h-full flex flex-col items-center justify-center p-6 text-center space-y-8">
          <EventTitle
            eventName={title}
            description={description}
            brandName={theme?.brandName || "AI Photobooth"}
            logoUrl={branding?.logoPath}
          />

          {/* Start Button with Monetization Context */}
          <div className="w-full flex flex-col items-center gap-4 relative z-20">
            <button
              onClick={() => setInternalState('select')}
              className="w-full max-w-[280px] py-4 rounded-full font-bold text-lg shadow-2xl hover:opacity-90 transition-all transform active:scale-95 hover:scale-[1.02] flex items-center justify-center gap-3"
              style={primaryBtnStyle}
            >
              {formData.monetization?.type === 'tokens' ? (
                <>
                  <Coins className="w-5 h-5" />
                  Start ({formData.monetization.token_price || 1} {formData.monetization.token_price === 1 ? 'Token' : 'Tokens'})
                </>
              ) : (
                "Start Experience"
              )}
            </button>

            {formData.monetization?.type === 'revenue_share' && formData.monetization?.fiat_price && (
              <p className="text-white/60 text-xs font-medium">
                Only ${formData.monetization.fiat_price.toFixed(2)} per session
              </p>
            )}
          </div>

          <div className="flex flex-col items-center gap-2">
            <p className={`text-[10px] ${subTextStyle} opacity-40 uppercase tracking-widest font-bold`}>
              Powered by {theme?.brandName || "PictureMe"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setInternalState('camera');
  };

  const handleCapture = (photo: string) => {
    setMockPhoto(photo);
    setInternalState('processing');
    // Simulated AI processing for preview
    setTimeout(() => {
      setInternalState('result');
    }, 3000);
  };

  const handleReset = () => {
    setInternalState('start');
    setSelectedTemplate(null);
    setMockPhoto("");
  };

  // Template Grid Preview
  const TemplatePreviewContent = () => (
    <div className="p-4 space-y-4">
      <h3 className={`text-lg font-semibold ${textStyle}`}>Choose Your Style</h3>
      <div className="grid grid-cols-2 gap-2">
        {(templates || []).slice(0, 4).map((template, i) => (
          <div
            key={template.id || i}
            className="aspect-square rounded-lg overflow-hidden bg-zinc-800 relative group"
          >
            {template.images?.[0] ? (
              <img src={template.images[0]} className="w-full h-full object-cover" alt={template.name} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900/40 to-purple-900/40">
                <Sparkles className="w-6 h-6 text-white/30" />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#101112]/80 to-transparent p-2">
              <p className="text-[10px] text-white font-medium truncate">{template.name}</p>
            </div>
          </div>
        ))}
        {(!templates || templates.length === 0) && (
          <div className="col-span-2 text-center py-8 text-zinc-500">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No templates yet</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`min-h-full w-full flex flex-col ${showBadgePreview || showBadgeProPreview ? 'bg-card' : bgStyle} transition-colors duration-300 relative overflow-hidden`}>
      {showBadgeProPreview ? (
        <BadgeProContent />
      ) : showBadgePreview ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <BadgePreviewContent />
        </div>
      ) : (
        <div className="flex-1 flex flex-col h-full bg-[#101112] relative">
          {internalState === 'start' && (
            <>
              <EventPreviewContent />
              {/* Booth Background Animation */}
              {((theme as any).backgroundAnimation === 'grid' || !(theme as any).backgroundAnimation) && (
                <div className="absolute bottom-0 left-0 right-0 h-[40vh] pointer-events-none z-0">
                  <div className="absolute inset-0 [mask-image:linear-gradient(to_top,black_20%,transparent_100%)]">
                    <ShaderBackground />
                  </div>
                </div>
              )}

              {(theme as any).backgroundAnimation === 'particles' && (
                <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                  <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
                  <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
                  <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-white/10 rounded-full blur-sm animate-bounce" />
                  <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-indigo-400/20 rounded-full animate-ping" />
                </div>
              )}

              {(theme as any).backgroundAnimation === 'pulse' && (
                <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-t from-indigo-500/5 to-transparent animate-pulse" />
              )}
            </>
          )}

          {internalState === 'select' && (
            <div className="flex-1 flex flex-col relative h-full">
              <div className="flex-1 overflow-y-auto relative z-10 h-full">
                <div className="pt-6 pb-2">
                  <EventTitle
                    eventName={title}
                    description={description}
                    brandName={theme?.brandName || "AI Photobooth"}
                    logoUrl={branding?.logoPath}
                  />
                </div>
                <BackgroundSelector
                  templates={templates || []}
                  onSelectBackground={handleTemplateSelect}
                />
              </div>
              {/* Booth Background Animation in Selection Screen */}
              {((theme as any).backgroundAnimation === 'grid' || !(theme as any).backgroundAnimation) && (
                <div className="absolute bottom-0 left-0 right-0 h-[40vh] pointer-events-none z-0">
                  <div className="absolute inset-0 [mask-image:linear-gradient(to_top,black_20%,transparent_100%)]">
                    <ShaderBackground />
                  </div>
                </div>
              )}

              {(theme as any).backgroundAnimation === 'particles' && (
                <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                  <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
                  <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
                </div>
              )}
            </div>
          )}

          {internalState === 'camera' && selectedTemplate && (
            <div className="flex-1 relative">
              <CameraCapture
                selectedBackground={selectedTemplate.name}
                onCapture={handleCapture}
                onBack={() => setInternalState('select')}
              />
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] text-white font-bold uppercase tracking-wider">Preview Mode</span>
              </div>
            </div>
          )}

          {internalState === 'processing' && (
            <ProcessingLoader status="Processing your AI photo..." />
          )}

          {internalState === 'result' && (
            <ResultDisplay
              imageUrl={mockPhoto}
              onReset={handleReset}
            />
          )}
        </div>
      )}

      {/* Preview Context Badge - Subtle Technical Indicator */}
      <div className="absolute bottom-20 right-4 px-2 py-0.5 bg-black/40 backdrop-blur-sm rounded border border-white/5 text-[7px] font-medium text-white/20 pointer-events-none z-50 uppercase tracking-tighter">
        Preview: {internalState}
      </div>
    </div>
  );
}
