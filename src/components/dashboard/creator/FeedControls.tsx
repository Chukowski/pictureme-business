import { useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";

export function InfiniteScrollTrigger({ onIntersect, isLoading }: { onIntersect: () => void; isLoading: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    const isLoadingRef = useRef(isLoading);
    isLoadingRef.current = isLoading;

    useEffect(() => {
        if (!ref.current) return;
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !isLoadingRef.current) {
                onIntersect();
            }
        }, { threshold: 0.1 });
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [onIntersect]);

    return (
        <div className="py-8 flex justify-center" ref={ref}>
            {isLoading && (
                <div className="flex items-center gap-2 text-zinc-500 animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-[#D1F349]" />
                    <span className="text-xs font-bold uppercase tracking-widest text-[#D1F349]">Loading...</span>
                </div>
            )}
        </div>
    );
}

export function EndOfFeedIndicator() {
    return (
        <div className="py-8 flex justify-center">
            <span className="text-xs text-zinc-600 uppercase tracking-widest">You've reached the end</span>
        </div>
    );
}

export function PendingGenerationsSection({ pendingJobs }: { pendingJobs: Array<{ id: string | number; prompt?: string }> }) {
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                Generating...
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {pendingJobs.map((job) => (
                    <div key={job.id} className="aspect-square rounded-xl bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-white/10 flex flex-col items-center justify-center p-4">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-indigo-400 animate-spin"></div>
                            <SparklesIcon className="absolute inset-0 m-auto w-5 h-5 text-indigo-400 animate-pulse" />
                        </div>
                        <p className="mt-3 text-xs text-white/60 text-center line-clamp-2">{job.prompt || 'Processing...'}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

import { Sparkles as SparklesIcon } from "lucide-react";
