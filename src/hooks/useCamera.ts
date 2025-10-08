import { useState, useEffect, useRef } from "react";

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export const useCamera = (selectedDeviceId?: string) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);

  useEffect(() => {
    enumerateCameras();
  }, []);

  useEffect(() => {
    if (availableCameras.length > 0) {
      startCamera(selectedDeviceId);
    }
    return () => {
      stopCamera();
    };
  }, [selectedDeviceId, availableCameras]);

  const enumerateCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter(device => device.kind === "videoinput")
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 5)}`
        }));
      setAvailableCameras(videoDevices);
    } catch (err) {
      console.error("Error enumerating cameras:", err);
    }
  };

  const startCamera = async (deviceId?: string) => {
    try {
      // Stop existing stream first
      stopCamera();

      const constraints: MediaStreamConstraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        videoRef.current.onloadedmetadata = () => {
          setIsReady(true);
        };
      }
    } catch (err) {
      setError("Failed to access camera. Please check permissions.");
      console.error("Camera error:", err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsReady(false);
    }
  };

  const captureFrame = (): string | null => {
    if (!videoRef.current || !isReady) return null;

    const canvas = document.createElement("canvas");
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.95);
  };

  return {
    videoRef,
    isReady,
    error,
    captureFrame,
    stopCamera,
    availableCameras
  };
};
