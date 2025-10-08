import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, Video, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [cameraError, setCameraError] = useState<string>("");
  const [permissionStatus, setPermissionStatus] = useState<string>("checking");
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  useEffect(() => {
    checkCameraSupport();
  }, []);

  useEffect(() => {
    if (selectedCameraId || availableCameras.length > 0) {
      startCamera(selectedCameraId || availableCameras[0]?.deviceId);
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [selectedCameraId]);

  const checkCameraSupport = async () => {
    // Check if running on HTTPS or localhost
    const isSecureContext = window.isSecureContext;
    const protocol = window.location.protocol;
    
    console.log("🔒 Secure Context:", isSecureContext);
    console.log("🌐 Protocol:", protocol);
    console.log("🏠 Hostname:", window.location.hostname);

    if (!isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      setCameraError("Camera access requires HTTPS. Please access this site via HTTPS or localhost.");
      setPermissionStatus("failed");
      toast.error("Camera requires HTTPS connection");
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera API not supported in this browser");
      setPermissionStatus("failed");
      toast.error("Camera not supported");
      return;
    }

    setPermissionStatus("requesting");
    await enumerateCameras();
  };

  const enumerateCameras = async () => {
    try {
      // Request permission first
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(track => track.stop());
      
      // Now enumerate devices (labels will be available after permission)
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === "videoinput");
      
      console.log("📷 Available cameras:", videoDevices);
      
      setAvailableCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedCameraId) {
        setSelectedCameraId(videoDevices[0].deviceId);
      }
      setPermissionStatus("granted");
    } catch (error: any) {
      console.error("Error enumerating cameras:", error);
      setCameraError(error.message || "Failed to access camera");
      setPermissionStatus("denied");
      
      if (error.name === "NotAllowedError") {
        toast.error("Camera permission denied. Please allow camera access in your browser settings.");
      } else if (error.name === "NotFoundError") {
        toast.error("No camera found on this device.");
      } else {
        toast.error("Failed to access camera: " + error.message);
      }
    }
  };

  const startCamera = async (deviceId?: string) => {
    try {
      // Stop existing stream first
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId }, width: { ideal: 1080 }, height: { ideal: 1920 } }
          : { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1920 } }
      };

      console.log("🎥 Starting camera with constraints:", constraints);

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setCameraError("");
        videoRef.current.onloadedmetadata = () => {
          console.log("✅ Camera ready!");
          setIsCameraReady(true);
        };
      }
    } catch (error: any) {
      console.error("Camera access error:", error);
      setCameraError(error.message || "Failed to start camera");
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
    <div className="relative w-full min-h-screen flex items-center justify-center bg-black overflow-hidden">
      <div className="relative w-full max-w-3xl h-screen">
        {/* Error Display */}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-50 p-8">
            <div className="max-w-md text-center space-y-4">
              <div className="text-6xl mb-4">📷</div>
              <h2 className="text-2xl font-bold text-primary">Camera Access Issue</h2>
              <p className="text-white">{cameraError}</p>
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Common solutions:</strong></p>
                <ul className="text-left list-disc list-inside space-y-1">
                  <li>Access the site via HTTPS (https://...)</li>
                  <li>Check browser camera permissions</li>
                  <li>Ensure no other app is using the camera</li>
                  <li>Try a different browser (Chrome/Firefox/Safari)</li>
                </ul>
              </div>
              <Button onClick={checkCameraSupport} className="mt-4">
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry Camera Access
              </Button>
            </div>
          </div>
        )}

        {/* Permission Status Indicator */}
        {!cameraError && permissionStatus !== "granted" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-40">
            <div className="text-center space-y-4">
              <div className="text-6xl mb-4">🎥</div>
              <h2 className="text-2xl font-bold text-primary">
                {permissionStatus === "checking" && "Checking Camera..."}
                {permissionStatus === "requesting" && "Requesting Camera Permission"}
              </h2>
              <p className="text-white">Please allow camera access when prompted</p>
            </div>
          </div>
        )}

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

      {/* Debug Info Toggle */}
      <button
        onClick={() => setShowDebugInfo(!showDebugInfo)}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 backdrop-blur-sm border border-primary/30 text-white hover:bg-black/70"
      >
        <Info className="w-5 h-5" />
      </button>

      {/* Debug Info Panel */}
      {showDebugInfo && (
        <div className="absolute top-16 right-4 z-10 p-4 rounded-lg bg-black/90 backdrop-blur-sm border border-primary/30 text-xs text-white max-w-sm">
          <h3 className="font-bold mb-2 text-primary">Debug Info</h3>
          <div className="space-y-1">
            <p>🔒 Secure Context: {window.isSecureContext ? "✅ Yes" : "❌ No"}</p>
            <p>🌐 Protocol: {window.location.protocol}</p>
            <p>🏠 Host: {window.location.hostname}</p>
            <p>📷 Permission: {permissionStatus}</p>
            <p>🎥 Camera Ready: {isCameraReady ? "✅" : "❌"}</p>
            <p>📹 Available Cameras: {availableCameras.length}</p>
            <p>🎬 Stream Active: {stream ? "✅" : "❌"}</p>
            {cameraError && <p className="text-red-400">❌ Error: {cameraError}</p>}
          </div>
        </div>
      )}

      {/* Camera Selector */}
      {availableCameras.length > 1 && !cameraError && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
          <Select value={selectedCameraId} onValueChange={setSelectedCameraId}>
            <SelectTrigger className="w-[280px] bg-black/50 backdrop-blur-sm border-primary/30 text-white">
              <Video className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Select camera" />
            </SelectTrigger>
            <SelectContent>
              {availableCameras.map((camera) => (
                <SelectItem key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || `Camera ${camera.deviceId.slice(0, 8)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
    </div>
  );
};
