import { getCurrentUser } from "@/services/eventsApi";
import MarketplaceTab from "@/components/dashboard/MarketplaceTab";

export default function CreatorMarketplacePage() {
  const currentUser = getCurrentUser();

  if (!currentUser) return null;

  return (
    <div className="w-full mx-auto px-4 sm:px-8 py-4 md:py-8">
      <MarketplaceTab currentUser={currentUser} />
    </div>
  );
}
