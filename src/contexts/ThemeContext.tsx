import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getCurrentEvent } from "@/services/adminStorage";

type EventTheme = "default" | "siemens" | "akita" | "custom";

interface BrandConfig {
  theme: EventTheme;
  primaryColor?: string;
  secondaryColor?: string;
  logo?: string;
  brandName?: string;
  tagline?: string;
  mode?: "light" | "dark";
}

interface ThemeContextType {
  brandConfig: BrandConfig;
  updateTheme: (config: Partial<BrandConfig>) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [brandConfig, setBrandConfig] = useState<BrandConfig>({
    theme: "siemens",
    brandName: "Siemens Healthineers",
    tagline: "Do less. Experience the future",
    mode: "light",
  });

  useEffect(() => {
    // Initialize from active event configuration if available
    try {
      const current = getCurrentEvent();
      if (current) {
        setBrandConfig((prev) => ({
          ...prev,
          theme: "custom",
          brandName: current.brandName || prev.brandName,
          tagline: current.tagline || prev.tagline,
          primaryColor: current.primaryColor || prev.primaryColor,
          secondaryColor: current.secondaryColor || prev.secondaryColor,
          mode: current.themeMode || prev.mode || "light",
        }));
      }
    } catch (_) {
      // no-op: admin storage may be empty on first run
    }
  }, []);

  useEffect(() => {
    const mode = brandConfig.mode || "light";

    // Apply theme to document root
    document.documentElement.setAttribute("data-theme", brandConfig.theme);
    document.documentElement.setAttribute("data-theme-mode", mode);
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    
    // Apply custom colors if provided
    if (brandConfig.primaryColor) {
      document.documentElement.style.setProperty("--brand-primary", brandConfig.primaryColor);
    }
    if (brandConfig.secondaryColor) {
      document.documentElement.style.setProperty("--brand-secondary", brandConfig.secondaryColor);
    }
  }, [brandConfig]);

  const updateTheme = (config: Partial<BrandConfig>) => {
    setBrandConfig((prev) => ({ ...prev, ...config }));
  };

  return (
    <ThemeContext.Provider value={{ brandConfig, updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
