import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPhotoByShareCode } from "@/services/localStorage";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PhotoNotFound } from "@/components/EventNotFound";

export const SharePage = () => {
  const { shareCode } = useParams<{ shareCode: string }>();
  const navigate = useNavigate();
  const [photo, setPhoto] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPhoto = async () => {
      if (!shareCode) {
        setError("Invalid share code");
        setLoading(false);
        return;
      }

      try {
        console.log("🔍 Loading photo with share code:", shareCode);
        const foundPhoto = await getPhotoByShareCode(shareCode);
        
        if (foundPhoto) {
          console.log("✅ Photo found:", foundPhoto);
          setPhoto(foundPhoto);
        } else {
          console.log("❌ Photo not found");
          setError("Photo not found");
        }
      } catch (err) {
        console.error("Error loading photo:", err);
        setError("Failed to load photo");
      } finally {
        setLoading(false);
      }
    };

    loadPhoto();
  }, [shareCode]);

  const handleDownload = async () => {
    if (!photo) return;

    try {
      const imageUrl = photo.processedImageUrl || photo.processedImageBase64;
      
      if (imageUrl.startsWith('http')) {
        // Cloud URL - fetch and download
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `akita-photobooth-${Date.now()}.jpg`;
        link.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Base64 - download directly
        const link = document.createElement("a");
        link.href = imageUrl;
        link.download = `akita-photobooth-${Date.now()}.jpg`;
        link.click();
      }
      
      toast.success("Photo downloaded!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download photo");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-white text-lg">Loading your photo...</p>
        </div>
      </div>
    );
  }

  if (error || !photo) {
    return <PhotoNotFound shareCode={shareCode} />;
  }

  const imageUrl = photo.processedImageUrl || photo.processedImageBase64;

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6 animate-fade-in">
        {/* Photo Display */}
        <div className="relative rounded-3xl shadow-elegant glow-primary overflow-hidden bg-[#101112]">
          <img
            src={imageUrl}
            alt="Shared photo"
            className="w-full h-auto max-h-[85vh] object-contain"
          />
        </div>

        {/* Download Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleDownload}
            size="lg"
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8"
          >
            <Download className="w-5 h-5" />
            Download Photo
          </Button>
        </div>

        {/* Branding Footer */}
        <div className="text-center space-y-2 py-6">
          <p className="text-sm text-gray-400">
            Powered by Akitá — akitapr.com
          </p>
          <p className="text-xs text-gray-500">
            Experiencias de marca impulsadas por inteligencia artificial.
          </p>
        </div>
      </div>
    </div>
  );
};
