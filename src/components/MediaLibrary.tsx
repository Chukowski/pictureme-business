import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, Trash2, Image as ImageIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || '';

interface MediaItem {
  name: string;
  url: string;
  size: number;
  uploaded_at: string | null;
  type: string;
}

interface MediaLibraryProps {
  onSelectMedia: (url: string) => void;
  selectedUrl?: string;
  eventId?: string; // Filter media by event
  templates?: Array<{ images: string[] }>; // Show only images from event templates
  onDeleteMedia?: (url: string) => void; // Callback when media is deleted from template
}

export function MediaLibrary({ onSelectMedia, selectedUrl, eventId, templates, onDeleteMedia }: MediaLibraryProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadMediaLibrary();
  }, [eventId, templates]);

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
      const response = await fetch(`${API_URL}/api/media/library`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load media library");
      }

      const data = await response.json();
      setMedia(data.media || []);
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
            <ImageIcon className="h-5 w-5" />
            {templates && templates.length > 0 ? 'Event Images' : 'Media Library'}
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
                className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                  selectedUrl === item.url
                    ? "border-primary ring-2 ring-primary"
                    : "border-transparent hover:border-primary/50"
                }`}
                onClick={() => onSelectMedia(item.url)}
              >
                <img
                  src={item.url}
                  alt={item.name}
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate">
                  {item.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

