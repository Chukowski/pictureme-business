import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutGrid,
    Sparkles,
    LayoutTemplate,
    Store,
    Settings,
    Bell,
    Palette,
    Scan,
    ShoppingBag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MainView } from './AppRail';
import { User } from '@/services/eventsApi';
import { getThumbnailUrl } from '@/services/imgproxy';

interface MobileFloatingRailProps {
    isOpen: boolean;
    onClose: () => void;
    activeView: MainView;
    onViewChange: (v: MainView) => void;
    user: User | null;
    onMarketplaceClick: () => void;
    notificationCount?: number;
}

export const MobileFloatingRail = ({
    isOpen,
    onClose,
    activeView,
    onViewChange,
    user,
    onMarketplaceClick,
    notificationCount = 0
}: MobileFloatingRailProps) => {
    const navigate = useNavigate(); // Assume we might need navigation
    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[100] bg-[#101112]/20 backdrop-blur-[2px] md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Rail Panel */}
            <div className={cn(
                "fixed top-12 right-3 bottom-24 w-[72px] z-[101] md:hidden transition-all duration-500 ease-out",
                "bg-[#1c1c1e]/70 backdrop-blur-3xl border border-white/10 rounded-[36px] shadow-2xl flex flex-col items-center py-8",
                isOpen ? "translate-x-0 opacity-100" : "translate-x-[150%] opacity-0"
            )}>
                {/* Top Section: Nav Icons */}
                <div className="flex-1 flex flex-col gap-6 items-center w-full px-2 overflow-y-auto no-scrollbar">
                    <NavItem
                        icon={<Scan className="w-6 h-6" />}
                        label="Gallery"
                        isActive={activeView === 'gallery' || activeView === 'home'}
                        onClick={() => { onViewChange('gallery'); onClose(); }}
                    />
                    <NavItem
                        icon={<Sparkles className="w-6 h-6" />}
                        label="Create"
                        isActive={activeView === 'create'}
                        onClick={() => { onViewChange('create'); onClose(); }}
                    />
                    <NavItem
                        icon={<Palette className="w-6 h-6" />}
                        label="Models"
                        isActive={activeView === 'templates'}
                        onClick={() => { onViewChange('templates'); onClose(); }}
                    />
                    <NavItem
                        icon={<Store className="w-6 h-6" />}
                        label="Booths"
                        isActive={activeView === 'booths'}
                        onClick={() => { onViewChange('booths'); onClose(); }}
                    />

                    <NavItem
                        icon={<ShoppingBag className="w-6 h-6" />}
                        label="Market"
                        isActive={false}
                        onClick={() => { onMarketplaceClick(); onClose(); }}
                    />

                    <div className="w-8 h-[1px] bg-white/10 my-0.5" />

                    <div className="relative">
                        <NavItem
                            icon={<Bell className="w-6 h-6" />}
                            label="Brief"
                            isActive={false}
                            onClick={() => { /* Placeholder for real notification list */ }}
                        />
                        {notificationCount > 0 && (
                            <div className="absolute top-1 right-3 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-[#1c1c1e] flex items-center justify-center">
                                <span className="text-[7px] font-bold text-white">{notificationCount}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Section: Profile with Avatar */}
                <div className="mt-auto flex flex-col gap-4 items-center pb-2">
                    <button
                        onClick={() => { navigate('/creator/settings'); onClose(); }}
                        className="flex flex-col items-center gap-0.5 group w-full px-0.5"
                    >
                        <div className={cn(
                            "w-10 h-10 rounded-[18px] transition-all duration-300 overflow-hidden ring-2",
                            "ring-white/10 hover:ring-[#D1F349]/50 group-hover:scale-105 active:scale-95"
                        )}>
                            {user?.avatar_url || user?.image ? (
                                <img
                                    src={getThumbnailUrl(user.avatar_url || user.image || "", 100)}
                                    className="w-full h-full object-cover"
                                    alt="Profile"
                                />
                            ) : (
                                <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                    <Settings className="w-5 h-5 text-zinc-500" />
                                </div>
                            )}
                        </div>
                        <span className="text-[8px] font-medium text-white/40 tracking-tight text-center px-0.5 whitespace-nowrap">
                            Profile
                        </span>
                    </button>
                </div>
            </div>
        </>
    );
};

const NavItem = ({
    icon,
    label,
    isActive,
    onClick
}: {
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void
}) => (
    <button
        onClick={onClick}
        className="flex flex-col items-center gap-0.5 group w-full px-0.5"
    >
        <div className={cn(
            "p-2.5 rounded-[18px] transition-all duration-300",
            isActive ? "bg-white/10 text-white shadow-lg border border-white/5" : "text-white/40 group-hover:bg-white/5 active:scale-95"
        )}>
            {icon}
        </div>
        <span className={cn(
            "text-[8px] font-medium transition-colors tracking-tight text-center px-0.5 whitespace-nowrap",
            isActive ? "text-white opacity-100" : "text-white/40 opacity-80"
        )}>
            {label}
        </span>
    </button>
);
