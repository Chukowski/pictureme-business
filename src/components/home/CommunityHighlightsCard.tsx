import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Users, Image as ImageIcon } from "lucide-react";
import { HomeContentResponse } from "@/services/contentApi";

interface CommunityHighlightsCardProps {
  content: HomeContentResponse | null;
}

export function CommunityHighlightsCard({ content }: CommunityHighlightsCardProps) {
  const creations = content?.public_creations?.slice(0, 3) || [];

  if (creations.length === 0) return null;

  return (
    <Card className="bg-card/30 border-white/10 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-300" />
          Community Highlights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {creations.map((creation) => (
          <div
            key={creation.id}
            className="flex gap-3 p-3 rounded-lg bg-[#101112]/20 border border-white/5"
          >
            <div className="w-16 h-16 rounded-lg bg-zinc-800 overflow-hidden flex items-center justify-center">
              {creation.thumbnail_url ? (
                <img
                  src={creation.thumbnail_url}
                  alt={creation.template_name || "Creation"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon className="w-6 h-6 text-zinc-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white truncate">
                  {creation.template_name || "Creator highlight"}
                </p>
                {creation.is_featured && (
                  <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-300 border-0 h-5 text-[10px]">
                    Featured
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-zinc-500 truncate">
                by {creation.creator_username || "Anonymous"}
              </p>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <Heart className="w-3 h-3 text-pink-400" /> {creation.likes}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-zinc-500" /> {creation.views} views
                </span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

