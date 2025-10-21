import { useEffect, useState } from "react";
import { getCurrentEvent } from "@/services/adminStorage";
import { useTheme } from "@/contexts/ThemeContext";

export function EventTitle() {
  const { brandConfig } = useTheme();
  const [title, setTitle] = useState<string>("");

  useEffect(() => {
    try {
      const current = getCurrentEvent();
      if (current?.name) {
        setTitle(current.name);
      } else {
        setTitle(brandConfig.brandName || "AI Photo Booth");
      }
    } catch {
      setTitle("AI Photo Booth");
    }
  }, [brandConfig.brandName, brandConfig.tagline]);

  if (!title) return null;

  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none px-4">
      <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground drop-shadow-sm">
        {title}
      </h1>
      {brandConfig.tagline && (
        <p className="mt-2 text-sm md:text-base text-muted-foreground">
          {brandConfig.tagline}
        </p>
      )}
      <div className="mt-3 h-1.5 w-16 md:w-20 mx-auto rounded-full gradient-primary opacity-80" />
    </div>
  );
}
