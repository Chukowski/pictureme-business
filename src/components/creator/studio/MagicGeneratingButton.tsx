import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MagicGeneratingButtonProps {
    count: number;
    onClick: () => void;
    className?: string;
}

export const MagicGeneratingButton = ({ count, onClick, className }: MagicGeneratingButtonProps) => {
    if (count === 0) return null;

    return (
        <motion.button
            onClick={onClick}
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 20 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
                "fixed bottom-24 right-6 md:bottom-8 md:right-8 z-[100]",
                "flex items-center gap-3 px-4 py-4 rounded-full",
                "bg-[#D1F349] text-black shadow-[0_0_30px_rgba(209,243,73,0.4)] border-4 border-black",
                "group overflow-hidden transition-all duration-300",
                className
            )}
        >
            {/* Animated Ring */}
            <motion.div
                className="absolute inset-0 border-2 border-black/20 rounded-full"
                animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.5, 0.1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="relative">
                <motion.div
                    animate={{
                        rotate: [0, 15, -15, 0],
                        scale: [1, 1.1, 1]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                    <Wand2 className="w-6 h-6" />
                </motion.div>

                {/* Sparkles */}
                <motion.div
                    className="absolute -top-1 -right-1"
                    animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                >
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                </motion.div>
            </div>

            <div className="flex flex-col items-start leading-none pr-1">
                <span className="text-[10px] font-black uppercase tracking-tighter opacity-70">Creating</span>
                <span className="text-xl font-black">{count}</span>
            </div>

            {/* Pulsing Border */}
            <motion.div
                className="absolute inset-0 rounded-full border-2 border-[#D1F349]"
                animate={{ scale: [1, 1.1, 1], opacity: [1, 0, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
            />
        </motion.button>
    );
};
