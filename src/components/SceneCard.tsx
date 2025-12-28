import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SceneCardProps {
  id: string;
  name: string;
  description?: string;
  image: string;
  active: boolean;
  isCustomPrompt?: boolean;
  onClick: () => void;
}

export const SceneCard = ({
  name,
  description,
  image,
  active,
  isCustomPrompt,
  onClick,
}: SceneCardProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-300 border border-gray-200/70 dark:border-white/10 bg-card/90 backdrop-blur-sm",
        "md:hover:-translate-y-2 md:hover:scale-[1.03]",
        active
          ? "ring-[3px] ring-primary shadow-[0_24px_55px_-20px_rgba(10,14,30,0.85)]"
          : "ring-1 ring-border/60 dark:ring-white/8 md:hover:ring-primary/40"
      )}
    >
      {/* Image */}
      <img
        src={image}
        alt={name}
        className="w-full h-full object-cover transition-transform duration-500 md:group-hover:scale-110"
      />
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#101112] via-[#101112]/40 to-transparent opacity-60 md:group-hover:opacity-80 transition-opacity" />
      
      {/* Custom Prompt Badge */}
      {isCustomPrompt && (
        <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10">
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 shadow-lg">
            <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            Custom
          </div>
        </div>
      )}
      
      {/* Active indicator */}
      {active && (
        <div className="absolute inset-0 bg-primary/15 backdrop-blur-[1px]">
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary flex items-center justify-center glow-primary animate-scale-in">
            <Check className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
          </div>
        </div>
      )}
      
      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 text-left">
        <h3 className="text-base sm:text-lg font-bold text-white mb-0.5 sm:mb-1 md:group-hover:text-primary transition-colors line-clamp-1">
          {name}
        </h3>
        {description && (
          <p className="text-[10px] sm:text-xs text-white/70 line-clamp-2">
            {description}
          </p>
        )}
      </div>
      
      {/* Hover glow effect */}
      <div className="absolute inset-0 opacity-0 md:group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
      </div>
    </button>
  );
};
