import { getCurrentUser } from "@/services/eventsApi";
import MarketplaceTab from "@/components/dashboard/MarketplaceTab";

export default function CreatorTemplatesPage() {
  const currentUser = getCurrentUser();

  if (!currentUser) return null;

  return (
    <div className="fixed top-16 left-0 right-0 bottom-0 overflow-hidden bg-black">
      <div className="h-full max-w-[1600px] mx-auto px-4 sm:px-8 py-8">
        <MarketplaceTab currentUser={currentUser} />
      </div>
    </div>
  );
}
