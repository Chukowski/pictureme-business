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
  onBack?: () => void;
  lastPhotoUrl?: string;
  isGroupPhoto?: boolean;
  onGroupPhotoChange?: (isGroup: boolean) => void;
  hasGroupPrompt?: boolean; // Whether the template has a group prompt configured
}

export const CameraCapture = ({ 
  onCapture, 
  selectedBackground, 
  onBack, 
  lastPhotoUrl,
  isGroupPhoto = false,
  onGroupPhotoChange,
  hasGroupPrompt = false,
}: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [cameraError, setCameraError] = useState<string>("");
  const [permissionStatus, setPermissionStatus] = useState<string>("checking");

  // New UI States
  const [timer, setTimer] = useState<0 | 3 | 10>(0);
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [showControls, setShowControls] = useState(true);
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');

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
    const isSecureContext = window.isSecureContext;

    if (!isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      setCameraError("Camera access requires HTTPS.");
      setPermissionStatus("failed");
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera API not supported");
      setPermissionStatus("failed");
      return;
    }

    setPermissionStatus("requesting");
    await enumerateCameras();
  };

  const enumerateCameras = async () => {
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(track => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === "videoinput");

      setAvailableCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedCameraId) {
        setSelectedCameraId(videoDevices[0].deviceId);
      }
      setPermissionStatus("granted");
    } catch (error: any) {
      console.error("Error enumerating cameras:", error);
      setCameraError(error.message || "Failed to access camera");
      setPermissionStatus("denied");
    }
  };

  const startCamera = async (deviceId?: string) => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setCameraError("");
        videoRef.current.onloadedmetadata = () => {
          setIsCameraReady(true);
        };
      }
    } catch (error: any) {
      console.error("Camera access error:", error);
      setCameraError(error.message || "Failed to start camera");
    }
  };

  const handleCapture = () => {
    if (!selectedBackground) {
      toast.error("Please select a background first");
      return;
    }

    if (timer > 0) {
      setCountdown(timer);
    } else {
      capturePhoto();
    }
  };

  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      capturePhoto();
      setCountdown(null);
      return;
    }

    const timerId = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timerId);
  }, [countdown]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        // If fitMode is 'cover', we might want to crop the capture too, 
        // but usually capturing the full sensor is better. 
        // For now, we capture the full sensor frame.
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg", 0.95);
        onCapture(imageData);
      }
    }
  };

  const toggleCamera = () => {
    if (availableCameras.length < 2) return;
    const currentIndex = availableCameras.findIndex(c => c.deviceId === selectedCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    setSelectedCameraId(availableCameras[nextIndex].deviceId);
  };

  const toggleTimer = () => {
    if (timer === 0) setTimer(3);
    else if (timer === 3) setTimer(10);
    else setTimer(0);
  };

  // Icons
  const TimerIcon = () => (
    <div className="flex flex-col items-center justify-center w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white">
      {timer === 0 ? <span className="text-xs font-bold">OFF</span> : <span className="text-xs font-bold">{timer}s</span>}
    </div>
  );

  return (
    <div className="relative w-full min-h-screen flex items-center justify-center bg-black overflow-hidden">
      <div className="relative w-full max-w-3xl h-screen flex flex-col">

        {/* Video Feed */}
        <div className="absolute inset-0 z-0">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full transition-all duration-500 ${fitMode === 'contain' ? 'object-contain' : 'object-cover'}`}
          />
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
            <div className="text-[200px] font-bold text-primary glow-teal animate-scale-in">
              {countdown}
            </div>
          </div>
        )}

        {/* Top Controls Bar */}
        <div className={`absolute top-0 inset-x-0 z-20 p-4 flex justify-between items-start transition-transform duration-300 ${showControls ? 'translate-y-0' : '-translate-y-full'}`}>
          <div className="flex gap-4 items-center">
            {/* Back Button */}
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-zinc-900/50 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-zinc-800/50 transition-all"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Camera Selector Dropdown */}
            {availableCameras.length > 1 && (
              <Select value={selectedCameraId} onValueChange={setSelectedCameraId}>
                <SelectTrigger className="w-[180px] h-10 bg-zinc-900/50 backdrop-blur-xl border-white/10 text-white text-xs">
                  <Camera className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  {availableCameras.map((camera, index) => (
                    <SelectItem 
                      key={camera.deviceId} 
                      value={camera.deviceId}
                      className="text-white hover:bg-zinc-800"
                    >
                      {camera.label || `Camera ${index + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Fit/Fill Toggle */}
            <button
              onClick={() => setFitMode(prev => prev === 'cover' ? 'contain' : 'cover')}
              className="px-4 h-10 rounded-full bg-zinc-900/50 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white text-xs font-bold hover:bg-zinc-800/50 transition-all"
            >
              {fitMode === 'cover' ? 'FIT' : 'FILL'}
            </button>
          </div>

          <div className="flex gap-4">
            {/* Timer Toggle */}
            <button onClick={toggleTimer}>
              <TimerIcon />
            </button>
          </div>
        </div>

        {/* Visibility Toggle (Always visible) */}
        <div className="absolute top-4 right-1/2 translate-x-1/2 z-30">
          <button
            onClick={() => setShowControls(!showControls)}
            className="w-8 h-8 rounded-full bg-zinc-900/30 backdrop-blur-sm flex items-center justify-center text-white/70 hover:bg-zinc-900/50 transition-all"
          >
            {showControls ? <div className="w-4 h-1 bg-white/50 rounded-full" /> : <div className="w-4 h-4 border-2 border-white/50 rounded-full" />}
          </button>
        </div>

        {/* Bottom Controls Bar */}
        <div className={`absolute bottom-0 inset-x-0 z-20 pb-8 pt-12 bg-gradient-to-t from-black/80 to-transparent transition-transform duration-300 ${showControls ? 'translate-y-0' : 'translate-y-full'}`}>

          {/* Individual/Group Toggle - Only show if group prompt is available */}
          {hasGroupPrompt && onGroupPhotoChange && (
            <div className="flex justify-center mb-4">
              <div className="inline-flex items-center gap-1 p-1 rounded-full bg-zinc-900/70 backdrop-blur-sm border border-white/10">
                <button
                  onClick={() => onGroupPhotoChange(false)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    !isGroupPhoto 
                      ? 'bg-cyan-500 text-white shadow-lg' 
                      : 'text-white/60 hover:text-white/80'
                  }`}
                >
                  <span className="text-base">👤</span>
                  Individual
                </button>
                <button
                  onClick={() => onGroupPhotoChange(true)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isGroupPhoto 
                      ? 'bg-purple-500 text-white shadow-lg' 
                      : 'text-white/60 hover:text-white/80'
                  }`}
                >
                  <span className="text-base">👥</span>
                  Group
                </button>
              </div>
            </div>
          )}

          {/* Mode Slider */}
          <div className="flex justify-center gap-8 mb-8 text-sm font-bold tracking-widest">
            <button
              onClick={() => setMode('video')}
              className={`${mode === 'video' ? 'text-yellow-400 scale-110' : 'text-white/50'} transition-all duration-300`}
            >
              VIDEO
            </button>
            <button
              onClick={() => setMode('photo')}
              className={`${mode === 'photo' ? 'text-yellow-400 scale-110' : 'text-white/50'} transition-all duration-300`}
            >
              PHOTO
            </button>
          </div>

          <div className="flex items-center justify-between px-8 max-w-md mx-auto">
            {/* Gallery / Last Photo Preview */}
            <div className="w-12 h-12 rounded-lg bg-zinc-800/50 border border-white/10 flex items-center justify-center overflow-hidden">
              {lastPhotoUrl ? (
                <img
                  src={lastPhotoUrl}
                  alt="Last photo"
                  className="w-full h-full object-cover"
                />
              ) : (
                selectedBackground && (
                  <div className="w-full h-full opacity-50">
                    <div className="w-full h-full bg-primary/20" />
                  </div>
                )
              )}
            </div>

            {/* Shutter Button */}
            <button
              onClick={handleCapture}
              disabled={!isCameraReady || countdown !== null}
              className="group relative w-20 h-20"
            >
              <div className="absolute inset-0 rounded-full border-4 border-white" />
              <div className={`absolute inset-1.5 rounded-full transition-all duration-200 ${mode === 'photo' ? 'bg-white' : 'bg-red-500'} ${!isCameraReady ? 'opacity-50' : 'group-active:scale-90'}`} />
            </button>

            {/* Camera Switcher */}
            <button
              onClick={toggleCamera}
              className="w-12 h-12 rounded-full bg-zinc-800/50 border border-white/10 flex items-center justify-center text-white hover:bg-zinc-700/50 transition-all"
            >
              <RotateCcw className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Minimal Shutter (When controls hidden) */}
        {!showControls && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
            <button
              onClick={handleCapture}
              disabled={!isCameraReady || countdown !== null}
              className="w-20 h-20 rounded-full border-4 border-white/50 flex items-center justify-center"
            >
              <div className="w-16 h-16 rounded-full bg-white/90" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
