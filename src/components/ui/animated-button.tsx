import React from "react";
import { cn } from "@/lib/utils";

export const Component = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({ className, children, ...props }, ref) => {
    return (
        <button
            ref={ref}
            className={cn(
                "relative inline-flex overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50 transition-transform active:scale-95",
                className
            )}
            {...props}
        >
            <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#D1F349_0%,#000000_50%,#D1F349_100%)]" />
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-zinc-950 text-sm font-medium text-white backdrop-blur-3xl hover:bg-zinc-900/90 transition-colors">
                {children}
            </span>
        </button>
    );
});
Component.displayName = "AnimatedButton";
