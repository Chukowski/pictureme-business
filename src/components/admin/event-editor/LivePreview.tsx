import { EventFormData } from "./types";
import { QrCode, User, Calendar, PartyPopper, Sparkles, LayoutTemplate } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { BadgeVisualEditor } from "@/badge-pro/BadgeVisualEditor";
import { BadgeTemplateConfig } from "@/components/templates/BadgeTemplateEditor";

interface LivePreviewProps {
  formData: EventFormData;
  currentStep: string;
  previewMode?: 'event' | 'badge' | 'template' | 'badge-pro';
  onBadgeChange?: (config: BadgeTemplateConfig) => void;
}

export function LivePreview({ formData, currentStep, previewMode, onBadgeChange }: LivePreviewProps) {
  const { theme, title, description, branding, badgeTemplate, templates } = formData;
  const albumCode = (formData as any).slug || 'CODE';
  
  // Determine what to preview based on explicit mode only
  // Badge preview only shows when explicitly set to 'badge' mode
  const showBadgePreview = previewMode === 'badge';
  const showBadgeProPreview = previewMode === 'badge-pro';
  
  // Calculate theme styles
  const bgStyle = theme.mode === 'dark' ? 'bg-zinc-900' : 'bg-white';
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
      <div className="w-full h-full flex items-center justify-center p-4">
        <BadgeVisualEditor
          config={badgeTemplate}
          onChange={onBadgeChange || (() => {})}
          eventName={title}
          albumCode={albumCode}
          className="border-zinc-800 shadow-2xl"
        />
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
              <p className="text-[8px] text-white/60 truncate drop-shadow-sm">Nov 28, 2025 • 2:30 PM</p>
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
    <>
      {/* Status Bar Mock */}
      <div className="h-6 w-full flex items-center justify-between px-4 text-[10px] font-medium text-zinc-500">
        <span>9:41</span>
        <div className="flex gap-1">
          <span className="w-3 h-3 rounded-sm bg-current opacity-50"/>
          <span className="w-3 h-3 rounded-sm bg-current opacity-50"/>
          <span className="w-4 h-3 rounded-sm bg-current opacity-50"/>
        </div>
      </div>

      {/* Event Header (if configured) */}
      {(branding?.logoPath || branding?.showLogoInBooth) && (
        <div className="p-4 flex justify-center">
           {branding.logoPath ? (
             <img 
               src={branding.logoPath.startsWith('http') ? branding.logoPath : `${window.location.origin}/${branding.logoPath}`} 
               className="h-8 object-contain" 
               alt="Logo"
             />
           ) : (
             <div className={`text-lg font-bold ${textStyle}`}>{theme.brandName || "Brand"}</div>
           )}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="space-y-2">
           <h1 className={`text-3xl font-bold ${textStyle}`}>{title || "Event Title"}</h1>
           <p className={`text-sm ${subTextStyle}`}>{description || "Welcome to the event photo booth. Tap to start."}</p>
        </div>

        {/* Start Button */}
        <button 
          className="w-full py-4 rounded-full font-semibold shadow-lg hover:opacity-90 transition-opacity transform active:scale-95"
          style={primaryBtnStyle}
        >
          Start Experience
        </button>
        
        <p className={`text-xs ${subTextStyle} opacity-60`}>
          Powered by {theme.brandName || "PictureMe"}
        </p>
      </div>
    </>
  );

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
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
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
    <div className={`min-h-full w-full flex flex-col ${showBadgePreview || showBadgeProPreview ? 'bg-zinc-950' : bgStyle} transition-colors duration-300 relative`}>
      {showBadgeProPreview ? (
        <BadgeProContent />
      ) : showBadgePreview ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <BadgePreviewContent />
        </div>
      ) : previewMode === 'template' ? (
        <TemplatePreviewContent />
      ) : (
        <EventPreviewContent />
      )}
      
      {/* Preview Context Badge */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 backdrop-blur-md rounded-full border border-white/10 text-[10px] text-white/80 pointer-events-none">
         Previewing: {showBadgeProPreview ? 'Badge Visual Editor' :
                      showBadgePreview ? 'Visitor Badge' :
                      currentStep === 'setup' ? 'Start Screen' : 
                      currentStep === 'design' ? 'Theme' :
                      currentStep === 'experience' ? 'Templates' :
                      currentStep === 'workflow' ? 'Logistics' : 'Settings'}
      </div>
    </div>
  );
}
