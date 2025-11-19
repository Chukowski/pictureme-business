import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { getCurrentUser } from "@/services/eventsApi";
import {
  ArrowLeft,
  Trash2,
  Loader2,
  Download,
  ExternalLink,
  Calendar,
  Image as ImageIcon,
  CheckSquare,
  Square,
  Filter,
  ArrowUpDown,
  Printer,
  X,
  Check,
  Eye
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

type SortOrder = "newest" | "oldest";

export default function AdminEventPhotos() {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selection & Bulk Actions
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Sorting
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  // Dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null); // For single delete
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null); // For single delete loading state

  // Preview Modal
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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
        throw new Error("Failed to load photos");
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

  // Sorting Logic
  const sortedPhotos = useMemo(() => {
    return [...photos].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
  }, [photos, sortOrder]);

  // Selection Logic
  const toggleSelection = (photoId: string) => {
    const newSelection = new Set(selectedPhotoIds);
    if (newSelection.has(photoId)) {
      newSelection.delete(photoId);
    } else {
      newSelection.add(photoId);
    }
    setSelectedPhotoIds(newSelection);

    // Auto-enable selection mode if items are selected
    if (newSelection.size > 0 && !isSelectionMode) {
      setIsSelectionMode(true);
    }
    // Auto-disable if empty (optional, maybe keep it enabled for UX)
    if (newSelection.size === 0) {
      setIsSelectionMode(false);
    }
  };

  const selectAll = () => {
    if (selectedPhotoIds.size === photos.length) {
      setSelectedPhotoIds(new Set());
      setIsSelectionMode(false);
    } else {
      const allIds = new Set(photos.map(p => p.id || p._id || ""));
      setSelectedPhotoIds(allIds);
      setIsSelectionMode(true);
    }
  };

  // Bulk Actions
  const handleBulkDelete = async () => {
    if (selectedPhotoIds.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedPhotoIds.size} photos? This cannot be undone.`)) {
      return;
    }

    setIsBulkDeleting(true);
    const token = localStorage.getItem("auth_token");
    let deletedCount = 0;
    let errors = 0;

    try {
      // Execute deletes in parallel (or batches if needed)
      const deletePromises = Array.from(selectedPhotoIds).map(async (id) => {
        try {
          const response = await fetch(`${API_URL}/api/photos/${id}`, {
            method: "DELETE",
            headers: { Authorization: token ? `Bearer ${token}` : "" },
          });
          if (response.ok) deletedCount++;
          else errors++;
        } catch (e) {
          errors++;
        }
      });

      await Promise.all(deletePromises);

      if (deletedCount > 0) {
        toast.success(`Successfully deleted ${deletedCount} photos`);
        // Refresh local state
        setPhotos(prev => prev.filter(p => !selectedPhotoIds.has(p.id || p._id || "")));
        setSelectedPhotoIds(new Set());
        setIsSelectionMode(false);
      }

      if (errors > 0) {
        toast.error(`Failed to delete ${errors} photos`);
      }
    } catch (error) {
      toast.error("An error occurred during bulk deletion");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkDownload = () => {
    if (selectedPhotoIds.size === 0) return;

    toast.info(`Starting download for ${selectedPhotoIds.size} photos...`);

    // Simple sequential download trigger
    // Note: Browsers might block multiple popups. 
    // A better production solution would be a backend zip endpoint.
    let delay = 0;
    selectedPhotoIds.forEach(id => {
      const photo = photos.find(p => (p.id || p._id) === id);
      if (photo) {
        setTimeout(() => {
          const link = document.createElement('a');
          link.href = photo.processed_image_url || photo.original_image_url;
          link.download = `photo-${photo.share_code}.jpg`;
          link.target = "_blank";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, delay);
        delay += 500; // Stagger downloads to be nicer to the browser
      }
    });
  };

  // Single Actions
  const handleDeleteClick = (photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selection toggle
    setPhotoToDelete(photo);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!photoToDelete) return;

    const photoId = photoToDelete.id || photoToDelete._id;
    if (!photoId) return;

    try {
      setDeletingPhotoId(photoId);
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${API_URL}/api/photos/${photoId}`, {
        method: "DELETE",
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });

      if (!response.ok) throw new Error("Failed to delete photo");

      toast.success("Photo deleted successfully");
      setPhotos(photos.filter((p) => (p.id || p._id) !== photoId));

      // Also remove from selection if it was selected
      if (selectedPhotoIds.has(photoId)) {
        const newSelection = new Set(selectedPhotoIds);
        newSelection.delete(photoId);
        setSelectedPhotoIds(newSelection);
      }

      setDeleteDialogOpen(false);
      setPhotoToDelete(null);
    } catch (error) {
      toast.error("Failed to delete photo");
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const handlePrint = (photo: Photo) => {
    const imageUrl = photo.processed_image_url || photo.original_image_url;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Photo ${photo.share_code}</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: white; }
              img { max-width: 100%; max-height: 100%; object-fit: contain; }
              @media print {
                body { -webkit-print-color-adjust: exact; }
                @page { size: auto; margin: 0mm; }
              }
            </style>
          </head>
          <body>
            <img src="${imageUrl}" onload="setTimeout(() => { window.print(); window.close(); }, 500);" />
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleDownload = (photo: Photo) => {
    const link = document.createElement('a');
    link.href = photo.processed_image_url || photo.original_image_url;
    link.download = `photo-${photo.share_code}.jpg`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header & Toolbar */}
        <div className="flex flex-col gap-6 mb-8">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/admin/events")}
                className="shrink-0 text-zinc-400 hover:text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-white">Event Photos</h1>
                <p className="text-sm text-zinc-400">Manage your event gallery</p>
              </div>
            </div>

            {!isLoading && photos.length > 0 && (
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="px-3 py-1 bg-zinc-900/50 border-white/10 text-zinc-300">
                  {photos.length} Photos
                </Badge>
              </div>
            )}
          </div>

          {/* Action Toolbar */}
          {!isLoading && photos.length > 0 && (
            <div className="sticky top-4 z-10 flex flex-wrap items-center justify-between gap-4 p-3 rounded-xl bg-zinc-900/80 backdrop-blur-md border border-white/10 shadow-xl">
              {/* Left: Selection Controls */}
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  className="text-zinc-300 hover:text-white hover:bg-white/10"
                >
                  {selectedPhotoIds.size === photos.length ? (
                    <CheckSquare className="w-4 h-4 mr-2 text-indigo-400" />
                  ) : (
                    <Square className="w-4 h-4 mr-2" />
                  )}
                  {selectedPhotoIds.size === photos.length ? "Deselect All" : "Select All"}
                </Button>

                {selectedPhotoIds.size > 0 && (
                  <div className="h-6 w-px bg-white/10 mx-1" />
                )}

                {selectedPhotoIds.size > 0 && (
                  <span className="text-sm font-medium text-indigo-400 animate-in fade-in">
                    {selectedPhotoIds.size} selected
                  </span>
                )}
              </div>

              {/* Right: Actions & Sort */}
              <div className="flex items-center gap-2">
                {selectedPhotoIds.size > 0 ? (
                  <>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleBulkDelete}
                      disabled={isBulkDeleting}
                      className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                    >
                      {isBulkDeleting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
                      Delete ({selectedPhotoIds.size})
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleBulkDownload}
                      className="bg-white/10 text-white hover:bg-white/20 border border-white/10"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download ({selectedPhotoIds.size})
                    </Button>
                    <div className="h-6 w-px bg-white/10 mx-1" />
                  </>
                ) : null}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="border-white/10 bg-black/20 text-zinc-300 hover:text-white hover:bg-white/5">
                      <ArrowUpDown className="w-4 h-4 mr-2" />
                      Sort: {sortOrder === "newest" ? "Newest" : "Oldest"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-zinc-200">
                    <DropdownMenuItem onClick={() => setSortOrder("newest")} className="focus:bg-white/10 cursor-pointer">
                      Newest First
                      {sortOrder === "newest" && <Check className="w-4 h-4 ml-auto" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortOrder("oldest")} className="focus:bg-white/10 cursor-pointer">
                      Oldest First
                      {sortOrder === "oldest" && <Check className="w-4 h-4 ml-auto" />}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
        </div>

        {/* Photos Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-zinc-900/50 border border-white/5 overflow-hidden">
                <Skeleton className="w-full h-full bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="rounded-3xl bg-zinc-900/50 border border-white/5 p-12 text-center">
            <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
              <div className="w-20 h-20 rounded-full bg-zinc-800/50 flex items-center justify-center border border-white/5">
                <ImageIcon className="w-10 h-10 text-zinc-500" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">No photos yet</h3>
                <p className="text-zinc-400 mb-6">
                  Photos will appear here as soon as guests start using the photo booth.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {sortedPhotos.map((photo) => {
              const isSelected = selectedPhotoIds.has(photo.id || photo._id || "");
              return (
                <div
                  key={photo.id || photo._id}
                  onClick={() => toggleSelection(photo.id || photo._id || "")}
                  className={`
                    group relative flex flex-col rounded-xl overflow-hidden cursor-pointer transition-all duration-200 bg-zinc-900/50 border border-white/10
                    ${isSelected
                      ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-black scale-[0.98]"
                      : "hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10"
                    }
                  `}
                >
                  {/* Image Container - Aspect Ratio Fixed but Image Contained */}
                  <div className="relative aspect-[3/4] bg-black/40 w-full overflow-hidden">
                    <img
                      src={photo.processed_image_url || photo.original_image_url}
                      alt={photo.background_name || "Event photo"}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />

                    {/* Selection Overlay */}
                    <div className={`
                      absolute inset-0 transition-colors duration-200 pointer-events-none
                      ${isSelected ? "bg-indigo-500/20" : "group-hover:bg-black/10"}
                    `} />

                    {/* Checkbox Indicator */}
                    <div className={`
                      absolute top-2 left-2 transition-all duration-200 z-10
                      ${isSelected ? "opacity-100 scale-100" : "opacity-0 scale-90 group-hover:opacity-100"}
                    `}>
                      <div className={`
                        w-6 h-6 rounded-full flex items-center justify-center border shadow-sm
                        ${isSelected
                          ? "bg-indigo-500 border-indigo-500 text-white"
                          : "bg-black/50 border-white/30 text-transparent hover:bg-black/70 hover:border-white/50"
                        }
                      `}>
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Actions Overlay */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm border border-white/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewPhoto(photo);
                          setIsPreviewOpen(true);
                        }}
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm border border-white/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrint(photo);
                        }}
                        title="Print"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm border border-white/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(photo);
                        }}
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-full bg-red-500/80 hover:bg-red-600 text-white backdrop-blur-sm border border-white/10"
                        onClick={(e) => handleDeleteClick(photo, e)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Info Footer - Always Visible */}
                  <div className="p-3 bg-zinc-900/90 border-t border-white/5 mt-auto">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                        {photo.share_code}
                      </span>
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(photo.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {photo.background_name && (
                      <p className="text-xs text-zinc-400 truncate" title={photo.background_name}>
                        {photo.background_name}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl w-full bg-zinc-950/95 border-white/10 text-white p-0 overflow-hidden">
          <div className="relative w-full h-[80vh] flex items-center justify-center bg-black/50">
            {previewPhoto && (
              <img
                src={previewPhoto.processed_image_url || previewPhoto.original_image_url}
                alt="Preview"
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>
          {previewPhoto && (
            <div className="p-4 bg-zinc-900 border-t border-white/10 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Photo {previewPhoto.share_code}</p>
                <p className="text-xs text-zinc-400">
                  {new Date(previewPhoto.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handlePrint(previewPhoto)}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleDownload(previewPhoto)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setIsPreviewOpen(false);
                    handleDeleteClick(previewPhoto, { stopPropagation: () => { } } as React.MouseEvent);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Single Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete this photo? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white border-0"
            >
              {deletingPhotoId ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
