import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BillingTab from "@/components/dashboard/BillingTab";
import { getCurrentUser, User } from "@/services/eventsApi";
import { Loader2 } from "lucide-react";

export default function CreatorBillingPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        navigate("/admin/auth");
        return;
      }
      setUser(currentUser);
      setIsLoading(false);
    };

    loadUser();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 min-h-[calc(100vh-64px)]">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Billing & Subscription</h1>
          <p className="text-zinc-400">Manage your individual plan and payment methods.</p>
        </div>
        
        {user && <BillingTab currentUser={user} />}
      </div>
    </div>
  );
}

