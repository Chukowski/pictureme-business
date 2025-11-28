/**
 * ScanBadgePrompt Component
 * 
 * Displayed when Album Tracking is enabled but no album ID is provided.
 * Prompts visitors to scan their badge QR code to access the photo booth.
 */

import { QrCode, Camera, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScanBadgePromptProps {
  eventName?: string;
  brandName?: string;
  primaryColor?: string;
  onScanQR?: () => void;
  onManualEntry?: () => void;
  className?: string;
}

export function ScanBadgePrompt({
  eventName = "Event",
  brandName = "PictureMe.Now",
  primaryColor = "#6366F1",
  onScanQR,
  onManualEntry,
  className = "",
}: ScanBadgePromptProps) {
  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950 ${className}`}>
      {/* Animated background gradient */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${primaryColor}40 0%, transparent 50%)`,
        }}
      />
      
      <div className="relative z-10 text-center max-w-md mx-auto">
        {/* Brand */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">{brandName}</h1>
          <p className="text-zinc-400">{eventName}</p>
        </div>

        {/* QR Icon Animation */}
        <div className="relative mb-8">
          <div 
            className="w-32 h-32 mx-auto rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <QrCode 
              className="w-16 h-16 animate-pulse" 
              style={{ color: primaryColor }}
            />
          </div>
          
          {/* Scanning animation lines */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className="w-28 h-1 rounded-full animate-scan"
              style={{ backgroundColor: primaryColor }}
            />
          </div>
        </div>

        {/* Instructions */}
        <h2 className="text-xl font-semibold text-white mb-3">
          Scan Your Badge
        </h2>
        <p className="text-zinc-400 mb-8 leading-relaxed">
          Please scan the QR code on your event badge to access the photo booth 
          and start building your album.
        </p>

        {/* Features */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/10">
            <Camera className="w-6 h-6 mx-auto mb-2 text-cyan-400" />
            <p className="text-sm text-zinc-300">Take Photos</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/10">
            <Sparkles className="w-6 h-6 mx-auto mb-2 text-purple-400" />
            <p className="text-sm text-zinc-300">AI Magic</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onScanQR && (
            <Button
              onClick={onScanQR}
              style={{ backgroundColor: primaryColor }}
              className="text-white"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Scan QR Code
            </Button>
          )}
          {onManualEntry && (
            <Button
              variant="outline"
              onClick={onManualEntry}
              className="border-white/20 text-zinc-300 hover:text-white hover:bg-white/10"
            >
              Enter Code Manually
            </Button>
          )}
        </div>
      </div>

      {/* CSS for scan animation */}
      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(-40px); opacity: 0; }
          50% { transform: translateY(40px); opacity: 1; }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default ScanBadgePrompt;

