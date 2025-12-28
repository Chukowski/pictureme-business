import { useMemo, useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Mail, RotateCcw, Share2, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getShareUrl } from "@/services/localStorage";
import { useTheme } from "@/contexts/ThemeContext";
import { sendPhotoEmail, getEmailStatus } from "@/services/eventsApi";

interface ResultDisplayProps {
  imageUrl: string;
  shareCode?: string;
  onReset: () => void;
}

export const ResultDisplay = ({ imageUrl, shareCode, onReset }: ResultDisplayProps) => {
  const { brandConfig } = useTheme();
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState(true);

  // Always use short share code URL for QR code to avoid "Data too long" error
  // If no shareCode (storage failed), use a placeholder short URL
  const shareUrl = shareCode ? getShareUrl(shareCode) : window.location.origin;

  const safeBrandSlug = useMemo(() => (brandConfig.brandName || "photobooth").toLowerCase().replace(/\s+/g, "-"), [brandConfig.brandName]);

  // Check if email service is configured
  useEffect(() => {
    getEmailStatus().then(status => {
      setEmailConfigured(status.configured);
    }).catch(() => {
      setEmailConfigured(false);
    });
  }, []);

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

    if (!shareCode) {
      toast.error("Cannot send email - photo not uploaded to cloud");
      return;
    }

    setIsSending(true);
    try {
      await sendPhotoEmail(
        email,
        imageUrl,
        shareUrl,
        undefined, // eventName - will be filled if available
        brandConfig.brandName,
        brandConfig.primaryColor
      );
      toast.success("Photo sent to your email!");
      setEmailSent(true);
      setEmail("");
    } catch (error) {
      console.error("Email error:", error);
      // Fallback to copying link if email service unavailable
      if (!emailConfigured) {
        toast.info("Email service not configured. Link copied to clipboard instead.");
        navigator.clipboard.writeText(shareUrl);
      } else {
        toast.error("Failed to send email. Please try again.");
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyLink = () => {
    if (!shareCode) {
      toast.error("Share link unavailable (storage offline)");
      return;
    }
    navigator.clipboard.writeText(shareUrl);
    toast.success("Image link copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-card p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-3xl mx-auto space-y-6">
        {/* Result Image */}
        <div className="relative rounded-3xl shadow-elegant glow-primary animate-fade-in bg-[#101112] overflow-hidden">
          <img
            src={imageUrl}
            alt="Processed photo"
            className="w-full h-auto max-h-[85vh] object-contain"
          />
        </div>

        {/* QR Code & Email Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* QR Code Card */}
          <div className="bg-card/50 border border-white/10 backdrop-blur-xl rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                <Share2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold text-white">Scan to View</h3>
            </div>

            <p className="text-sm text-zinc-400">
              {shareCode ? "Scan this QR code to open your photo directly" : "QR code unavailable (storage offline)"}
            </p>

            {shareCode ? (
              <div className="bg-white p-4 rounded-2xl inline-block w-full flex justify-center">
                <QRCodeSVG
                  value={shareUrl}
                  size={180}
                  level="H"
                  includeMargin
                />
              </div>
            ) : (
              <div className="bg-zinc-800/50 p-8 rounded-2xl flex items-center justify-center">
                <p className="text-zinc-400 text-center">
                  Photo saved locally.<br />Share code unavailable.
                </p>
              </div>
            )}

            <Button
              onClick={handleCopyLink}
              variant="outline"
              size="lg"
              className="w-full rounded-xl bg-card/50 border-white/10 text-white hover:bg-zinc-800/50 hover:text-white backdrop-blur-xl"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Image Link
            </Button>
          </div>

          {/* Email Card */}
          <div className="bg-card/50 border border-white/10 backdrop-blur-xl rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${emailSent ? 'bg-green-600' : 'gradient-secondary glow-secondary'}`}>
                {emailSent ? (
                  <CheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <Mail className="w-5 h-5 text-secondary-foreground" />
                )}
              </div>
              <h3 className="text-xl font-bold text-white">
                {emailSent ? "Email Sent!" : "Email Photo"}
              </h3>
            </div>

            <p className="text-sm text-zinc-400">
              {emailSent 
                ? "Check your inbox for your photo" 
                : emailConfigured 
                  ? "Receive your photo directly in your inbox"
                  : "Email service not configured"}
            </p>

            <div className="space-y-3">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailSent) setEmailSent(false);
                }}
                className="h-12 rounded-xl text-base bg-card/50 border-white/10 text-white placeholder:text-zinc-600"
              />
              <Button
                onClick={handleEmailSend}
                disabled={isSending || !shareCode}
                size="lg"
                className={`w-full hover:scale-105 transition-transform rounded-xl ${
                  emailSent ? 'bg-green-600 hover:bg-green-500' : 'gradient-secondary'
                }`}
              >
                {emailSent ? (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Send Again
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5 mr-2" />
                    {isSending ? "Sending..." : "Send Photo"}
                  </>
                )}
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
            className="rounded-2xl h-14 bg-card/50 border-white/10 text-white hover:bg-zinc-800/50 backdrop-blur-xl"
          >
            <Share2 className="w-5 h-5 md:mr-2" />
            <span className="ml-2">Share</span>
          </Button>
          <Button
            onClick={onReset}
            variant="outline"
            size="lg"
            className="rounded-2xl h-14 bg-card/50 border-white/10 text-white hover:bg-zinc-800/50 backdrop-blur-xl"
          >
            <RotateCcw className="w-5 h-5 md:mr-2" />
            <span className="ml-2">Take Another</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
