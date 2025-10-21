import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Mail, RotateCcw, Share2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getShareUrl } from "@/services/localStorage";
import { useTheme } from "@/contexts/ThemeContext";

interface ResultDisplayProps {
  imageUrl: string;
  shareCode?: string;
  onReset: () => void;
}

export const ResultDisplay = ({ imageUrl, shareCode, onReset }: ResultDisplayProps) => {
  const { brandConfig } = useTheme();
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  // Generate a shareable URL for QR code
  const shareUrl = shareCode ? getShareUrl(shareCode) : `${window.location.origin}/photo/${Date.now()}`;

  // Resolve brand secondary color from CSS vars for canvas usage
  const brandSecondaryCss = useMemo(() => {
    const hsl = getComputedStyle(document.documentElement).getPropertyValue("--brand-secondary").trim();
    return hsl ? `hsl(${hsl})` : "#ee6602";
  }, []);

  const safeBrandSlug = useMemo(() => (brandConfig.brandName || "photobooth").toLowerCase().replace(/\s+/g, "-"), [brandConfig.brandName]);

  const handleDownload = async () => {
    try {
      // Create a canvas with the branding burned in
      const brandedImageUrl = await burnBrandingIntoImage(imageUrl);
      
      const link = document.createElement("a");
      link.href = brandedImageUrl;
      link.download = `${safeBrandSlug}-photobooth-${Date.now()}.jpg`;
      link.click();
      toast.success("Photo downloaded!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download photo");
    }
  };

  const burnBrandingIntoImage = (imageDataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        // Draw the base image
        ctx.drawImage(img, 0, 0);

        // Calculate responsive sizes based on image dimensions
        const scale = img.width / 1024; // Assuming base width of 1024px
        const topPadding = 24 * scale;
        const bottomPadding = 24 * scale;
        const sidePadding = 24 * scale;

        // Top branding - brand name
        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${48 * scale}px Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 10 * scale;
        ctx.shadowOffsetX = 2 * scale;
        ctx.shadowOffsetY = 2 * scale;
        ctx.fillText(brandConfig.brandName || "AI Photobooth", img.width / 2, topPadding + (48 * scale));
        ctx.restore();

        // Bottom branding - primary tagline (brand secondary color)
        ctx.save();
        ctx.fillStyle = brandSecondaryCss; // Brand secondary color
        ctx.font = `bold ${64 * scale}px Arial, sans-serif`;
        ctx.textAlign = "left";
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 10 * scale;
        ctx.shadowOffsetX = 2 * scale;
        ctx.shadowOffsetY = 2 * scale;
        ctx.fillText(brandConfig.tagline || "Do less.", sidePadding, img.height - bottomPadding - (40 * scale));
        ctx.restore();

        // Bottom subtitle - keep subtle supporting line
        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.font = `${28 * scale}px Arial, sans-serif`;
        ctx.textAlign = "left";
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 8 * scale;
        ctx.shadowOffsetX = 2 * scale;
        ctx.shadowOffsetY = 2 * scale;
        ctx.fillText("Experience the future", sidePadding, img.height - bottomPadding);
        ctx.restore();

        // Convert canvas to data URL
        const brandedDataUrl = canvas.toDataURL("image/jpeg", 0.95);
        resolve(brandedDataUrl);
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      img.src = imageDataUrl;
    });
  };

  const handleEmailSend = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSending(true);
    // TODO: Integrate with email service via edge function
    // For now, just copy the link
    setTimeout(() => {
      toast.info("Email integration coming soon! The link has been copied to your clipboard.");
      navigator.clipboard.writeText(shareUrl);
      setIsSending(false);
      setEmail("");
    }, 1000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-gradient-dark p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Result Image with modern card */}
        <div className="relative rounded-3xl overflow-hidden shadow-elegant glow-primary animate-fade-in">
          <img
            src={imageUrl}
            alt="Processed photo"
            className="w-full h-auto"
          />
          {/* Brand overlay with glassmorphism */}
          <div className="absolute top-6 left-0 right-0 flex justify-center">
            <div className="glass-panel px-6 py-3 rounded-2xl">
              <h1 className="text-xl md:text-3xl font-bold text-foreground">
                {brandConfig.brandName || "AI Photobooth"}
              </h1>
            </div>
          </div>
          <div className="absolute bottom-6 left-6 right-6">
            <div className="glass-panel p-4 md:p-6 rounded-2xl">
              <p className="text-2xl md:text-4xl font-bold gradient-secondary bg-clip-text text-transparent mb-1">
                {brandConfig.tagline || "Do less."}
              </p>
              <p className="text-sm md:text-lg text-foreground/90">
                Experience the future
              </p>
            </div>
          </div>
        </div>

        {/* QR Code & Email Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* QR Code Card */}
          <div className="gradient-card rounded-3xl p-6 shadow-card border border-border/50 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                <Share2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Scan to Download</h3>
            </div>
            
            <div className="bg-white p-4 rounded-2xl inline-block w-full flex justify-center">
              <QRCodeSVG
                value={shareUrl}
                size={180}
                level="H"
                includeMargin
              />
            </div>
            
            {shareCode && (
              <div className="glass-panel px-4 py-2 rounded-xl text-center">
                <span className="text-xs text-muted-foreground">Code:</span>
                <span className="ml-2 font-mono font-bold text-primary">{shareCode}</span>
              </div>
            )}
            
            <Button
              onClick={handleCopyLink}
              variant="outline"
              size="lg"
              className="w-full rounded-xl"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Share Link
            </Button>
          </div>

          {/* Email Card */}
          <div className="gradient-card rounded-3xl p-6 shadow-card border border-border/50 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full gradient-secondary flex items-center justify-center glow-secondary">
                <Mail className="w-5 h-5 text-secondary-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Email Photo</h3>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Receive your photo directly in your inbox
            </p>
            
            <div className="space-y-3">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl text-base"
              />
              <Button
                onClick={handleEmailSend}
                disabled={isSending}
                size="lg"
                className="w-full gradient-secondary hover:scale-105 transition-transform rounded-xl"
              >
                <Mail className="w-5 h-5 mr-2" />
                {isSending ? "Sending..." : "Send Photo"}
              </Button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <Button
            onClick={handleDownload}
            size="lg"
            className="gradient-primary hover:scale-105 transition-transform rounded-2xl h-14 glow-primary"
          >
            <Download className="w-5 h-5 md:mr-2" />
            <span className="hidden md:inline">Download</span>
          </Button>
          <Button
            onClick={() => toast.info("Share feature coming soon!")}
            size="lg"
            variant="outline"
            className="rounded-2xl h-14 border-primary/30 hover:border-primary"
          >
            <Share2 className="w-5 h-5 md:mr-2" />
            <span className="hidden md:inline">Share</span>
          </Button>
          <Button
            onClick={onReset}
            variant="outline"
            size="lg"
            className="rounded-2xl h-14 border-border hover:border-muted-foreground"
          >
            <RotateCcw className="w-5 h-5 md:mr-2" />
            <span className="hidden md:inline">New Photo</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
