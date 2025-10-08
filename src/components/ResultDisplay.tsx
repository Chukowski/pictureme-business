import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Mail, RotateCcw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ResultDisplayProps {
  imageUrl: string;
  onReset: () => void;
}

export const ResultDisplay = ({ imageUrl, onReset }: ResultDisplayProps) => {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `photobooth-${Date.now()}.jpg`;
    link.click();
    toast.success("Photo downloaded!");
  };

  const handleEmailSend = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSending(true);
    // TODO: Integrate with email service via edge function
    setTimeout(() => {
      toast.success("Photo sent to your email!");
      setIsSending(false);
      setEmail("");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-dark p-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Result Image */}
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden shadow-elegant">
              <img
                src={imageUrl}
                alt="Processed photo"
                className="w-full h-auto"
              />
              {/* Siemens Branding Overlay */}
              <div className="absolute top-6 left-0 right-0 text-center">
                <h1 className="text-4xl font-bold text-foreground text-shadow-glow">
                  Siemens Healthineers
                </h1>
              </div>
              <div className="absolute bottom-6 left-6 right-6">
                <p className="text-5xl font-bold text-secondary text-shadow-glow mb-2">
                  Do less.
                </p>
                <p className="text-xl text-foreground">
                  Experience the future
                </p>
              </div>
            </div>

            <Button
              onClick={onReset}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Take Another Photo
            </Button>
          </div>

          {/* QR Code & Sharing */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl p-8 text-center space-y-4">
              <h3 className="text-2xl font-bold text-primary">Scan to Download</h3>
              <div className="bg-white p-6 rounded-xl inline-block">
                <QRCodeSVG
                  value={imageUrl}
                  size={256}
                  level="H"
                  includeMargin
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Scan this QR code with your phone to download the high-resolution photo
              </p>
            </div>

            <div className="bg-card rounded-2xl p-8 space-y-4">
              <h3 className="text-2xl font-bold text-primary">Email Your Photo</h3>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleEmailSend}
                  disabled={isSending}
                  className="bg-secondary hover:bg-secondary/90"
                >
                  <Mail className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={handleDownload}
                size="lg"
                className="bg-primary hover:bg-primary-glow"
              >
                <Download className="w-5 h-5 mr-2" />
                Download
              </Button>
              <Button
                onClick={() => toast.info("Share feature coming soon!")}
                size="lg"
                variant="outline"
              >
                <Share2 className="w-5 h-5 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
