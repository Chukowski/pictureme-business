/**
 * AlbumProgress Component
 * 
 * Shows the current progress of photos in an album during a multi-station event.
 * Displays visitor ID/name and photo count.
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
}: AlbumProgressProps) {
  const progressPercentage = Math.min((currentPhotos / maxPhotos) * 100, 100);
  const isComplete = currentPhotos >= maxPhotos;
  
  // Display name: use visitor name if available, otherwise "Visitor #X"
  const displayName = visitorName || (visitorNumber ? `Visitor #${visitorNumber}` : albumId.slice(0, 8).toUpperCase());

  return (
    <div className={`p-4 rounded-xl bg-zinc-900/80 backdrop-blur-sm border border-white/10 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        {/* Visitor Info */}
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            {isComplete ? (
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            ) : (
              <Camera className="w-5 h-5" style={{ color: primaryColor }} />
            )}
          </div>
          <div>
            <p className="font-medium text-white">{displayName}</p>
            {currentStation && (
              <p className="text-xs text-zinc-400">{currentStation}</p>
            )}
          </div>
        </div>

        {/* Photo Count */}
        <div className="text-right">
          <p className="text-2xl font-bold text-white">
            {currentPhotos}
            <span className="text-zinc-500 text-lg">/{maxPhotos}</span>
          </p>
          <p className="text-xs text-zinc-400">photos</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <Progress 
          value={progressPercentage} 
          className="h-2 bg-zinc-800"
          style={{ 
            '--progress-color': isComplete ? '#22C55E' : primaryColor 
          } as React.CSSProperties}
        />
        <div className="flex justify-between text-xs text-zinc-500">
          <span>{isComplete ? 'Album Complete!' : 'Album in progress'}</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
      </div>

      {/* Limit Warning */}
      {currentPhotos === maxPhotos - 1 && (
        <p className="mt-2 text-xs text-amber-400 text-center">
          ⚠️ Last photo available in this album
        </p>
      )}
      {isComplete && (
        <p className="mt-2 text-xs text-green-400 text-center">
          ✓ Continue to the next station to view your album
        </p>
      )}
    </div>
  );
}

export default AlbumProgress;

