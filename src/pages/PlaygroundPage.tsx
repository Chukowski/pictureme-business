import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser, getUserEvents } from "@/services/eventsApi";
import { PlaygroundLayout } from "@/components/playground/PlaygroundLayout";
import { PlaygroundTemplateTest } from "@/components/playground/PlaygroundTemplateTest";
import { PlaygroundBadgeTest } from "@/components/playground/PlaygroundBadgeTest";
import { PlaygroundEventPreview } from "@/components/playground/PlaygroundEventPreview";
import { PlaygroundBoothSimulator } from "@/components/playground/PlaygroundBoothSimulator";
import { PlaygroundProvider } from "@/components/playground/PlaygroundContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function PlaygroundPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const initialImage = searchParams.get('image');
  const initialTab = searchParams.get('tab') || 'template';
  const [currentTab, setCurrentTab] = useState(initialTab);

  // Fetch User
  const { data: currentUser, isLoading: isUserLoading, error: userError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    retry: false,
  });

  // Fetch Events
  const { data: events = [], isLoading: isEventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['userEvents'],
    queryFn: getUserEvents,
    enabled: !!currentUser,
  });

  // Auth check
  useEffect(() => {
    if (!isUserLoading && (userError || !currentUser)) {
      toast.error("Please log in to access the Playground");
      navigate("/auth");
    }
  }, [currentUser, isUserLoading, userError, navigate]);

  if (isUserLoading || isEventsLoading) {
    return (
      <div className="h-screen w-full bg-[#101112] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!currentUser) return null;

  const handleReloadEvents = async () => {
    await refetchEvents();
  };

  return (
    <PlaygroundProvider>
      <PlaygroundLayout currentTab={currentTab} onTabChange={setCurrentTab}>
        {currentTab === 'template' && (
          <PlaygroundTemplateTest
            events={events}
            currentUser={currentUser}
            onReloadEvents={handleReloadEvents}
            initialImage={initialImage}
          />
        )}

        {currentTab === 'badge' && (
          <PlaygroundBadgeTest
            events={events}
            currentUser={currentUser}
            onReloadEvents={handleReloadEvents}
            initialImage={initialImage}
          />
        )}

        {currentTab === 'event' && (
          <PlaygroundEventPreview
            events={events}
            currentUser={currentUser}
          />
        )}

        {currentTab === 'booth' && (
          <PlaygroundBoothSimulator
            events={events}
            currentUser={currentUser}
          />
        )}
      </PlaygroundLayout>
    </PlaygroundProvider>
  );
}
