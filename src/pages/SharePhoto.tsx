import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Download, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPhotoByShareCode } from "@/services/localStorage";
import type { ProcessedPhoto } from "@/services/localStorage";
import { toast } from "sonner";

const SharePhoto = () => {
  const { shareCode } = useParams<{ shareCode: string }>();
  const navigate = useNavigate();
  const [photo, setPhoto] = useState<ProcessedPhoto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (shareCode) {
      const foundPhoto = getPhotoByShareCode(shareCode.toUpperCase());
      setPhoto(foundPhoto);
      setLoading(false);

      if (!foundPhoto) {
        toast.error("Photo not found or expired");
      }
    }
  }, [shareCode]);

  const handleDownload = async () => {
    if (photo) {
      try {
        // Burn branding into the image before downloading
        const brandedImageUrl = await burnBrandingIntoImage(photo.processedImageBase64);
        
        const link = document.createElement("a");
        link.href = brandedImageUrl;
        link.download = `siemens-photobooth-${photo.shareCode}.jpg`;
        link.click();
        toast.success("Photo downloaded!");
      } catch (error) {
        console.error("Download error:", error);
        toast.error("Failed to download photo");
      }
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
        const scale = img.width / 1024;
        const topPadding = 24 * scale;
        const bottomPadding = 24 * scale;
        const sidePadding = 24 * scale;

        // Top branding - "Siemens Healthineers"
        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${48 * scale}px Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 10 * scale;
        ctx.shadowOffsetX = 2 * scale;
        ctx.shadowOffsetY = 2 * scale;
        ctx.fillText("Siemens Healthineers", img.width / 2, topPadding + (48 * scale));
        ctx.restore();

        // Bottom branding - "Do less."
        ctx.save();
        ctx.fillStyle = "#ee6602";
        ctx.font = `bold ${64 * scale}px Arial, sans-serif`;
        ctx.textAlign = "left";
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 10 * scale;
        ctx.shadowOffsetX = 2 * scale;
        ctx.shadowOffsetY = 2 * scale;
        ctx.fillText("Do less.", sidePadding, img.height - bottomPadding - (40 * scale));
        ctx.restore();

        // Bottom subtitle
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

        const brandedDataUrl = canvas.toDataURL("image/jpeg", 0.95);
        resolve(brandedDataUrl);
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = imageDataUrl;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">📷</div>
          <h2 className="text-2xl font-bold text-primary">Loading photo...</h2>
        </div>
      </div>
    );
  }

  if (!photo) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="text-6xl">😕</div>
          <h2 className="text-3xl font-bold text-primary">Photo Not Found</h2>
          <p className="text-muted-foreground">
            This photo may have been removed or the link is incorrect.
          </p>
          <Button onClick={() => navigate("/")} size="lg">
            <Home className="w-5 h-5 mr-2" />
            Go to Photo Booth
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary text-shadow-glow">
            Photo Booth AI
          </h1>
          <p className="text-muted-foreground">
            {photo.backgroundName} • {new Date(photo.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Photo */}
        <div className="relative rounded-2xl overflow-hidden shadow-elegant">
          <img
            src={photo.processedImageBase64}
            alt="Shared photo"
            className="w-full h-auto"
          />
          {/* Siemens Branding Overlay */}
          <div className="absolute top-4 md:top-6 left-0 right-0 text-center">
            <h2 className="text-2xl md:text-4xl font-bold text-foreground text-shadow-glow">
              Siemens Healthineers
            </h2>
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

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Button onClick={handleDownload} size="lg" className="bg-primary hover:bg-primary-glow">
            <Download className="w-5 h-5 mr-2" />
            Download Photo
          </Button>
          <Button onClick={() => navigate("/")} variant="outline" size="lg">
            <Home className="w-5 h-5 mr-2" />
            Create Your Own
          </Button>
        </div>

        {/* Share Code */}
        <div className="text-center text-sm text-muted-foreground">
          Share Code: <span className="font-mono font-bold text-primary">{photo.shareCode}</span>
        </div>
      </div>
    </div>
  );
};

export default SharePhoto;

