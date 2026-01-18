/**
 * PublicBoothRouter - Smart router that determines whether to render
 * PublicCreatorBooth (for creator booths) or PhotoBoothPage (for business events)
 * 
 * This component loads the event config and routes to the appropriate page
 * based on the `is_booth` flag.
 */

import { lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import { useEventConfig } from "@/hooks/useEventConfig";
import { Loader2 } from "lucide-react";

// Lazy load both pages
const PublicCreatorBooth = lazy(() => import("./PublicCreatorBooth"));
const PhotoBoothPage = lazy(() =>
    import("@/pages/PhotoBoothPage").then(module => ({ default: module.PhotoBoothPage }))
);

function LoadingSpinner() {
    return (
        <div className="min-h-screen bg-[#101112] flex items-center justify-center">
            <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin mx-auto text-indigo-500" />
                <p className="text-white text-lg">Loading...</p>
            </div>
        </div>
    );
}

export default function PublicBoothRouter() {
    const { userSlug, eventSlug } = useParams<{ userSlug: string; eventSlug: string }>();

    const { config, loading, error } = useEventConfig(userSlug || '', eventSlug || '');

    // While loading, show spinner
    if (loading) {
        return <LoadingSpinner />;
    }

    // If error or no config, let the page components handle it
    // (they have nice error states)
    if (error || !config) {
        // Default to PhotoBoothPage which has error handling
        return (
            <Suspense fallback={<LoadingSpinner />}>
                <PhotoBoothPage />
            </Suspense>
        );
    }

    // Route based on is_booth flag
    if (config.is_booth) {
        // Creator booth - use simplified biolink-style page
        return (
            <Suspense fallback={<LoadingSpinner />}>
                <PublicCreatorBooth />
            </Suspense>
        );
    }

    // Business event - use full-featured PhotoBoothPage
    return (
        <Suspense fallback={<LoadingSpinner />}>
            <PhotoBoothPage />
        </Suspense>
    );
}
