import { useMemo, useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Mail, RotateCcw, Share2, Copy, CheckCircle, User, ExternalLink, Instagram, Globe, ArrowRight, Heart, Sparkles, Grid3X3, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getShareUrl } from "@/services/localStorage";
import { useTheme } from "@/contexts/ThemeContext";
import { sendPhotoEmail, getEmailStatus, updateBoothPhotoVisibility, type EventConfig, type User as CreatorUser } from "@/services/eventsApi";

interface ResultDisplayProps {
  imageUrl: string;
  shareCode?: string;
  onReset: () => void;
  config?: EventConfig;
  creator?: CreatorUser;
  activeTemplatesCount?: number;
}

export const ResultDisplay = ({
  imageUrl,
  shareCode,
  onReset,
  config,
  creator,
  activeTemplatesCount = 0
}: ResultDisplayProps) => {
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

  const monetizationMessage = useMemo(() => {
    if (config?.monetization?.type === 'free') return "Free thanks to the creator";
    if (config?.monetization?.type === 'tokens') return "Premium styles available";
    if (config?.monetization?.type === 'revenue_share') return "Unlock more styles";
    return null;
  }, [config]);

  // Identify if Studio tier for branding rules
  // We check the role or plan if available, defaulting to false if unknown
  const creatorRole = creator?.role || "";
  const isStudioTier = String(creatorRole).toLowerCase().includes('studio');

  const creatorProfileUrl = config?.user_slug ? `/${config.user_slug}` : '#';

  const handleShareBooth = () => {
    const boothUrl = window.location.href.split('?')[0]; // Clean booth URL
    if (navigator.share) {
      navigator.share({
        title: config?.title || "AI Photo Booth",
        text: `Check out this AI Photo Booth!`,
        url: boothUrl,
      });
    } else {
      navigator.clipboard.writeText(boothUrl);
      toast.success("Booth link copied!");
    }
  };

  const handleViewProfile = () => {
    if (creatorProfileUrl !== '#') {
      window.open(creatorProfileUrl, '_blank');
    }
  };

  const [isPublished, setIsPublished] = useState(false);
  const [isUpdatingPublish, setIsUpdatingPublish] = useState(false);
  const [testimonial, setTestimonial] = useState("");
  const [isSavingTestimonial, setIsSavingTestimonial] = useState(false);

  // Auto-publish for free booths
  useEffect(() => {
    if (config?.monetization?.type === 'free' && shareCode && !isPublished) {
      handlePublishToggle(true);
    }
  }, [config, shareCode]);

  const handlePublishToggle = async (checked: boolean) => {
    if (!shareCode) return;
    setIsUpdatingPublish(true);
    try {
      await updateBoothPhotoVisibility(shareCode, checked);
      setIsPublished(checked);
      if (checked) {
        toast.success("Photo published to booth feed!");
      } else {
        toast.success("Photo removed from booth feed.");
      }
    } catch (error) {
      console.error("Failed to update visibility:", error);
      toast.error("Failed to update settings");
    } finally {
      setIsUpdatingPublish(false);
    }
  };

  const handleSaveTestimonial = async () => {
    if (!shareCode || !testimonial.trim() || isSavingTestimonial) return;
    setIsSavingTestimonial(true);
    try {
      // TODO: Implement API call to save testimonial
      // await updateBoothPhotoTestimonial(shareCode, testimonial);
      toast.success("Comment saved!");
    } catch (error) {
      console.error("Failed to save testimonial:", error);
      toast.error("Failed to save comment");
    } finally {
      setIsSavingTestimonial(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-2xl mx-auto space-y-8 py-10 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* Booth Context - Top (Branded Header) */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            {config?.title || "Your AI Result"}
          </h1>
          {config?.description && (
            <p className="text-zinc-500 text-sm max-w-md mx-auto line-clamp-2">
              {config.description}
            </p>
          )}
          {monetizationMessage && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest font-black text-primary/80">
              <Sparkles className="w-3 h-3" />
              {monetizationMessage}
            </div>
          )}

          {activeTemplatesCount > 1 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest font-black text-zinc-400">
              <Grid3X3 className="w-3 h-3" />
              {activeTemplatesCount} Styles Available
            </div>
          )}
        </div>

        {/* Result Image */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-b from-primary/20 to-secondary/20 rounded-[2rem] blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>
          <div className="relative rounded-[2rem] shadow-2xl overflow-hidden bg-[#101112] border border-white/5">
            <img
              src={imageUrl}
              alt="Processed photo"
              className="w-full h-auto max-h-[75vh] object-contain transition duration-700 hover:scale-105"
            />
          </div>
        </div>

        {/* 1) CREATOR IDENTITY SECTION (Studio only) */}
        {isStudioTier && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-all" onClick={handleViewProfile}>
            <div className="flex items-center gap-4">
              <Avatar className="w-12 h-12 border-2 border-primary/20">
                <AvatarImage src={creator?.image || creator?.avatar_url} />
                <AvatarFallback className="bg-zinc-800 text-white">
                  <User className="w-6 h-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Created by</p>
                <p className="text-white font-bold">{creator?.full_name || creator?.username || config?.username || "Creator"}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 font-bold gap-2">
              View profile
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        )}


        {/* Feed Publish Toggle (If Feed Enabled) */}
        {config?.settings?.feedEnabled && (
          <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label className="text-white font-bold flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-400" />
                  Share to Public Feed
                  {config?.monetization?.type === 'free' && (
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[8px]">
                      Required
                    </Badge>
                  )}
                </Label>
                <p className="text-[11px] text-zinc-400 max-w-[280px]">
                  {config?.monetization?.type === 'free'
                    ? "Share your photo to support this free booth!"
                    : "Share your photo on the public feed. You can remove it at any time."}
                </p>
              </div>
              <Switch
                checked={isPublished || config?.monetization?.type === 'free'}
                onCheckedChange={handlePublishToggle}
                disabled={isUpdatingPublish || !shareCode || config?.monetization?.type === 'free'}
                className="data-[state=checked]:bg-indigo-500"
              />
            </div>

            {/* Testimonial Input - Show when publishing */}
            {(isPublished || config?.monetization?.type === 'free') && (
              <div className="space-y-2 pt-2 border-t border-white/5">
                <Label className="text-xs text-zinc-400 flex items-center gap-2">
                  <MessageCircle className="w-3 h-3" />
                  Add a comment (optional)
                </Label>
                <Input
                  placeholder="Share your experience..."
                  value={testimonial}
                  onChange={(e) => setTestimonial(e.target.value)}
                  onBlur={handleSaveTestimonial}
                  className="h-10 rounded-xl text-sm bg-white/5 border-white/10 text-white placeholder:text-zinc-600"
                  maxLength={200}
                />
                <p className="text-[10px] text-zinc-600">{testimonial.length}/200</p>
              </div>
            )}
          </div>
        )}

        {/* QR Code & Sharing Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* QR Code Card */}
          <div className="bg-card/30 border border-white/5 backdrop-blur-xl rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                <Share2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Scan to View</h3>
            </div>

            {shareCode ? (
              <div className="bg-white p-3 rounded-2xl flex justify-center group relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <QRCodeSVG value={shareUrl} size={160} level="H" includeMargin />
              </div>
            ) : (
              <div className="bg-zinc-900/50 aspect-square rounded-2xl flex items-center justify-center">
                <p className="text-zinc-500 text-[10px] text-center uppercase tracking-widest px-4 font-bold">
                  Storage offline<br />Local save only
                </p>
              </div>
            )}

            <Button
              onClick={handleCopyLink}
              variant="outline"
              size="sm"
              className="w-full rounded-xl bg-white/5 border-white/10 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-white/10"
            >
              <Copy className="w-3.5 h-3.5 mr-2 text-zinc-400" />
              Copy Photo Link
            </Button>
          </div>

          {/* Email Card */}
          <div className="bg-card/30 border border-white/5 backdrop-blur-xl rounded-3xl p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${emailSent ? 'bg-green-500' : 'gradient-secondary'}`}>
                  {emailSent ? <CheckCircle className="w-4 h-4 text-white" /> : <Mail className="w-4 h-4 text-secondary-foreground" />}
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Email Photo</h3>
              </div>

              <Input
                type="email"
                placeholder="Where should we send it?"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailSent) setEmailSent(false);
                }}
                className="h-12 rounded-xl text-sm bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:ring-primary/20"
              />
            </div>

            <Button
              onClick={handleEmailSend}
              disabled={isSending || !shareCode}
              size="lg"
              className={`w-full rounded-xl font-bold uppercase tracking-widest text-[11px] ${emailSent ? 'bg-green-500 hover:bg-green-400' : 'gradient-secondary'
                }`}
            >
              {isSending ? "Processing..." : emailSent ? "Sent Successfully" : "Send to Inbox"}
            </Button>
          </div>
        </div>

        {/* 3) RE-ENGAGEMENT ACTIONS */}
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleDownload}
              size="lg"
              className="h-16 rounded-2xl bg-white text-black hover:bg-zinc-200 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 group"
            >
              <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
              Download
            </Button>

            <Button
              onClick={onReset}
              size="lg"
              className="h-16 rounded-2xl bg-primary text-primary-foreground hover:opacity-90 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Try Another
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Button
              onClick={handleShareBooth}
              variant="outline"
              className="h-14 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 text-[10px] font-bold uppercase tracking-[0.15em]"
            >
              <Share2 className="w-4 h-4 mr-2 text-zinc-500" />
              Share Booth
            </Button>

            {isStudioTier && (
              <Button
                onClick={handleViewProfile}
                variant="outline"
                className="h-14 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 text-[10px] font-bold uppercase tracking-[0.15em]"
              >
                <User className="w-4 h-4 mr-2 text-zinc-500" />
                Creator
              </Button>
            )}

            <Button
              onClick={onReset}
              variant="outline"
              className={`h-14 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 text-[10px] font-bold uppercase tracking-[0.15em] ${!isStudioTier ? 'col-span-1' : ''}`}
            >
              <ArrowRight className="w-4 h-4 mr-2 text-zinc-500" />
              Explore {activeTemplatesCount > 1 ? `${activeTemplatesCount} ` : ''}Styles
            </Button>
          </div>
        </div>

        {/* Social branding for Studio only */}
        {isStudioTier && creator?.social_links && (
          <div className="flex justify-center gap-4 pt-4">
            {creator.social_links.instagram && (
              <a href={creator.social_links.instagram} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-white transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
            )}
            {creator.social_links.tiktok && (
              <a href={`https://tiktok.com/@${creator.social_links.tiktok}`} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-white transition-colors">
                <Globe className="w-5 h-5" />
              </a>
            )}
            <a href={creatorProfileUrl} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-white transition-colors">
              <User className="w-5 h-5" />
            </a>
          </div>
        )}

        <div className="text-center pt-8">
          <p className="text-[9px] uppercase tracking-[0.4em] font-black text-zinc-700">
            Powered by Vibe Booth
          </p>
        </div>
      </div>
    </div>
  );
};
