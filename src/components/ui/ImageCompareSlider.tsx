import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Split } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageCompareSliderProps {
    beforeImage: string;
    afterImage: string;
    beforeLabel?: string;
    afterLabel?: string;
    className?: string;
    aspectRatio?: string;
}

export const ImageCompareSlider = ({
    beforeImage,
    afterImage,
    beforeLabel = "Original",
    afterLabel = "AI Gen",
    className,
    aspectRatio = "aspect-[3/4]"
}: ImageCompareSliderProps) => {
    const [position, setPosition] = useState(50);
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMove = useCallback((clientX: number) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const width = rect.width;

        let newPosition = (x / width) * 100;
        newPosition = Math.max(0, Math.min(100, newPosition));

        setPosition(newPosition);
    }, []);

    const handleMouseDown = useCallback(() => {
        setIsResizing(true);
    }, []);

    const handleMouseUp = useCallback(() => {
        setIsResizing(false);
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing) return;
        handleMove(e.clientX);
    }, [isResizing, handleMove]);

    const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        handleMove(e.touches[0].clientX);
    }, [handleMove]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, handleMouseMove, handleMouseUp]);

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative group overflow-hidden select-none touch-none",
                aspectRatio,
                className
            )}
            onMouseDown={handleMouseDown}
            onTouchMove={handleTouchMove}
        >
            {/* After Image (Primary/AI) */}
            <div className="absolute inset-0 w-full h-full">
                <img
                    src={afterImage}
                    alt="After"
                    className="w-full h-full object-contain pointer-events-none"
                />

                {/* Labels */}
                <div className="absolute bottom-4 right-4 z-10">
                    <div className="px-3 py-1 bg-black/50 backdrop-blur-md rounded-full border border-white/10 shadow-lg">
                        <span className="text-[10px] font-black text-[#D1F349] uppercase tracking-widest">{afterLabel}</span>
                    </div>
                </div>
            </div>

            {/* Before Image (Original) - Clipped */}
            <div
                className="absolute inset-0 w-full h-full"
                style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
            >
                <img
                    src={beforeImage}
                    alt="Before"
                    className="w-full h-full object-contain pointer-events-none grayscale-[0.3]"
                />

                {/* Labels */}
                <div className="absolute bottom-4 left-4 z-10">
                    <div className="px-3 py-1 bg-[#D1F349] rounded-full shadow-lg">
                        <span className="text-[10px] font-black text-black uppercase tracking-widest">{beforeLabel}</span>
                    </div>
                </div>
            </div>

            {/* Slider Handle */}
            <div
                className="absolute inset-y-0 z-20"
                style={{ left: `${position}%` }}
            >
                {/* Line */}
                <div className="absolute inset-y-0 -left-px w-0.5 bg-white/50 backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.5)]" />

                {/* Hub */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-2xl flex items-center justify-center cursor-ew-resize hover:scale-110 active:scale-95 transition-transform group-active:scale-90 border-4 border-black">
                    <Split className="w-5 h-5 text-black" />
                </div>

                {/* Micro-animations: Hint Arrows */}
                <AnimatePresence>
                    {!isResizing && (
                        <>
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 10 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ repeat: Infinity, duration: 2, repeatType: "reverse" }}
                                className="absolute top-1/2 right-[100%] ml-4 -translate-y-1/2"
                            >
                                <ChevronLeft className="w-6 h-6 text-white/40" />
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: -10 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ repeat: Infinity, duration: 2, repeatType: "reverse" }}
                                className="absolute top-1/2 left-[100%] ml-4 -translate-y-1/2"
                            >
                                <ChevronRight className="w-6 h-6 text-white/40" />
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Interaction Hint Overlay */}
            <div className="absolute inset-x-0 top-6 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="px-4 py-2 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center gap-3">
                    <span className="text-[9px] font-black text-white uppercase tracking-widest">Slide to compare</span>
                </div>
            </div>
        </div>
    );
};
