import { useState } from "react";
import { CameraCapture } from "@/components/CameraCapture";
import { BackgroundSelector, backgrounds } from "@/components/BackgroundSelector";
import { ProcessingLoader } from "@/components/ProcessingLoader";
import { ResultDisplay } from "@/components/ResultDisplay";
import { toast } from "sonner";
import { processImageWithAI, downloadImageAsBase64 } from "@/services/aiProcessor";
import { saveProcessedPhoto } from "@/services/localStorage";

type AppState = "selecting" | "capturing" | "processing" | "result";

const Index = () => {
  const [state, setState] = useState<AppState>("selecting");
  const [selectedBackground, setSelectedBackground] = useState<typeof backgrounds[0] | null>(backgrounds[0]); // Default to first background
  const [capturedPhoto, setCapturedPhoto] = useState<string>("");
  const [processedPhoto, setProcessedPhoto] = useState<string>("");
  const [processingStatus, setProcessingStatus] = useState<string>("Starting...");
  const [shareCode, setShareCode] = useState<string>("");

  const handleBackgroundSelect = (bg: typeof backgrounds[0]) => {
    setSelectedBackground(bg);
  };

  const handleConfirmBackground = () => {
    if (selectedBackground) {
      setState("capturing");
      toast.success(`${selectedBackground.name} selected! Position yourself and press capture.`);
    }
  };

  const handlePhotoCapture = async (imageData: string) => {
    if (!selectedBackground) {
      toast.error("No background selected");
      return;
    }

    setCapturedPhoto(imageData);
    setState("processing");
    setProcessingStatus("Preparing your photo...");

    try {
      // Process with AI - send both user photo and background image
      const result = await processImageWithAI({
        userPhotoBase64: imageData,
        backgroundPrompt: selectedBackground.prompt,
        backgroundImageUrl: selectedBackground.image, // Pass the background image
        onProgress: (status, logs) => {
          if (status === "queued") {
            setProcessingStatus("Waiting in queue...");
          } else if (status === "processing") {
            setProcessingStatus("AI is working its magic...");
            if (logs && logs.length > 0) {
              console.log("AI logs:", logs);
            }
          }
        },
      });

      setProcessingStatus("Downloading result...");
      
      // Download the processed image as base64 for localStorage
      const processedBase64 = await downloadImageAsBase64(result.url);
      setProcessedPhoto(processedBase64);

      // Save to localStorage
      const savedPhoto = saveProcessedPhoto({
        originalImageBase64: imageData,
        processedImageBase64: processedBase64,
        backgroundId: selectedBackground.id,
        backgroundName: selectedBackground.name,
        prompt: selectedBackground.prompt,
      });

      setShareCode(savedPhoto.shareCode);
      
      toast.success("Your photo is ready! 🎉");
      setState("result");
    } catch (error: any) {
      console.error("Processing error:", error);
      toast.error(error.message || "Failed to process photo. Please try again.");
      
      // Fall back to original photo if AI fails
      setProcessedPhoto(imageData);
      setState("result");
    }
  };

  const handleReset = () => {
    setState("selecting");
    setSelectedBackground(null);
    setCapturedPhoto("");
    setProcessedPhoto("");
    setShareCode("");
    setProcessingStatus("Starting...");
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      {state === "selecting" && (
        <div className="min-h-screen flex flex-col bg-gradient-dark">
          {/* Modern header with subtle background */}
          <header className="relative p-6 md:p-8 text-center border-b border-border/30">
            <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-transparent" />
            <div className="relative">
              <h1 className="text-4xl md:text-6xl font-bold mb-3">
                <span className="bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">
                  AI Photo Booth
                </span>
              </h1>
              <p className="text-base md:text-xl text-muted-foreground font-medium">
                Powered by Akitá
              </p>
            </div>
          </header>
          
          <div className="flex-1 flex items-center justify-center">
            <BackgroundSelector
              onSelect={handleBackgroundSelect}
              onConfirm={handleConfirmBackground}
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

      {state === "processing" && (
        <ProcessingLoader status={processingStatus} />
      )}

      {state === "result" && (
        <ResultDisplay
          imageUrl={processedPhoto}
          shareCode={shareCode}
          onReset={handleReset}
        />
      )}
    </div>
  );
};

export default Index;
