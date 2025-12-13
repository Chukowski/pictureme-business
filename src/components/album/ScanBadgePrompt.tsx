import { useState } from "react";
import { QrCode, Camera, Sparkles, Keyboard, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ScanBadgePromptProps {
  eventName?: string;
  brandName?: string;
  primaryColor?: string;
  onScanQR?: () => void;
  onManualEntry?: (code: string) => void;
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
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const handleManualSubmit = () => {
    const code = manualCode.trim().toUpperCase();
    if (!code) {
      toast.error('Please enter a valid album code');
      return;
    }
    if (onManualEntry) {
      onManualEntry(code);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950 ${className}`}>
      {/* Animated background gradient */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${primaryColor}40 0%, transparent 50%)`,
        }}
      />

      <div className="relative z-10 text-center max-w-md mx-auto w-full">
        {/* Brand */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">{brandName}</h1>
          <p className="text-zinc-400">{eventName}</p>
        </div>

        {!isManualEntry ? (
          <>
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
                  className="text-white h-12 px-6"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Scan QR Code
                </Button>
              )}
              {onManualEntry && (
                <Button
                  variant="outline"
                  onClick={() => setIsManualEntry(true)}
                  className="border-white/20 text-zinc-300 hover:text-white hover:bg-white/10 h-12 px-6"
                >
                  Enter Code Manually
                </Button>
              )}
            </div>
          </>
        ) : (
          /* Manual Entry Form */
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="p-8 rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur-sm mb-6">
              <Keyboard className="w-12 h-12 mx-auto mb-4" style={{ color: primaryColor }} />
              <h2 className="text-xl font-semibold text-white mb-2">Enter Code</h2>
              <p className="text-center text-zinc-400 mb-6">
                Enter the code printed on your badge
              </p>
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="ABCD1234"
                className="text-center text-xl font-mono bg-black/40 border-white/20 text-white h-14 mb-4"
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                autoFocus
              />
              <Button
                onClick={handleManualSubmit}
                className="w-full h-12 text-lg"
                style={{ backgroundColor: primaryColor }}
                disabled={!manualCode.trim()}
              >
                Continue
              </Button>
            </div>

            <Button
              variant="ghost"
              onClick={() => setIsManualEntry(false)}
              className="text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Scan
            </Button>
          </div>
        )}
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

