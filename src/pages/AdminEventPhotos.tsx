import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getCurrentUser } from "@/services/eventsApi";
import { ArrowLeft, Trash2, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DarkModeToggle } from "@/components/DarkModeToggle";

const API_URL = import.meta.env.VITE_API_URL || "";

interface Photo {
  id: string;
  _id?: string;
  share_code: string;
  original_image_url: string;
  processed_image_url: string;
  background_name?: string;
  created_at: string;
}

export default function AdminEventPhotos() {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  const currentUser = useMemo(() => getCurrentUser(), []);

  useEffect(() => {
    if (!currentUser) {
      navigate("/admin/auth");
      return;
    }

    loadPhotos();
  }, [currentUser, eventId, navigate]);

  const loadPhotos = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("auth_token");
      const endpoint = `${API_URL}/api/admin/events/${eventId}/photos?limit=100&offset=0`;
      const response = await fetch(endpoint, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Session expired. Please log in again.");
        }

        let bodyText = "";
        try {
          bodyText = await response.text();
        } catch (readError) {
          console.error("Failed to read error response:", readError);
        }

        console.error("Failed to load photos:", {
          status: response.status,
          statusText: response.statusText,
          bodyText,
        });
        throw new Error("Failed to load photos");
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const bodyText = await response.text();
        console.error("Unexpected response from photos endpoint:", bodyText);
        throw new Error("Unexpected response format from server");
      }

      const data = await response.json();
      setPhotos(data.photos || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load photos";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (photo: Photo) => {
    setPhotoToDelete(photo);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!photoToDelete) return;

    const photoId = photoToDelete.id || photoToDelete._id;
    if (!photoId) {
      toast.error("Invalid photo ID");
      return;
    }

    try {
      setDeletingPhotoId(photoId);
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${API_URL}/api/photos/${photoId}`, {
        method: "DELETE",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        console.error("Failed to delete photo:", {
          status: response.status,
          statusText: response.statusText,
          body,
        });
        throw new Error("Failed to delete photo");
      }

      toast.success("Photo deleted successfully");
      setPhotos(photos.filter((p) => (p.id || p._id) !== photoId));
      setDeleteDialogOpen(false);
      setPhotoToDelete(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete photo";
      toast.error(message);
    } finally {
      setDeletingPhotoId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/admin/events")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Event Photos
              </h1>
              <p className="text-muted-foreground">
                Manage photos for this event
              </p>
            </div>
          </div>
          <DarkModeToggle />
        </div>

        {/* Photos Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i}>
                <CardContent className="p-0">
                  <Skeleton className="w-full aspect-[3/4]" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : photos.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">No photos yet</h3>
                  <p className="text-muted-foreground">
                    Photos will appear here as guests take them
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {photos.map((photo) => (
              <Card
                key={photo.id || photo._id}
                className="overflow-hidden group relative"
              >
                <CardContent className="p-0">
                  <div className="relative aspect-[3/4]">
                    <img
                      src={photo.processed_image_url || photo.original_image_url}
                      alt={photo.background_name || "Event photo"}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(photo)}
                        disabled={deletingPhotoId === (photo.id || photo._id)}
                      >
                        {deletingPhotoId === (photo.id || photo._id) ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Trash2 className="w-4 h-4 mr-2" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardHeader className="p-3">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-mono">{photo.share_code}</p>
                    {photo.background_name && (
                      <p className="truncate">{photo.background_name}</p>
                    )}
                    <p>
                      {new Date(photo.created_at).toLocaleDateString()}{" "}
                      {new Date(photo.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* Photo Count */}
        {!isLoading && photos.length > 0 && (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Total photos: {photos.length}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this photo? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

