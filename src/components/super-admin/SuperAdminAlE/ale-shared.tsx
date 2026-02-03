import { motion } from "framer-motion";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const TechnicalTooltip = ({ children, text }: { children: React.ReactNode, text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      {children}
    </TooltipTrigger>
    <TooltipContent className="bg-zinc-900 border-white/10 text-white font-mono text-[10px] uppercase tracking-widest p-2 rounded-none z-[110]">
      {text}
    </TooltipContent>
  </Tooltip>
);

export const TabAnimationWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, x: 10 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -10 }}
    transition={{ duration: 0.2 }}
  >
    {children}
  </motion.div>
);

export const HUDContainer = ({ children, title, subtitle, icon: Icon, className }: { children: React.ReactNode, title: string, subtitle?: string, icon?: any, className?: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn("relative group", className)}
  >
    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-indigo-500/50 z-10" />
    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-indigo-500/50 z-10" />
    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-indigo-500/50 z-10" />
    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-indigo-500/50 z-10" />
    
    <Card className="bg-black/40 backdrop-blur-xl border-white/5 overflow-hidden ring-1 ring-white/5">
      <CardHeader className="border-b border-white/5 bg-white/5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <Icon className="w-4 h-4 text-indigo-400" />
              </div>
            )}
            <div>
              <CardTitle className="text-sm font-mono tracking-widest uppercase text-white/90">{title}</CardTitle>
              {subtitle && <CardDescription className="text-[10px] uppercase tracking-tighter text-zinc-500 font-mono mt-0.5">{subtitle}</CardDescription>}
            </div>
          </div>
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 animate-pulse" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {children}
      </CardContent>
    </Card>
  </motion.div>
);

export const DecorativeGrid = () => (
  <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0 overflow-hidden">
    <div className="absolute inset-0" style={{ 
      backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
      backgroundSize: '40px 40px'
    }} />
  </div>
);

export const ScanLine = () => (
  <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
    <motion.div 
      initial={{ top: "-10%" }}
      animate={{ top: "110%" }}
      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      className="absolute left-0 w-full h-[10%] bg-gradient-to-b from-transparent via-indigo-500/5 to-transparent shadow-[0_0_20px_rgba(99,102,241,0.05)]"
    />
  </div>
);
