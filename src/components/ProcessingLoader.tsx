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
      {/* Glass background that adapts to theme */}
      <div className="absolute inset-0 bg-white/95 dark:bg-[#101112]/85 backdrop-blur-2xl transition-colors duration-700" />

      {/* Aurora layers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="animate-aurora absolute -top-32 -left-24 w-[60vw] max-w-[720px] h-[60vw] max-h-[720px] bg-gradient-to-r from-primary/25 via-secondary/15 to-primary/30 dark:from-primary/35 dark:via-secondary/20 dark:to-primary/45 blur-3xl" />
        <div className="animate-aurora-delay absolute -bottom-40 -right-24 w-[55vw] max-w-[680px] h-[55vw] max-h-[680px] bg-gradient-to-br from-secondary/20 via-primary/15 to-accent/20 dark:from-secondary/35 dark:via-primary/15 dark:to-accent/35 blur-3xl" />
        <div className="animate-aurora-slow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] max-w-[520px] h-[40vw] max-h-[520px] bg-gradient-to-tr from-white/10 via-primary/10 to-transparent dark:from-white/10 dark:via-primary/5 dark:to-transparent blur-3xl" />
      </div>

      <div className="relative max-w-lg w-full px-6 py-12 text-center space-y-10">
        <div className="relative mx-auto flex flex-col items-center justify-center gap-6">
          <div className="absolute -inset-8 rounded-full bg-gradient-to-br from-white/25 via-white/10 to-transparent dark:from-white/10 dark:via-white/5 dark:to-transparent blur-2xl" />
          <div className="absolute -inset-10 rounded-full border border-white/30 dark:border-white/10 opacity-60 animate-pulse-ring" />
          <UniqueLoading size="lg" className="relative" />
        </div>

        {/* Progress bar */}
        <div className="space-y-4">
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/20 dark:bg-white/10 shadow-inner">
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-primary animate-shimmer-bar" />
          </div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground dark:text-gray-400">Enhancing with AI</p>
        </div>

        {/* Status text */}
        <div className="space-y-3">
          <h2 className="text-3xl font-semibold text-transparent bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text animate-shimmer-text">
            AI is doing its magic
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground dark:text-gray-300">
            {displayMessage}
          </p>
        </div>
      </div>
    </div>
  );
};
