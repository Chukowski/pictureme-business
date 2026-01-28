import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { User } from "@/services/eventsApi";
import AdminEventsTab from "@/components/admin/AdminEventsTab";
import AdminAnalyticsTab from "@/components/admin/AdminAnalyticsTab";
import MarketplaceTab from "./MarketplaceTab";
import AlbumsTab from "./AlbumsTab";
import { MediaLibrary } from "@/components/MediaLibrary";
import { hasFeature } from "@/lib/planFeatures";

interface BusinessDashboardProps {
    currentUser: User;
    initialTab?: string;
}

// Map URL paths to tab values
const pathToTab: Record<string, string> = {
    '/admin': 'events',
    '/admin/events': 'events',
    '/admin/marketplace': 'marketplace',
    '/admin/analytics': 'analytics',
    '/admin/albums': 'albums',
    '/admin/studio': 'assets',
    // New business routes
    '/business': 'events',
    '/business/home': 'events',
    '/business/events': 'events',
    '/business/marketplace': 'marketplace',
    '/business/analytics': 'analytics',
    '/business/albums': 'albums',
    '/business/studio': 'assets',
};

export default function BusinessDashboard({ currentUser, initialTab }: BusinessDashboardProps) {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState("events");

    // Check if user has album tracking feature
    const hasAlbumTracking = hasFeature(currentUser?.role, 'albumTracking');

    useEffect(() => {
        const path = location.pathname;
        const searchParams = new URLSearchParams(location.search);
        const viewParam = searchParams.get('view');

        const tabFromPath = viewParam || pathToTab[path] || initialTab || "events";
        setActiveTab(tabFromPath);
    }, [location.pathname, location.search, initialTab]);

    return (
        <div className="space-y-8 pt-4">
            {/* Content Area */}
            <div className="animate-in fade-in duration-300">
                {activeTab === 'events' && <AdminEventsTab currentUser={currentUser} />}
                {activeTab === 'analytics' && <AdminAnalyticsTab currentUser={currentUser} />}
                {activeTab === 'marketplace' && <MarketplaceTab currentUser={currentUser} />}
                {activeTab === 'albums' && hasAlbumTracking && <AlbumsTab currentUser={currentUser} />}
                {activeTab === 'assets' && (
                    <div className="max-w-6xl mx-auto">
                        <MediaLibrary
                            category="assets"
                            onSelectMedia={(url) => console.log('Selected:', url)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
