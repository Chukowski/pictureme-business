import React from "react";
import { cn } from "@/lib/utils";

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    speed?: string;
    innerBackground?: string;
    showBorder?: boolean;
}

export const Component = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(({ className, children, speed = "3s", innerBackground, showBorder = true, ...props }, ref) => {
    return (
        <button
            ref={ref}
            className={cn(
                "relative inline-flex focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50 transition-transform active:scale-95",
                showBorder ? "p-[3px] overflow-hidden" : "p-0 overflow-visible",
                className
            )}
            {...props}
        >
            {showBorder && (
                <>
                    <span
                        className="absolute inset-[-20%] animate-pulse-border bg-[#D1F349]/40 blur-sm"
                    />
                    <span
                        className="absolute inset-[-1000%] animate-[spin_var(--speed)_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#D1F349_0%,#ffffff_50%,#D1F349_100%)] opacity-80"
                        style={{ "--speed": speed } as React.CSSProperties}
                    />
                </>
            )}
            <span className={cn(
                "inline-flex h-full w-full cursor-pointer items-center justify-center rounded-[inherit] text-sm font-medium text-white backdrop-blur-3xl transition-colors",
                innerBackground || "bg-card hover:bg-card/90"
            )}>
                {children}
            </span>
        </button>
    );
});
Component.displayName = "AnimatedButton";
