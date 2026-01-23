import React, { useState, useEffect } from 'react';
import { Home, Library, Camera, User, Sparkles, Settings, CreditCard, LogOut, ChevronRight, X, Wand2, Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser, logoutUser } from "@/services/eventsApi";
import { cn } from '@/lib/utils';
import { Component as MagicButton } from '@/components/ui/animated-button';
import { ENV } from "@/config/env";
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
        if (path.includes('/creator/studio') && (location.state?.view === 'gallery' || new URLSearchParams(location.search).get('view') === 'gallery')) return 1;
        if (path.includes('/creator/studio') && (location.state?.view === 'create' || new URLSearchParams(location.search).get('view') === 'create' || !new URLSearchParams(location.search).get('view'))) return 2;
        if (path.includes('/creator/booth')) return 3;
        if (path.includes('/creator/profile') || path.includes('/creator/settings')) return 4;

        return 0;
    };

    const [activeIndex, setActiveIndex] = useState(getActiveIndex());
    const [pendingCount, setPendingCount] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);

    // Sync active index
    useEffect(() => {
        setActiveIndex(getActiveIndex());
    }, [activeTab, location.pathname, location.state]);

    // Polling as fallback and initial load, with SSE for real-time
    useEffect(() => {
        const fetchPendingStatus = async () => {
            const token = localStorage.getItem("auth_token");
            if (!token) return;

            try {
                const res = await fetch(`${ENV.API_URL}/api/generate/pending`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    const currentCount = (data.pending || []).length;
                    setPendingCount(currentCount);
                }
            } catch (err) {
                console.error("Failed to fetch pending status", err);
            }
        };

        // Handlers for SSE events (dispatched by useSSE in App.tsx)
        const handleJobUpdate = (event: any) => {
            const data = event.detail;
            console.log("🔔 [Nav] Job update received:", data.job_id, data.status);

            // Re-fetch count to be safe and accurate across tabs
            fetchPendingStatus();

            // Show success bubble if a job just finished
            if (data.status === 'completed' || data.status === 'failed') {
                if (data.status === 'completed') {
                    setShowSuccess(true);
                    setTimeout(() => setShowSuccess(false), 5000);
                }
            }
        };

        const handleTokensUpdate = () => {
            // If tokens are updated, we might want to refresh user data if displayed, 
            // but Nav doesn't show balance directly yet.
        };

        // Initial fetch
        fetchPendingStatus();

        // Listen for events
        window.addEventListener('job-updated', handleJobUpdate);
        window.addEventListener('tokens-updated', handleTokensUpdate);

        // Smart polling - only poll if tab is visible AND there are pending items
        let intervalId: NodeJS.Timeout | null = null;

        const startPolling = () => {
            if (intervalId) return;
            intervalId = setInterval(() => {
                // Only poll if tab is visible
                if (document.visibilityState === 'visible') {
                    // Check pendingCount before fetching
                    setPendingCount(prev => {
                        if (prev > 0) {
                            fetchPendingStatus();
                        }
                        return prev;
                    });
                }
            }, 60000); // 60s fallback
        };

        const stopPolling = () => {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchPendingStatus();
                startPolling();
            } else {
                stopPolling();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        if (document.visibilityState === 'visible') {
            startPolling();
        }

        return () => {
            window.removeEventListener('job-updated', handleJobUpdate);
            window.removeEventListener('tokens-updated', handleTokensUpdate);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            stopPolling();
        };
    }, []);


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
        }

        // Navigation Logic
        if (index === 0) { // Home
            if (onHomeClick) onHomeClick();
            else navigate('/creator/dashboard');
        } else if (index === 1) { // Library
            if (onLibraryClick) onLibraryClick();
            else navigate('/creator/studio?view=gallery');
        } else if (index === 2) { // Create
            if (onOpenCreate) onOpenCreate();
            else navigate('/creator/studio?view=create');
        } else if (index === 3) { // Booths
            navigate('/creator/booth');
        } else if (index === 4) { // Profile
            navigate('/creator/settings');
        }
    };

    const handleLogout = () => {
        logoutUser();
        navigate("/admin/auth");
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-[#101112]/95 backdrop-blur-xl border-t border-white/10 md:hidden pb-[env(safe-area-inset-bottom,20px)]">
            <nav className="flex items-center justify-around px-4 w-full h-13 max-w-lg mx-auto">
                {items.map((item, index) => {
                    const isActive = index === activeIndex;
                    const IconComponent = item.icon;
                    const isProfile = item.id === 'profile';
                    const isCreate = item.id === 'create';

                    // 1. Create Button (Floating MagicButton)
                    if (isCreate) {
                        return (
                            <div key={item.label} className="relative -top-3 z-10 font-sans">
                                {showSuccess && (
                                    <div
                                        onClick={() => {
                                            navigate('/creator/studio?view=gallery');
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
                                    innerBackground="bg-transparent"
                                    showBorder={false}
                                    className={cn(
                                        "w-14 h-14 transition-all duration-300 rounded-[0.5rem]",
                                        isActive && "shadow-[0_0_20px_rgba(209,243,73,0.4)]",
                                        pendingCount > 0 && "scale-110 shadow-[0_0_30px_rgba(209,243,73,0.6)]"
                                    )}
                                >
                                    <div className="w-full h-full p-0 flex items-center justify-center overflow-visible">
                                        <img
                                            src="/PicturemeIconv2.png"
                                            alt="Pictureme"
                                            className={cn(
                                                "w-full h-full object-cover rounded-[0.5rem]",
                                                pendingCount > 0 ? "animate-[spin_0.8s_linear_infinite]" : "animate-periodic-spin"
                                            )}
                                        />
                                    </div>
                                </MagicButton>

                                {pendingCount > 0 && (
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center border-2 border-black animate-in zoom-in duration-300">
                                        <span className="text-[10px] font-bold text-white">{pendingCount}</span>
                                    </div>
                                )}
                            </div>
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
                            {isProfile ? (
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
                            ) : (
                                <IconComponent className={cn("w-6 h-6", isActive && "stroke-[2.5]")} />
                            )}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};
