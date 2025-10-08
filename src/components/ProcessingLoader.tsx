import { Loader2 } from "lucide-react";

interface ProcessingLoaderProps {
  status?: string;
}

export const ProcessingLoader = ({ status = "AI is processing your photo..." }: ProcessingLoaderProps) => {
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50">
      <div className="text-center space-y-6 px-4">
        <div className="relative">
          <Loader2 className="w-24 h-24 text-primary animate-spin glow-teal" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-primary">Creating Magic</h2>
          <p className="text-muted-foreground animate-pulse">{status}</p>
        </div>
      </div>
    </div>
  );
};
