import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { User } from "@/services/eventsApi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderKanban, BarChart3, Coins, CreditCard, ShoppingBag, Palette, BookOpen } from "lucide-react";
import AdminEventsTab from "@/components/admin/AdminEventsTab";
import AdminAnalyticsTab from "@/components/admin/AdminAnalyticsTab";
import TokensTab from "./TokensTab";
import BillingTab from "./BillingTab";
import MarketplaceTab from "./MarketplaceTab";
import AlbumsTab from "./AlbumsTab";
import { hasFeature } from "@/lib/planFeatures";

interface BusinessDashboardProps {
    currentUser: User;
    initialTab?: string;
}

// Map URL paths to tab values
const pathToTab: Record<string, string> = {
    '/admin': 'events',
    '/admin/events': 'events',
    '/admin/billing': 'billing',
    '/admin/tokens': 'tokens',
    '/admin/marketplace': 'marketplace',
    '/admin/analytics': 'analytics',
    '/admin/albums': 'albums',
};

export default function BusinessDashboard({ currentUser, initialTab }: BusinessDashboardProps) {
    const location = useLocation();
    const navigate = useNavigate();
    
    // Determine initial tab from URL or prop
    const getTabFromPath = () => {
        const path = location.pathname;
        return pathToTab[path] || initialTab || "events";
    };
    
    const [activeTab, setActiveTab] = useState(getTabFromPath);
    
    // Sync tab with URL changes
    useEffect(() => {
        const path = location.pathname;
        const tabFromPath = pathToTab[path] || initialTab || "events";
        if (tabFromPath !== activeTab) {
            setActiveTab(tabFromPath);
        }
    }, [location.pathname, initialTab, activeTab]);
    
    // Check if user has album tracking feature
    const hasAlbumTracking = hasFeature(currentUser?.role, 'albumTracking');

    // Update URL when tab changes (optional - for bookmarkable URLs)
    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        // Optionally update URL
        const pathForTab: Record<string, string> = {
            'events': '/admin/events',
            'billing': '/admin/billing',
            'tokens': '/admin/tokens',
            'marketplace': '/admin/marketplace',
            'analytics': '/admin/analytics',
            'albums': '/admin/albums',
        };
        if (pathForTab[tab] && location.pathname !== pathForTab[tab]) {
            navigate(pathForTab[tab], { replace: true });
        }
    };

    return (
        <div className="space-y-8">
            {/* Tabs Navigation */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-8">
                <TabsList className="inline-flex h-auto p-1 bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-x-auto max-w-full">
                    <TabsTrigger
                        value="events"
                        className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400 transition-all"
                    >
                        <FolderKanban className="w-4 h-4" />
                        <span>Events</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="analytics"
                        className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400 transition-all"
                    >
                        <BarChart3 className="w-4 h-4" />
                        <span>Analytics</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="tokens"
                        className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400 transition-all"
                    >
                        <Coins className="w-4 h-4" />
                        <span>Tokens</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="billing"
                        className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400 transition-all"
                    >
                        <CreditCard className="w-4 h-4" />
                        <span>Billing</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="marketplace"
                        className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400 transition-all"
                    >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Marketplace</span>
                    </TabsTrigger>
                    {hasAlbumTracking && (
                        <TabsTrigger
                            value="albums"
                            className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-xl data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-zinc-400 transition-all"
                        >
                            <BookOpen className="w-4 h-4" />
                            <span>Albums</span>
                        </TabsTrigger>
                    )}
                </TabsList>

                {/* Events Tab */}
                <TabsContent value="events" className="mt-0 focus-visible:outline-none">
                    <AdminEventsTab currentUser={currentUser} />
                </TabsContent>

                {/* Analytics Tab */}
                <TabsContent value="analytics" className="mt-0 focus-visible:outline-none">
                    <AdminAnalyticsTab currentUser={currentUser} />
                </TabsContent>

                {/* Tokens Tab */}
                <TabsContent value="tokens" className="mt-0 focus-visible:outline-none">
                    <TokensTab currentUser={currentUser} />
                </TabsContent>

                {/* Billing Tab */}
                <TabsContent value="billing" className="mt-0 focus-visible:outline-none">
                    <BillingTab currentUser={currentUser} />
                </TabsContent>

                {/* Marketplace Tab */}
                <TabsContent value="marketplace" className="mt-0 focus-visible:outline-none">
                    <MarketplaceTab currentUser={currentUser} />
                </TabsContent>

                {/* Albums Tab (Event Pro+ only) */}
                {hasAlbumTracking && (
                    <TabsContent value="albums" className="mt-0 focus-visible:outline-none">
                        <AlbumsTab currentUser={currentUser} />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}
