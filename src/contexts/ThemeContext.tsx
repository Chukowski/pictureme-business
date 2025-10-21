import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type EventTheme = "default" | "siemens" | "akita" | "custom";

interface BrandConfig {
  theme: EventTheme;
  primaryColor?: string;
  secondaryColor?: string;
  logo?: string;
  brandName?: string;
  tagline?: string;
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
  });

  useEffect(() => {
    // Apply theme to document root
    document.documentElement.setAttribute("data-theme", brandConfig.theme);
    
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
