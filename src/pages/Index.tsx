import { useState } from "react";
import { CameraCapture } from "@/components/CameraCapture";
import { BackgroundSelector, backgrounds } from "@/components/BackgroundSelector";
import { ProcessingLoader } from "@/components/ProcessingLoader";
import { ResultDisplay } from "@/components/ResultDisplay";
import { toast } from "sonner";

type AppState = "selecting" | "capturing" | "processing" | "result";

const Index = () => {
  const [state, setState] = useState<AppState>("selecting");
  const [selectedBackground, setSelectedBackground] = useState<typeof backgrounds[0] | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string>("");
  const [processedPhoto, setProcessedPhoto] = useState<string>("");

  const handleBackgroundSelect = (bg: typeof backgrounds[0]) => {
    setSelectedBackground(bg);
    setState("capturing");
    toast.success(`${bg.name} selected! Position yourself and press capture.`);
  };

  const handlePhotoCapture = async (imageData: string) => {
    setCapturedPhoto(imageData);
    setState("processing");
    
    // TODO: Call fal.ai API via edge function
    // For now, simulate processing
    setTimeout(() => {
      setProcessedPhoto(imageData); // In production, this would be the AI-processed image
      setState("result");
    }, 3000);
  };

  const handleReset = () => {
    setState("selecting");
    setSelectedBackground(null);
    setCapturedPhoto("");
    setProcessedPhoto("");
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      {state === "selecting" && (
        <div className="min-h-screen flex flex-col">
          <header className="p-6 text-center border-b border-border">
            <h1 className="text-4xl md:text-5xl font-bold text-primary mb-2 text-shadow-glow">
              Photo Booth AI
            </h1>
            <p className="text-lg text-secondary">Powered by Siemens Healthineers</p>
          </header>
          <div className="flex-1 flex items-center justify-center">
            <BackgroundSelector
              onSelect={handleBackgroundSelect}
              selectedId={selectedBackground?.id || null}
            />
          </div>
        </div>
      )}

      {state === "capturing" && (
        <CameraCapture
          onCapture={handlePhotoCapture}
          selectedBackground={selectedBackground?.id || null}
        />
      )}

      {state === "processing" && <ProcessingLoader />}

      {state === "result" && (
        <ResultDisplay
          imageUrl={processedPhoto}
          onReset={handleReset}
        />
      )}
    </div>
  );
};

export default Index;
