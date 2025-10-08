import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Mail, RotateCcw, Share2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getShareUrl } from "@/services/localStorage";

interface ResultDisplayProps {
  imageUrl: string;
  shareCode?: string;
  onReset: () => void;
}

export const ResultDisplay = ({ imageUrl, shareCode, onReset }: ResultDisplayProps) => {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  // Generate a shareable URL for QR code
  const shareUrl = shareCode ? getShareUrl(shareCode) : `${window.location.origin}/photo/${Date.now()}`;

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `photobooth-${Date.now()}.jpg`;
    link.click();
    toast.success("Photo downloaded!");
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
        <div className="relative rounded-2xl overflow-hidden shadow-elegant">
          <img
            src={imageUrl}
            alt="Processed photo"
            className="w-full h-auto"
          />
          {/* Siemens Branding Overlay */}
          <div className="absolute top-4 md:top-6 left-0 right-0 text-center">
            <h1 className="text-2xl md:text-4xl font-bold text-foreground text-shadow-glow">
              Siemens Healthineers
            </h1>
          </div>
          <div className="absolute bottom-4 md:bottom-6 left-4 md:left-6 right-4 md:right-6">
            <p className="text-3xl md:text-5xl font-bold text-secondary text-shadow-glow mb-2">
              Do less.
            </p>
            <p className="text-lg md:text-xl text-foreground">
              Experience the future
            </p>
          </div>
        </div>

        {/* QR Code & Actions */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card rounded-2xl p-4 md:p-6 text-center space-y-3">
            <h3 className="text-lg md:text-xl font-bold text-primary">Scan to Download</h3>
            <div className="bg-white p-3 md:p-4 rounded-xl inline-block">
              <QRCodeSVG
                value={shareUrl}
                size={160}
                level="H"
                includeMargin
              />
            </div>
            {shareCode && (
              <div className="text-xs text-muted-foreground">
                Code: <span className="font-mono font-bold text-primary">{shareCode}</span>
              </div>
            )}
            <Button
              onClick={handleCopyLink}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Copy className="w-3 h-3 mr-2" />
              Copy Link
            </Button>
          </div>

          <div className="bg-card rounded-2xl p-4 md:p-6 space-y-3">
            <h3 className="text-lg md:text-xl font-bold text-primary">Email Photo</h3>
            <div className="flex flex-col gap-2">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-sm"
              />
              <Button
                onClick={handleEmailSend}
                disabled={isSending}
                className="w-full bg-secondary hover:bg-secondary/90"
                size="sm"
              >
                <Mail className="w-4 h-4 mr-2" />
                Send
              </Button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <Button
            onClick={handleDownload}
            size="lg"
            className="bg-primary hover:bg-primary-glow"
          >
            <Download className="w-5 h-5 md:mr-2" />
            <span className="hidden md:inline">Download</span>
          </Button>
          <Button
            onClick={() => toast.info("Share feature coming soon!")}
            size="lg"
            variant="outline"
          >
            <Share2 className="w-5 h-5 md:mr-2" />
            <span className="hidden md:inline">Share</span>
          </Button>
          <Button
            onClick={onReset}
            variant="outline"
            size="lg"
          >
            <RotateCcw className="w-5 h-5 md:mr-2" />
            <span className="hidden md:inline">New Photo</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
