import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    LayoutGrid,
    Sparkles,
    LayoutTemplate,
    Store,
    Library,
    Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type MainView = "home" | "create" | "templates" | "booths" | "gallery";

interface AppRailProps {
    activeView: MainView;
    onViewChange: (v: MainView) => void;
    onToggle: () => void;
}

export const AppRail = ({ activeView, onViewChange, onToggle }: AppRailProps) => {
    const navigate = useNavigate();

    return (
        <div className="w-[60px] flex flex-col items-center py-4 z-30 flex-shrink-0 ml-3 my-3 rounded-2xl bg-[#101112]/40 backdrop-blur-md border border-white/10 shadow-2xl h-fit sticky top-3 transition-all duration-300">
            {/* Toggle Button */}
            <button
                onClick={onToggle}
                className="mb-4 p-2 text-zinc-500 hover:text-white transition-colors"
                title="Collapse Menu"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex flex-col gap-6 w-full mb-6">
                <button
                    onClick={() => onViewChange("gallery")}
                    className={cn(
                        "w-full flex flex-col items-center gap-1 py-2 relative group",
                        (activeView === "home" || activeView === "gallery") ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                    )}
                >
                    <div className={cn(
                        "p-2.5 rounded-xl transition-all",
                        (activeView === "home" || activeView === "gallery") ? "bg-white/10" : "group-hover:bg-white/5"
                    )}>
                        <LayoutGrid className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-medium">Gallery</span>
                    {(activeView === "home" || activeView === "gallery") && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />}
                </button>

                <button
                    onClick={() => onViewChange("create")}
                    className={cn(
                        "w-full flex flex-col items-center gap-1 py-2 relative group",
                        activeView === "create" ? "text-[#D1F349]" : "text-zinc-500 hover:text-zinc-300"
                    )}
                >
                    <div className={cn(
                        "p-2.5 rounded-xl transition-all",
                        activeView === "create" ? "bg-white/10" : "group-hover:bg-white/5"
                    )}>
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-medium">Create</span>
                    {activeView === "create" && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#D1F349] rounded-r-full" />}
                </button>

                <button
                    onClick={() => onViewChange("templates")}
                    className={cn(
                        "w-full flex flex-col items-center gap-1 py-2 relative group",
                        activeView === "templates" ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                    )}
                >
                    <div className={cn(
                        "p-2.5 rounded-xl transition-all",
                        activeView === "templates" ? "bg-white/10" : "group-hover:bg-white/5"
                    )}>
                        <LayoutTemplate className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-medium">Models</span>
                    {activeView === "templates" && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />}
                </button>

                <button
                    onClick={() => onViewChange("booths")}
                    className={cn(
                        "w-full flex flex-col items-center gap-1 py-2 relative group",
                        activeView === "booths" ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                    )}
                >
                    <div className={cn(
                        "p-2.5 rounded-xl transition-all",
                        activeView === "booths" ? "bg-white/10" : "group-hover:bg-white/5"
                    )}>
                        <Store className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-medium">Booths</span>
                    {activeView === "booths" && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />}
                </button>
            </div>

            <div className="flex flex-col gap-6 w-full">
                <button
                    onClick={() => navigate('/creator/settings')}
                    className="w-full flex flex-col items-center gap-1 py-2 text-zinc-500 hover:text-white transition-colors"
                >
                    <Settings className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};
