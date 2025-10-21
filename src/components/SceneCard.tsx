import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SceneCardProps {
  id: string;
  name: string;
  description?: string;
  image: string;
  active: boolean;
  onClick: () => void;
}

export const SceneCard = ({
  name,
  description,
  image,
  active,
  onClick,
}: SceneCardProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative aspect-[3/4] rounded-2xl overflow-hidden transition-all duration-300",
        "hover:scale-105 hover:-translate-y-2",
        active
          ? "ring-4 ring-primary glow-primary scale-105"
          : "ring-2 ring-border hover:ring-primary/50"
      )}
    >
      {/* Image */}
      <img
        src={image}
        alt={name}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      />
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
      
      {/* Active indicator */}
      {active && (
        <div className="absolute inset-0 bg-primary/10 backdrop-blur-[1px]">
          <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-primary flex items-center justify-center glow-primary animate-scale-in">
            <Check className="w-6 h-6 text-primary-foreground" />
          </div>
        </div>
      )}
      
      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-primary transition-colors">
          {name}
        </h3>
        {description && (
          <p className="text-xs text-white/70 line-clamp-2">
            {description}
          </p>
        )}
      </div>
      
      {/* Hover glow effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
      </div>
    </button>
  );
};
