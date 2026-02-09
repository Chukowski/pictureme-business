import { getCurrentUser } from "@/services/eventsApi";
import { isUserAdult } from "@/lib/utils";
import { MarketplaceFeedCard } from "./MarketplaceFeedCard";
import { FeedCreation, RemixMode } from "@/pages/creator/dashboard/types";

export function CreatorsGallerySection({
    creations,
    onImageClick,
    onRemixClick,
    columnsCount = 3,
    showAdultContent = false
}: {
    creations: FeedCreation[];
    onImageClick: (creation: FeedCreation, index: number) => void;
    onRemixClick: (creation: FeedCreation, mode?: RemixMode) => void;
    columnsCount?: number;
    showAdultContent?: boolean;
}) {
    const currentUser = getCurrentUser();
    const isAdult = isUserAdult(currentUser?.birth_date);

    // Filter out 18+ content if toggle is off
    const filteredCreations = showAdultContent
        ? creations
        : creations.filter(c => !c.is_adult);

    if (!filteredCreations || filteredCreations.length === 0) {
        return (
            <div className="text-center py-12 bg-card/30 rounded-xl border border-white/5 border-dashed">
                <p className="text-zinc-500">
                    {creations.length > 0 && !showAdultContent
                        ? isAdult
                            ? "All content is marked as 18+. Enable the filter to view."
                            : "Some content is hidden based on your account age restrictions."
                        : "Marketplace loading..."}
                </p>
            </div>
        );
    }

    // Custom stable masonry layout
    const columns: FeedCreation[][] = Array.from({ length: columnsCount }, () => []);
    filteredCreations.forEach((item, i) => {
        columns[i % columnsCount].push(item);
    });

    return (
        <div
            className="grid gap-[3px] md:gap-4 pb-4 px-[3px] md:px-0"
            style={{
                gridTemplateColumns: `repeat(${columnsCount}, minmax(0, 1fr))`
            }}
        >
            {columns.map((colItems, colIndex) => (
                <div key={colIndex} className="flex flex-col gap-[3px] md:gap-4">
                    {colItems.map((creation) => (
                        <MarketplaceFeedCard
                            key={creation.id}
                            creation={creation}
                            showBlurred={creation.is_adult && showAdultContent}
                            onImageClick={(e) => {
                                e.stopPropagation();
                                onImageClick(creation, creations.findIndex(c => c.id === creation.id));
                            }}
                            onRemixClick={(e, mode = 'full') => {
                                e.stopPropagation();
                                onRemixClick(creation, mode);
                            }}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}
