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

  const safeBrandSlug = useMemo(() => (brandConfig.brandName || "photobooth").toLowerCase().replace(/\s+/g, "-"), [brandConfig.brandName]);

  const handleDownload = async () => {
    try {
      // If it's a cloud URL, fetch and download
      if (imageUrl.startsWith('http')) {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${safeBrandSlug}-photobooth-${Date.now()}.jpg`;
        link.click();
        window.URL.revokeObjectURL(url);
      } else {
        // It's a base64 data URI, download directly
        const link = document.createElement("a");
        link.href = imageUrl;
        link.download = `${safeBrandSlug}-photobooth-${Date.now()}.jpg`;
        link.click();
      }
      toast.success("Photo downloaded!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download photo");
    }
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
      <div className="w-full max-w-3xl mx-auto space-y-6">
        {/* Result Image */}
        <div className="relative rounded-3xl shadow-elegant glow-primary animate-fade-in bg-black overflow-hidden">
          <img
            src={imageUrl}
            alt="Processed photo"
            className="w-full h-auto max-h-[85vh] object-contain"
          />
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <Button
            onClick={handleDownload}
            size="lg"
            className="gradient-primary hover:scale-105 transition-transform rounded-2xl h-14 glow-primary"
          >
            <Download className="w-5 h-5 md:mr-2" />
            <span className="ml-2">Download</span>
          </Button>
          <Button
            onClick={() => toast.info("Share feature coming soon!")}
            size="lg"
            variant="outline"
            className="rounded-2xl h-14 border-primary/30 hover:border-primary"
          >
            <Share2 className="w-5 h-5 md:mr-2" />
            <span className="ml-2">Share</span>
          </Button>
          <Button
            onClick={onReset}
            variant="outline"
            size="lg"
            className="rounded-2xl h-14 border-border hover:border-muted-foreground"
          >
            <RotateCcw className="w-5 h-5 md:mr-2" />
            <span className="ml-2">Take Another</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
