import React, { useState, useEffect } from 'react';
import { Home, Library, Camera, User, Sparkles, Settings, CreditCard, LogOut, ChevronRight, X, Wand2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser, logoutUser } from "@/services/eventsApi";
import { cn } from '@/lib/utils';
import { Component as MagicButton } from '@/components/ui/animated-button';
import { ENV } from "@/config/env";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
    DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

interface CreatorBottomNavProps {
    onOpenCreate?: () => void;
    onLibraryClick?: () => void;
    onHomeClick?: () => void;
    activeTab?: string;
}

export const CreatorBottomNav = ({ onOpenCreate, onLibraryClick, onHomeClick, activeTab }: CreatorBottomNavProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const currentUser = getCurrentUser();

    // Map activeTab or path to index
    const getActiveIndex = () => {
        if (activeTab === 'home') return 0;
        if (activeTab === 'gallery') return 1;
        if (activeTab === 'create') return 2;
        if (activeTab === 'booths') return 3;

        const path = location.pathname;
        if (path === '/creator/dashboard' || path === '/creator') return 0;
        if (path.includes('/creator/studio') && location.state?.view === 'gallery') return 1;
        if (path.includes('/creator/studio') && location.state?.view === 'create') return 2;
        if (path.includes('/creator/booth')) return 3;
        if (path.includes('/creator/profile') || path.includes('/creator/settings')) return 4;

        return 0;
    };

    const [activeIndex, setActiveIndex] = useState(getActiveIndex());
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);

    // Sync active index
    useEffect(() => {
        setActiveIndex(getActiveIndex());
    }, [activeTab, location.pathname, location.state]);

    // Polling for generation status
    useEffect(() => {
        const pollGenerations = async () => {
            const token = localStorage.getItem("auth_token");
            if (!token) return;

            try {
                const res = await fetch(`${ENV.API_URL}/api/generate/pending`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    const currentCount = (data.pending || []).length;

                    setPendingCount(prev => {
                        // If we had jobs and now we don't, show success
                        if (prev > 0 && currentCount === 0) {
                            setShowSuccess(true);
                            setTimeout(() => setShowSuccess(false), 5000);
                        }
                        return currentCount;
                    });
                }
            } catch (err) {
                console.error("Failed to poll generations", err);
            }
        };

        pollGenerations();
        const intervalId = setInterval(pollGenerations, 10000);
        return () => clearInterval(intervalId);
    }, []);

    // Close profile on route change
    useEffect(() => {
        setIsProfileOpen(false);
    }, [location.pathname]);

    const items = [
        { label: 'Home', icon: Home, id: 'home' },
        { label: 'Library', icon: Library, id: 'gallery' },
        { label: 'Create', icon: Wand2, id: 'create' },
        { label: 'Booths', icon: Camera, id: 'booths' },
        { label: 'Profile', icon: User, id: 'profile' },
    ];

    const handleItemClick = (index: number, item: typeof items[0]) => {
        if (item.id !== 'profile') {
            setActiveIndex(index);
            setIsProfileOpen(false); // Ensure profile is closed
        }

        // Navigation Logic
        if (index === 0) { // Home
            if (onHomeClick) onHomeClick();
            else navigate('/creator/dashboard');
        } else if (index === 1) { // Library
            if (onLibraryClick) onLibraryClick();
            else navigate('/creator/studio', { state: { view: 'gallery' } });
        } else if (index === 2) { // Create
            if (onOpenCreate) onOpenCreate();
            else navigate('/creator/studio', { state: { view: 'create' } });
        } else if (index === 3) { // Booths
            navigate('/creator/booth');
        }
        // Profile is handled by DrawerTrigger
    };

    const handleLogout = () => {
        setIsProfileOpen(false);
        logoutUser();
        navigate("/admin/auth");
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-black/95 backdrop-blur-xl border-t border-white/10 md:hidden pb-[env(safe-area-inset-bottom,20px)] pt-2">
            <nav className="flex items-center justify-around px-4 w-full h-full max-w-lg mx-auto">
                {items.map((item, index) => {
                    const isActive = index === activeIndex;
                    const IconComponent = item.icon;
                    const isProfile = item.id === 'profile';
                    const isCreate = item.id === 'create';

                    // 1. Create Button (Floating MagicButton)
                    if (isCreate) {
                        return (
                            <div key={item.label} className="relative -top-6 z-10 font-sans">
                                {showSuccess && (
                                    <div
                                        onClick={() => {
                                            navigate('/creator/studio', { state: { view: 'gallery' } });
                                            setShowSuccess(false);
                                        }}
                                        className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[#D1F349] text-black text-[10px] font-bold px-3 py-1.5 rounded-full shadow-[0_0_20px_rgba(209,243,73,0.4)] animate-in fade-in slide-in-from-bottom-2 duration-300 flex items-center gap-1.5 whitespace-nowrap z-50 cursor-pointer active:scale-95 transition-transform"
                                    >
                                        <Sparkles className="w-3 h-3" />
                                        Images Created!
                                    </div>
                                )}

                                <MagicButton
                                    onClick={() => handleItemClick(index, item)}
                                    speed={pendingCount > 0 ? "0.8s" : "3s"}
                                    className={cn(
                                        "w-14 h-14 transition-all duration-300",
                                        isActive && "shadow-[0_0_20px_rgba(209,243,73,0.4)]",
                                        pendingCount > 0 && "scale-110 shadow-[0_0_30px_rgba(209,243,73,0.6)]"
                                    )}
                                >
                                    <Wand2 className={cn(
                                        "w-6 h-6 transition-all duration-500",
                                        isActive ? "text-[#D1F349] fill-[#D1F349]/20" : "text-zinc-200",
                                        pendingCount > 0 && "animate-pulse text-[#D1F349]"
                                    )} />
                                </MagicButton>

                                {pendingCount > 0 && (
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center border-2 border-black animate-in zoom-in duration-300">
                                        <span className="text-[10px] font-bold text-white">{pendingCount}</span>
                                    </div>
                                )}
                            </div>
                        );
                    }

                    // 2. Profile Button (Drawer Trigger)
                    if (isProfile) {
                        return (
                            <Drawer key={item.label} open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                                <DrawerTrigger asChild onClick={() => {
                                    setActiveIndex(index);
                                    setIsProfileOpen(true);
                                }}>
                                    <button className="flex flex-col items-center justify-center w-12 h-12">
                                        <div className={cn(
                                            "w-6 h-6 rounded-full overflow-hidden border transition-all duration-200",
                                            isActive ? "border-white" : "border-white/20 opacity-70"
                                        )}>
                                            {currentUser?.avatar_url ? (
                                                <img src={currentUser.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                                    <User className="w-3 h-3" />
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                </DrawerTrigger>

                                {/* Full Page Profile Drawer */}
                                <DrawerContent className="h-[100dvh] bg-[#09090b] border-none text-white outline-none rounded-none flex flex-col font-sans">
                                    <div className="flex-1 flex flex-col w-full max-w-md mx-auto relative px-6">

                                        {/* Close Button at top right */}
                                        <div className="absolute top-4 right-4 z-50">
                                            <DrawerClose asChild>
                                                <Button size="icon" variant="ghost" className="rounded-full bg-white/5 text-zinc-400 hover:text-white">
                                                    <X className="w-6 h-6" />
                                                </Button>
                                            </DrawerClose>
                                        </div>

                                        <DrawerHeader className="flex flex-col items-center gap-6 pt-16 pb-8">
                                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl">
                                                {currentUser?.image ? (
                                                    <img src={currentUser.image} alt="Profile" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                                        <User className="w-10 h-10 text-zinc-400" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-center space-y-2">
                                                <DrawerTitle className="text-2xl font-bold tracking-tight">{currentUser?.full_name || currentUser?.username}</DrawerTitle>
                                                <p className="text-base text-zinc-500">{currentUser?.email}</p>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-[#D1F349] hover:text-[#D1F349] hover:bg-[#D1F349]/10 text-xs font-bold"
                                                    onClick={() => {
                                                        setIsProfileOpen(false);
                                                        navigate(`/profile/${currentUser?.slug || currentUser?.username}`);
                                                    }}
                                                >
                                                    View Profile
                                                </Button>
                                            </div>
                                        </DrawerHeader>

                                        <div className="space-y-3 w-full">
                                            <Button
                                                variant="outline"
                                                className="w-full justify-start h-14 bg-zinc-900/50 border-white/10 hover:bg-zinc-900 hover:text-white rounded-xl text-base font-medium transition-all"
                                                onClick={() => {
                                                    navigate('/creator/chat');
                                                }}
                                            >
                                                <div className="w-8 h-8 flex items-center justify-center bg-indigo-500/10 rounded-lg mr-3 text-indigo-400">
                                                    <Sparkles className="w-4 h-4" />
                                                </div>
                                                AI Assistant
                                                <ChevronRight className="ml-auto w-4 h-4 text-zinc-600" />
                                            </Button>

                                            <Button
                                                variant="outline"
                                                className="w-full justify-start h-14 bg-zinc-900/50 border-white/10 hover:bg-zinc-900 hover:text-white rounded-xl text-base font-medium transition-all"
                                                onClick={() => {
                                                    navigate('/creator/settings');
                                                }}
                                            >
                                                <div className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-lg mr-3 text-zinc-400">
                                                    <Settings className="w-4 h-4" />
                                                </div>
                                                Settings
                                                <ChevronRight className="ml-auto w-4 h-4 text-zinc-600" />
                                            </Button>

                                            <Button
                                                variant="outline"
                                                className="w-full justify-start h-14 bg-zinc-900/50 border-white/10 hover:bg-zinc-900 hover:text-white rounded-xl text-base font-medium transition-all"
                                                onClick={() => {
                                                    navigate('/creator/billing');
                                                }}
                                            >
                                                <div className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-lg mr-3 text-zinc-400">
                                                    <CreditCard className="w-4 h-4" />
                                                </div>
                                                Billing
                                                <ChevronRight className="ml-auto w-4 h-4 text-zinc-600" />
                                            </Button>

                                            <div className="pt-4">
                                                <Button
                                                    variant="ghost"
                                                    className="w-full justify-start h-14 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl text-base font-medium transition-all"
                                                    onClick={handleLogout}
                                                >
                                                    <div className="w-8 h-8 flex items-center justify-center rounded-lg mr-3">
                                                        <LogOut className="w-4 h-4" />
                                                    </div>
                                                    Sign Out
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </DrawerContent>
                            </Drawer>
                        );
                    }

                    // 3. Regular Icon Button
                    return (
                        <button
                            key={item.label}
                            onClick={() => handleItemClick(index, item)}
                            className={cn(
                                "flex flex-col items-center justify-center w-12 h-12 transition-all duration-300",
                                isActive ? "text-white scale-110" : "text-zinc-600 hover:text-zinc-400"
                            )}
                        >
                            <IconComponent className={cn("w-6 h-6", isActive && "stroke-[2.5]")} />
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};
