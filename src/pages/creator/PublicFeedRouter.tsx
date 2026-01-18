/**
 * PublicFeedRouter - Smart router that determines whether to render
 * CreatorBoothFeed (for creator booths) or EventFeedPage (for business events)
 */

import { lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import { useEventConfig } from "@/hooks/useEventConfig";
import { Loader2 } from "lucide-react";

// Lazy load both pages
const CreatorBoothFeed = lazy(() => import("./CreatorBoothFeed"));
const EventFeedPage = lazy(() =>
    import("@/pages/EventFeedPage").then(module => ({ default: module.EventFeedPage }))
);

function LoadingSpinner() {
    return (
        <div className="min-h-screen bg-[#101112] flex items-center justify-center">
            <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin mx-auto text-indigo-500" />
                <p className="text-white text-lg">Loading feed...</p>
            </div>
        </div>
    );
}

export default function PublicFeedRouter() {
    const { userSlug, eventSlug } = useParams<{ userSlug: string; eventSlug: string }>();

    const { config, loading, error } = useEventConfig(userSlug || '', eventSlug || '');

    // While loading, show spinner
    if (loading) {
        return <LoadingSpinner />;
    }

    // If error or no config, let the page components handle it
    if (error || !config) {
        return (
            <Suspense fallback={<LoadingSpinner />}>
                <EventFeedPage />
            </Suspense>
        );
    }

    // Route based on is_booth flag
    if (config.is_booth) {
        return (
            <Suspense fallback={<LoadingSpinner />}>
                <CreatorBoothFeed />
            </Suspense>
        );
    }

    // Business event - use EventFeedPage
    return (
        <Suspense fallback={<LoadingSpinner />}>
            <EventFeedPage />
        </Suspense>
    );
}
