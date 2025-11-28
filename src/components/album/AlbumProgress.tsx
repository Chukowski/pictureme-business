/**
 * AlbumProgress Component
 * 
 * Shows the current progress of photos in an album during a multi-station event.
 * Displays visitor ID/name and photo count.
 * 
 * Variants:
 * - "full": Full progress card with all details (default)
 * - "compact": Small badge-style counter for overlays
 * - "minimal": Just the counter, no background
 */

import { Camera, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AlbumProgressProps {
  albumId: string;
  visitorName?: string;
  visitorNumber?: number;
  currentPhotos: number;
  maxPhotos: number;
  currentStation?: string;
  primaryColor?: string;
  className?: string;
  variant?: "full" | "compact" | "minimal";
  eventLogo?: string;
  eventName?: string;
}

export function AlbumProgress({
  albumId,
  visitorName,
  visitorNumber,
  currentPhotos,
  maxPhotos,
  currentStation,
  primaryColor = "#06B6D4", // Cyan
  className = "",
  variant = "full",
  eventLogo,
  eventName,
}: AlbumProgressProps) {
  const progressPercentage = Math.min((currentPhotos / maxPhotos) * 100, 100);
  const isComplete = currentPhotos >= maxPhotos;
  
  // Display name: use visitor name if available, otherwise "Visitor #X"
  const displayName = visitorName || (visitorNumber ? `Visitor #${visitorNumber}` : albumId.slice(0, 8).toUpperCase());

  // Compact variant - small badge for camera overlay
  if (variant === "compact") {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 ${className}`}>
        <div className="flex gap-0.5">
          {Array.from({ length: maxPhotos }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i < currentPhotos 
                  ? isComplete ? 'bg-green-400' : 'bg-cyan-400'
                  : 'bg-zinc-600'
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-medium text-white">
          {currentPhotos}/{maxPhotos}
        </span>
      </div>
    );
  }

  // Minimal variant - just counter text
  if (variant === "minimal") {
    return (
      <div className={`inline-flex items-center gap-1 ${className}`}>
        <span className="text-lg font-bold text-white">{currentPhotos}</span>
        <span className="text-zinc-500">/{maxPhotos}</span>
      </div>
    );
  }

  // Full variant - complete progress card (positioned in corner)
  return (
    <div className={`p-3 rounded-xl bg-zinc-900/90 backdrop-blur-sm border border-white/10 ${className}`}>
      <div className="flex items-center justify-between gap-4">
        {/* Visitor Info */}
        <div className="flex items-center gap-2 min-w-0">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            {isComplete ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <Camera className="w-4 h-4" style={{ color: primaryColor }} />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-white text-sm truncate">{displayName}</p>
            {currentStation && (
              <p className="text-xs text-zinc-500 truncate">{currentStation}</p>
            )}
          </div>
        </div>

        {/* Event Logo/Name (center) */}
        {eventLogo && (
          <div className="flex-shrink-0">
            <img src={eventLogo} alt={eventName || ''} className="h-8 max-w-[120px] object-contain" />
          </div>
        )}

        {/* Photo Count */}
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-bold text-white leading-none">
            {currentPhotos}
            <span className="text-zinc-500 text-sm">/{maxPhotos}</span>
          </p>
          <p className="text-[10px] text-zinc-500">photos</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-2">
        <Progress 
          value={progressPercentage} 
          className="h-1.5 bg-zinc-800"
          style={{ 
            '--progress-color': isComplete ? '#22C55E' : primaryColor 
          } as React.CSSProperties}
        />
        <div className="flex justify-between text-[10px] text-zinc-500 mt-0.5">
          <span>{isComplete ? 'Album Complete!' : 'Album in progress'}</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
      </div>
    </div>
  );
}

export default AlbumProgress;

