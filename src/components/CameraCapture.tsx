import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  selectedBackground: string | null;
}

export const CameraCapture = ({ onCapture, selectedBackground }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user",
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        videoRef.current.onloadedmetadata = () => {
          setIsCameraReady(true);
        };
      }
    } catch (error) {
      console.error("Camera access denied:", error);
      toast.error("Camera access denied. Please enable camera permissions.");
    }
  };

  const handleCapture = () => {
    if (!selectedBackground) {
      toast.error("Please select a background first");
      return;
    }
    
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown === 0) {
      capturePhoto();
      setCountdown(null);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg", 0.95);
        onCapture(imageData);
      }
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      
      <canvas ref={canvasRef} className="hidden" />
      
      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="text-[200px] font-bold text-primary glow-teal animate-scale-in">
            {countdown}
          </div>
        </div>
      )}

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
        {selectedBackground && (
          <p className="text-sm text-muted-foreground px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm">
            Background selected
          </p>
        )}
        <Button
          onClick={handleCapture}
          disabled={!isCameraReady || countdown !== null}
          size="lg"
          className="w-20 h-20 rounded-full bg-primary hover:bg-primary-glow glow-teal transition-all"
        >
          <Camera className="w-10 h-10" />
        </Button>
      </div>
    </div>
  );
};
