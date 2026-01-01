import { UniqueLoading } from '@/components/UniqueLoading';

interface ProcessingLoaderProps {
  status?: string;
}

export const ProcessingLoader = ({ status = "AI is doing its magic..." }: ProcessingLoaderProps) => {
  const normalizeStatus = (value: string) => value.toLowerCase().trim();

  const getStatusMessage = (value: string): string => {
    const normalized = normalizeStatus(value);

    if (normalized.includes("queued")) return "Waiting for the AI pipeline to start...";
    if (normalized.includes("processing")) return "We are blending your photo with the selected background.";
    if (normalized.includes("applying_branding")) return "Applying your event branding and overlays.";
    if (normalized.includes("magic")) return "Hold tight! The AI is weaving lighting and details.";

    return value;
  };

  const displayMessage = getStatusMessage(status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {/* Brand glass background */}
      <div className="absolute inset-0 bg-[#0A0A0B]/95 backdrop-blur-2xl transition-colors duration-700" />

      {/* Aurora brand layers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="animate-aurora absolute -top-32 -left-24 w-[70vw] h-[70vw] bg-gradient-to-r from-primary/30 via-secondary/10 to-primary/40 blur-[120px] opacity-60" />
        <div className="animate-aurora-delay absolute -bottom-40 -right-24 w-[60vw] h-[60vw] bg-gradient-to-br from-secondary/30 via-primary/10 to-accent/30 blur-[120px] opacity-60" />
      </div>

      <div className="relative max-w-lg w-full px-8 flex flex-col items-center">
        {/* Loader Container */}
        <div className="relative mb-12">
          {/* Animated rings */}
          <div className="absolute -inset-16 rounded-full border border-primary/20 animate-pulse-ring-slow" />
          <div className="absolute -inset-10 rounded-full border border-white/10 animate-pulse-ring" />

          <div className="relative bg-card/40 backdrop-blur-md rounded-full p-12 border border-white/5 shadow-2xl">
            <UniqueLoading size="lg" className="relative scale-125" />
          </div>
        </div>

        {/* Progress & Status */}
        <div className="w-full space-y-8 text-center">
          <div className="space-y-4">
            <div className="flex justify-between items-center text-[10px] uppercase tracking-[0.3em] font-bold text-white/40 mb-2">
              <span>System Online</span>
              <span className="animate-pulse">Active Processing</span>
            </div>
            <div className="relative h-[2px] w-full overflow-hidden rounded-full bg-white/5">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent animate-shimmer-bar" />
            </div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-primary/80 font-black animate-pulse">
              Enhancing with AI
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-black text-transparent bg-gradient-to-b from-white via-white to-white/40 bg-clip-text tracking-tight leading-tight">
              Crafting Your Magic
            </h2>
            <p className="text-lg text-zinc-400 font-medium max-w-xs mx-auto leading-relaxed">
              {displayMessage}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
