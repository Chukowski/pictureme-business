import { Sparkles } from "lucide-react";

interface ProcessingLoaderProps {
  status?: string;
}

export const ProcessingLoader = ({ status = "AI is processing your photo..." }: ProcessingLoaderProps) => {
  return (
    <div className="fixed inset-0 gradient-dark backdrop-blur-md flex items-center justify-center z-50 overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-75" />
      </div>
      
      <div className="relative text-center space-y-8 px-4 max-w-md">
        {/* Circular progress indicator */}
        <div className="relative mx-auto w-32 h-32">
          {/* Outer rotating ring */}
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary glow-primary animate-spin" />
          
          {/* Inner pulsing circle */}
          <div className="absolute inset-4 rounded-full bg-gradient-primary opacity-30 animate-pulse" />
          
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-primary animate-pulse" />
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="space-y-3">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-primary animate-[scale-in_1.5s_ease-in-out_infinite] origin-left" />
          </div>
        </div>
        
        {/* Status text */}
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-primary">Creating Magic</h2>
          <p className="text-muted-foreground animate-pulse">{status}</p>
        </div>
      </div>
    </div>
  );
};
