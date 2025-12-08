/**
 * ScanAlbumQR Component
 * 
 * Reusable QR scanner component for scanning visitor badges.
 * Uses html5-qrcode library for cross-browser support.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { QrCode, Camera, X, Keyboard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Html5Qrcode } from 'html5-qrcode';

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
  const [shouldStartScanner, setShouldStartScanner] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedRef = useRef(false);

  // Stop camera
  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING state
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setShouldStartScanner(false);
  }, []);

  // Initialize scanner after DOM is ready
  useEffect(() => {
    if (!shouldStartScanner) return;

    const initScanner = async () => {
      // Wait a tick for React to render the element
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const element = document.getElementById('qr-reader');
      if (!element) {
        console.error('QR reader element not found');
        toast.error('Scanner initialization failed. Please try again.');
        setScanStatus('error');
        setIsScanning(false);
        setShouldStartScanner(false);
        return;
      }

      try {
        scannedRef.current = false;
        scannerRef.current = new Html5Qrcode('qr-reader');
        
        await scannerRef.current.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 200, height: 200 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // Prevent double triggers
            if (scannedRef.current) return;
            scannedRef.current = true;
            
            console.log('✅ QR Code detected:', decodedText);
            
            // Extract album code from URL if it's a full URL
            let albumCode = decodedText.trim();
            
            // Check if it's a URL containing /album/ path
            const albumMatch = albumCode.match(/\/album\/([A-Za-z0-9]+)/);
            if (albumMatch) {
              albumCode = albumMatch[1].toUpperCase();
            } else {
              // If it's just a code, use it directly
              albumCode = albumCode.toUpperCase();
            }
            
            setScanStatus('success');
            stopScanning();
            
            setTimeout(() => {
              onScan(albumCode);
            }, 300);
          },
          (errorMessage) => {
            // Ignore "No QR code found" errors - they happen continuously
            if (!errorMessage.includes('No QR code found') && !errorMessage.includes('NotFoundException')) {
              console.warn('QR scan error:', errorMessage);
            }
          }
        );
        
        setScanStatus('scanning');
        
      } catch (error) {
        console.error('Camera access error:', error);
        toast.error('Could not access camera. Please use manual entry.');
        setIsScanning(false);
        setShouldStartScanner(false);
        setScanStatus('error');
        setShowManualEntry(true);
      }
    };

    initScanner();
  }, [shouldStartScanner, onScan, stopScanning]);

  // Start camera for QR scanning
  const startScanning = () => {
    setIsScanning(true);
    setShouldStartScanner(true);
  };

  // Handle manual code submission
  const handleManualSubmit = () => {
    const code = manualCode.trim().toUpperCase();
    if (!code) {
      toast.error('Please enter a valid album code');
      return;
    }
    
    if (code.length < 4) {
      toast.error('Code too short. Please check and try again.');
      return;
    }

    setScanStatus('success');
    setTimeout(() => {
      onScan(code);
    }, 500);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
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
              {/* Always render the qr-reader div, but hide when not scanning */}
              <div 
                id="qr-reader" 
                className={`w-full h-full ${isScanning ? 'block' : 'hidden'}`}
              />
              
              {isScanning && (
                <>
                  {/* Scanning overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div 
                      className="w-48 h-48 border-2 rounded-lg animate-pulse"
                      style={{ borderColor: primaryColor }}
                    />
                  </div>
                  {/* Scanning line animation */}
                  <div 
                    className="absolute left-1/2 -translate-x-1/2 w-48 h-0.5 animate-scan-line pointer-events-none"
                    style={{ backgroundColor: primaryColor }}
                  />
                </>
              )}
              
              {!isScanning && (
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
                placeholder="ABCD1234"
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

      {/* CSS for scan line animation and hide html5-qrcode UI */}
      <style>{`
        @keyframes scan-line {
          0%, 100% { top: 25%; opacity: 0; }
          50% { top: 75%; opacity: 1; }
        }
        .animate-scan-line {
          animation: scan-line 2s ease-in-out infinite;
        }
        /* Hide html5-qrcode default UI elements */
        #qr-reader__scan_region {
          background: transparent !important;
        }
        #qr-reader__dashboard {
          display: none !important;
        }
        #qr-reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
        #qr-reader__header_message {
          display: none !important;
        }
      `}</style>
    </div>
  );
}

export default ScanAlbumQR;
