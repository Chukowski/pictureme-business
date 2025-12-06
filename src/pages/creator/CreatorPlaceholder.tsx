import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function CreatorPlaceholder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { path } = useParams();

  const title = location.pathname.split('/').pop()?.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase()) || 'Page';

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      <p className="text-zinc-400">This section is currently under construction for the Creator experience.</p>
      <div className="flex gap-4 mt-6">
        <Button variant="outline" onClick={() => navigate('/creator/dashboard')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}

