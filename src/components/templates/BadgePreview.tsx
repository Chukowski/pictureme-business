import React from 'react';
import { User, QrCode, Sparkles, LayoutTemplate } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { BadgeTemplateConfig } from './BadgeTemplateEditor';

interface BadgePreviewProps {
  config: BadgeTemplateConfig;
  eventName?: string;
  className?: string;
  showPlaceholder?: boolean;
}

export function BadgePreview({ config, eventName = 'Event Name', className, showPlaceholder = true }: BadgePreviewProps) {
  // Badge preview dimensions
  const previewDimensions = {
    portrait: { width: 240, height: 320 },
    landscape: { width: 320, height: 240 },
    square: { width: 280, height: 280 },
  };

  const dims = previewDimensions[config.layout];
  const photoSizeMap = { small: 60, medium: 90, large: 120 };
  const photoSize = photoSizeMap[config.photoPlacement.size || 'medium'];

  if (!config.enabled && showPlaceholder) {
    return (
      <div className={cn("text-center text-zinc-500", className)}>
        <LayoutTemplate className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm">Badge generation is disabled</p>
      </div>
    );
  }

  if (!config.enabled) return null;

  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl transition-all duration-300 ease-in-out mx-auto",
        className
      )}
      style={{
        width: dims.width,
        height: dims.height,
        backgroundColor: config.backgroundColor || '#1e293b',
        backgroundImage: config.backgroundUrl ? `url(${config.backgroundUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Photo Placeholder */}
      <div
        className={cn(
          "absolute bg-white/10 border-2 border-dashed border-white/30 flex items-center justify-center backdrop-blur-[2px]",
          config.photoPlacement.shape === 'circle' && "rounded-full",
          config.photoPlacement.shape === 'rounded' && "rounded-xl",
          config.photoPlacement.position === 'top' && "top-6 left-1/2 -translate-x-1/2",
          config.photoPlacement.position === 'center' && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          config.photoPlacement.position === 'left' && "top-1/2 left-6 -translate-y-1/2",
          config.photoPlacement.position === 'right' && "top-1/2 right-6 -translate-y-1/2"
        )}
        style={{ width: photoSize, height: photoSize }}
      >
        <User className="w-8 h-8 text-white/50" />
      </div>

      {/* QR Code */}
      {config.qrCode.enabled && (
        <div
          className={cn(
            "absolute bg-white p-1.5 rounded-lg shadow-sm",
            config.qrCode.position === 'top-left' && "top-4 left-4",
            config.qrCode.position === 'top-right' && "top-4 right-4",
            config.qrCode.position === 'bottom-left' && "bottom-4 left-4",
            config.qrCode.position === 'bottom-right' && "bottom-4 right-4",
            config.qrCode.position === 'center' && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          )}
          style={{
            width: config.qrCode.size === 'small' ? 40 : config.qrCode.size === 'medium' ? 56 : 72,
            height: config.qrCode.size === 'small' ? 40 : config.qrCode.size === 'medium' ? 56 : 72,
          }}
        >
          <QrCode className="w-full h-full text-black" />
        </div>
      )}

      {/* Text Fields */}
      <div className="absolute bottom-4 left-4 right-4 space-y-1 pointer-events-none">
        {config.fields.showName && (
          <p className="text-lg font-bold text-white truncate drop-shadow-md">John Doe</p>
        )}
        {config.fields.showEventName && (
          <p className="text-xs font-medium text-white/80 truncate drop-shadow-sm">{eventName}</p>
        )}
        {config.fields.showDateTime && (
          <p className="text-[10px] text-white/60 truncate drop-shadow-sm">Nov 28, 2025 • 2:30 PM</p>
        )}
        {config.fields.customField1 && (
          <p className="text-[10px] text-white/60 truncate drop-shadow-sm mt-1"><span className="opacity-70">{config.fields.customField1}:</span> Value</p>
        )}
        {config.fields.customField2 && (
          <p className="text-[10px] text-white/60 truncate drop-shadow-sm"><span className="opacity-70">{config.fields.customField2}:</span> Value</p>
        )}
      </div>

      {/* AI Badge */}
      {config.aiPipeline.enabled && (
        <div className="absolute top-3 left-3">
          <Badge className="bg-purple-500/90 text-white text-[10px] border-0 backdrop-blur-sm">
            <Sparkles className="w-2 h-2 mr-1" /> AI
          </Badge>
        </div>
      )}
    </div>
  );
}

