/**
 * ScanAlbumQR Component
 * 
 * Reusable QR scanner component for scanning visitor badges.
 * Used at booth stations, playground stations, and viewer stations.
 */

import { useState, useEffect, useRef } from 'react';
import { QrCode, Camera, X, Keyboard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface ScanAlbumQRProps {
  onScan: (albumId: string) => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
  primaryColor?: string;
  allowManualEntry?: boolean;
  className?: string;
}

export function ScanAlbumQR({
  onScan,
  onCancel,
  title = "Scan Your Badge",
  subtitle = "Hold your badge QR code up to the camera",
  primaryColor = "#06B6D4",
  allowManualEntry = true,
  className = "",
}: ScanAlbumQRProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const rafRef = useRef<number | null>(null);

  // Start camera for QR scanning
  const startScanning = async () => {
    try {
      setIsScanning(true);
      setScanStatus('scanning');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Initialize native BarcodeDetector if available
      if ('BarcodeDetector' in window) {
        try {
          detectorRef.current = new BarcodeDetector({ formats: ['qr_code'] });
          // Kick off detection loop once video has metadata
          const onCanPlay = () => {
            runDetection();
            videoRef.current?.removeEventListener('canplay', onCanPlay);
          };
          videoRef.current?.addEventListener('canplay', onCanPlay);
        } catch (err) {
          console.warn('BarcodeDetector init failed', err);
          toast.error('QR scanner not supported. Use manual entry.');
          setShowManualEntry(true);
        }
      } else {
        toast.error('QR scanner not supported in this browser. Use manual entry.');
        setShowManualEntry(true);
      }

    } catch (error) {
      console.error('Camera access error:', error);
      toast.error('Could not access camera. Please use manual entry.');
      setIsScanning(false);
      setScanStatus('error');
      setShowManualEntry(true);
    }
  };

  // Stop camera
  const stopScanning = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
    setScanStatus('idle');
  };

  // Handle manual code submission
  const handleManualSubmit = () => {
    const code = manualCode.trim().toUpperCase();
    if (!code) {
      toast.error('Please enter a valid album code');
      return;
    }
    
    // Validate code format (example: ALBUM-XXXX-XXXX)
    if (code.length < 4) {
      toast.error('Code too short. Please check and try again.');
      return;
    }

    setScanStatus('success');
    setTimeout(() => {
      onScan(code);
    }, 500);
  };

  // Simulate QR detection (placeholder for real implementation)
  const simulateScan = () => {
    // In production, this would be called by the QR detection library
    const mockAlbumId = `ALBUM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setScanStatus('success');
    stopScanning();
    setTimeout(() => {
      onScan(mockAlbumId);
    }, 500);
  };

  // Detection loop using native BarcodeDetector
  const runDetection = async () => {
    if (!isScanning || scanStatus !== 'scanning') return;
    if (!videoRef.current || !detectorRef.current) {
      rafRef.current = requestAnimationFrame(runDetection);
      return;
    }
    try {
      const barcodes = await detectorRef.current.detect(videoRef.current);
      if (barcodes.length > 0) {
        const raw = barcodes[0].rawValue?.trim();
        if (raw) {
          setScanStatus('success');
          stopScanning();
          setTimeout(() => onScan(raw), 300);
          return;
        }
      }
    } catch (err) {
      console.warn('Barcode detect error', err);
    }
    rafRef.current = requestAnimationFrame(runDetection);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950 ${className}`}>
      {/* Background gradient */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${primaryColor}40 0%, transparent 50%)`,
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
          <p className="text-zinc-400">{subtitle}</p>
        </div>

        {/* Scanner Area */}
        {!showManualEntry ? (
          <div className="space-y-6">
            {/* QR Scanner Box */}
            <div 
              className="relative aspect-square rounded-2xl overflow-hidden border-2"
              style={{ borderColor: primaryColor }}
            >
              {isScanning ? (
                <>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                  {/* Scanning overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div 
                      className="w-48 h-48 border-2 rounded-lg animate-pulse"
                      style={{ borderColor: primaryColor }}
                    />
                  </div>
                  {/* Scanning line animation */}
                  <div 
                    className="absolute left-1/2 -translate-x-1/2 w-48 h-0.5 animate-scan-line"
                    style={{ backgroundColor: primaryColor }}
                  />
                </>
              ) : (
                <div 
                  className="w-full h-full flex flex-col items-center justify-center"
                  style={{ backgroundColor: `${primaryColor}10` }}
                >
                  {scanStatus === 'success' ? (
                    <CheckCircle2 className="w-20 h-20 text-green-400 animate-bounce" />
                  ) : scanStatus === 'error' ? (
                    <AlertCircle className="w-20 h-20 text-red-400" />
                  ) : (
                    <QrCode className="w-20 h-20" style={{ color: primaryColor }} />
                  )}
                  <p className="mt-4 text-zinc-400">
                    {scanStatus === 'success' ? 'Badge detected!' : 
                     scanStatus === 'error' ? 'Scan failed' : 
                     'Ready to scan'}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {!isScanning ? (
                <Button
                  onClick={startScanning}
                  className="w-full h-14 text-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Start Scanning
                </Button>
              ) : (
                <Button
                  onClick={stopScanning}
                  variant="outline"
                  className="w-full h-14 text-lg border-white/20 text-white"
                >
                  <X className="w-5 h-5 mr-2" />
                  Stop Scanning
                </Button>
              )}

              {/* Dev button to simulate scan */}
              {isScanning && import.meta.env.DEV && (
                <Button
                  onClick={simulateScan}
                  variant="outline"
                  size="sm"
                  className="w-full border-amber-500/30 text-amber-400"
                >
                  [DEV] Simulate Scan
                </Button>
              )}

              {allowManualEntry && (
                <Button
                  onClick={() => {
                    stopScanning();
                    setShowManualEntry(true);
                  }}
                  variant="ghost"
                  className="w-full text-zinc-400 hover:text-white"
                >
                  <Keyboard className="w-4 h-4 mr-2" />
                  Enter Code Manually
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* Manual Entry Form */
          <div className="space-y-6">
            <div 
              className="p-8 rounded-2xl border"
              style={{ 
                borderColor: `${primaryColor}50`,
                backgroundColor: `${primaryColor}10`
              }}
            >
              <Keyboard className="w-12 h-12 mx-auto mb-4" style={{ color: primaryColor }} />
              <p className="text-center text-zinc-400 mb-4">
                Enter the code printed on your badge
              </p>
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="ALBUM-XXXX-XXXX"
                className="text-center text-xl font-mono bg-black/40 border-white/20 text-white h-14"
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              />
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleManualSubmit}
                className="w-full h-14 text-lg"
                style={{ backgroundColor: primaryColor }}
                disabled={!manualCode.trim()}
              >
                Continue
              </Button>
              <Button
                onClick={() => setShowManualEntry(false)}
                variant="ghost"
                className="w-full text-zinc-400 hover:text-white"
              >
                <Camera className="w-4 h-4 mr-2" />
                Use Camera Instead
              </Button>
            </div>
          </div>
        )}

        {/* Cancel Button */}
        {onCancel && (
          <Button
            onClick={onCancel}
            variant="ghost"
            className="w-full mt-4 text-zinc-500 hover:text-zinc-300"
          >
            Cancel
          </Button>
        )}
      </div>

      {/* CSS for scan line animation */}
      <style>{`
        @keyframes scan-line {
          0%, 100% { top: 25%; opacity: 0; }
          50% { top: 75%; opacity: 1; }
        }
        .animate-scan-line {
          animation: scan-line 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default ScanAlbumQR;

