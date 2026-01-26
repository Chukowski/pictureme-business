import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, Trash2, Image as ImageIcon, Loader2, Play, Layout, Sparkles, Plus, MoreVertical, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ENV } from "@/config/env";
import { getImageUrl } from "@/services/cdn";
import { useNavigate } from "react-router-dom";
import { getUserEvents, updateEvent, EventConfig, Template } from "@/services/eventsApi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const API_URL = ENV.API_URL;

interface MediaItem {
  name: string;
  url: string;
  path?: string;
  size: number;
  category?: string;
  modified?: string;
  uploaded_at?: string | null; // Legacy field
  type?: string;
}

interface MediaLibraryProps {
  onSelectMedia: (url: string) => void;
  selectedUrl?: string;
  eventId?: string; // Filter media by event
  templates?: Array<{ images: string[] }>; // Show only images from event templates
  onDeleteMedia?: (url: string) => void; // Callback when media is deleted from template
  category?: string; // Filter by category (e.g., 'assets')
}

export function MediaLibrary({ onSelectMedia, selectedUrl, eventId, templates, onDeleteMedia, category }: MediaLibraryProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [userEvents, setUserEvents] = useState<EventConfig[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<MediaItem | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadMediaLibrary();
  }, [eventId, templates, category]);

  const loadMediaLibrary = async () => {
    try {
      setLoading(true);

      // If templates are provided, extract images from them (event-specific)
      if (templates && templates.length > 0) {
        const eventImages = new Set<string>();
        templates.forEach((template) => {
          template.images.forEach((img) => {
            if (img && img.trim()) {
              eventImages.add(img);
            }
          });
        });

        // Convert to MediaItem format
        const eventMedia: MediaItem[] = Array.from(eventImages).map((url) => {
          // Extract filename from URL for deletion
          const urlParts = url.split('/');
          const filename = urlParts[urlParts.length - 1];

          return {
            name: filename,
            url,
            size: 0,
            uploaded_at: null,
            type: 'template-image',
          };
        });

        setMedia(eventMedia);
        setLoading(false);
        return;
      }

      // Otherwise, load from user's media library
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No authentication token found");
      }
      const url = new URL(`${API_URL}/api/media/library`);
      if (category) url.searchParams.append("category", category);

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load media library");
      }

      const data = await response.json();
      // Backend returns { items: [...] } but we also support legacy { media: [...] }
      setMedia(data.items || data.media || []);
    } catch (error) {
      console.error("Error loading media library:", error);
      toast({
        title: "Error",
        description: "Failed to load media library",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No authentication token found");
      }
      const formData = new FormData();
      formData.append("file", file);
      if (category) formData.append("category", category);

      const response = await fetch(`${API_URL}/api/media/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload media");
      }

      const data = await response.json();
      toast({
        title: "Success",
        description: "Media uploaded successfully",
      });

      // Reload library
      await loadMediaLibrary();

      // Auto-select the newly uploaded media
      onSelectMedia(data.url);
    } catch (error) {
      console.error("Error uploading media:", error);
      toast({
        title: "Error",
        description: "Failed to upload media",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUseInPlayground = (item: MediaItem) => {
    // Navigate to playground with image parameter
    // We encode the URL to be safe
    const encodedUrl = encodeURIComponent(item.url);
    navigate(`/business/playground?image=${encodedUrl}&source=library`);
  };

  const handleStartUseInTemplate = async (item: MediaItem) => {
    setSelectedAsset(item);
    setShowEventDialog(true);

    // Fetch events if not already fetched
    if (userEvents.length === 0) {
      try {
        const events = await getUserEvents();
        setUserEvents(events);
      } catch (err) {
        console.error("Failed to fetch events:", err);
      }
    }
  };

  const handleCreateTemplate = async (event: EventConfig) => {
    if (!selectedAsset) return;

    setIsProcessingAction(true);
    try {
      const newTemplate: Template = {
        id: `template-${Date.now()}`,
        name: `Asset Template ${new Date().toLocaleDateString()}`,
        description: `Created from generated asset: ${selectedAsset.name}`,
        images: [selectedAsset.url],
        prompt: "Enhance this asset, professional lighting, cinematic detail",
        active: true,
        includeBranding: true,
        includeTagline: true,
        pipelineConfig: {
          imageModel: 'nano-banana',
        }
      };

      const updatedTemplates = [...(event.templates || []), newTemplate];
      await updateEvent(event._id, { templates: updatedTemplates });

      toast({
        title: "Success",
        description: `Template added to ${event.title}`,
      });

      setShowEventDialog(false);
      // Navigate to event editor after success?
      navigate(`/business/events/${event._id}/templates`);
    } catch (error) {
      console.error("Failed to create template:", error);
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive"
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDelete = async (item: MediaItem) => {
    if (!confirm("Are you sure you want to delete this media?")) return;

    try {
      // If this is from templates (event-specific), notify parent to remove from template
      if (item.type === 'template-image' && onDeleteMedia) {
        onDeleteMedia(item.url);
        // Parent will handle the toast message
        return;
      }

      // Otherwise, delete from user's media library
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No authentication token found");
      }
      const response = await fetch(`${API_URL}/api/media/${item.name}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete media");
      }

      toast({
        title: "Success",
        description: "Media deleted successfully",
      });

      // Reload library
      await loadMediaLibrary();
    } catch (error) {
      console.error("Error deleting media:", error);
      toast({
        title: "Error",
        description: "Failed to delete media",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-indigo-400" />
            {templates && templates.length > 0 ? 'Event Images' : category === 'assets' ? 'Generated Assets' : 'Media Library'}
          </span>
          <label htmlFor="media-upload">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => document.getElementById("media-upload")?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
            <Input
              id="media-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
          </label>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : media.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{templates && templates.length > 0 ? 'No images in event templates' : 'No media uploaded yet'}</p>
            <p className="text-sm">
              {templates && templates.length > 0
                ? 'Add images to your templates to see them here'
                : 'Upload images to reuse them in templates'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {media.map((item) => (
              <div
                key={item.name}
                className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${selectedUrl === item.url
                  ? "border-primary ring-2 ring-primary"
                  : "border-transparent hover:border-primary/50"
                  }`}
                onClick={() => onSelectMedia(item.url)}
              >
                <img
                  src={getImageUrl(item.url, { preset: 'thumbnail' })}
                  alt={item.name}
                  className="w-full h-32 object-cover"
                  onError={(e) => {
                    // Fallback to original URL if CDN fails
                    e.currentTarget.src = item.url;
                  }}
                />
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon" className="h-8 w-8 bg-black/60 hover:bg-black/80 border-none">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-[#101112] border-white/10 text-white">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(item.url, '_blank');
                        }}
                        className="flex items-center gap-2 cursor-pointer focus:bg-white/5"
                      >
                        <ExternalLink className="h-4 w-4 text-zinc-400" />
                        Open Original
                      </DropdownMenuItem>

                      {category === 'assets' && (
                        <>
                          <DropdownMenuSeparator className="bg-white/5" />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUseInPlayground(item);
                            }}
                            className="flex items-center gap-2 cursor-pointer focus:bg-white/5"
                          >
                            <Play className="h-4 w-4 text-pink-400" />
                            Use in Playground
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartUseInTemplate(item);
                            }}
                            className="flex items-center gap-2 cursor-pointer focus:bg-white/5"
                          >
                            <Layout className="h-4 w-4 text-indigo-400" />
                            Use in Template
                          </DropdownMenuItem>
                        </>
                      )}

                      <DropdownMenuSeparator className="bg-white/5" />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item);
                        }}
                        className="flex items-center gap-2 text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Asset
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] p-1.5 truncate backdrop-blur-sm">
                  {item.name}
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
          <DialogContent className="max-w-md bg-[#101112] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Layout className="w-5 h-5 text-indigo-400" />
                Select Destination Event
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                Choose which event should receive this new template.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[300px] mt-4 pr-2">
              <div className="space-y-2">
                {userEvents.length === 0 ? (
                  <div className="text-center py-6 text-zinc-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Finding your events...
                  </div>
                ) : (
                  userEvents.map(event => (
                    <button
                      key={event._id}
                      onClick={() => handleCreateTemplate(event)}
                      disabled={isProcessingAction}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-indigo-500/30 transition-all text-left"
                    >
                      <div>
                        <div className="text-sm font-medium">{event.title}</div>
                        <div className="text-xs text-zinc-500">{event.slug}</div>
                      </div>
                      <Plus className="w-4 h-4 text-indigo-400" />
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

