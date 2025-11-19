import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  getUserEvents,
  deleteEvent,
  type EventConfig,
  type User,
} from "@/services/eventsApi";
import {
  Calendar,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Pencil,
  Plus,
  Trash2,
  ExternalLink,
  MoreHorizontal,
  QrCode,
  Settings,
  Copy
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdminEventsTabProps {
  currentUser: User;
}

export default function AdminEventsTab({ currentUser }: AdminEventsTabProps) {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<EventConfig | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const data = await getUserEvents();
      setEvents(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load events");
      if (error.message.includes("Not authenticated")) {
        navigate("/admin/auth");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (event: EventConfig) => {
    setEventToDelete(event);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return;

    try {
      await deleteEvent(eventToDelete._id);
      toast.success("Event deleted successfully");
      loadEvents();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete event");
    } finally {
      setDeleteDialogOpen(false);
      setEventToDelete(null);
    }
  };

  const handleViewEvent = (event: EventConfig) => {
    const url = `/${currentUser?.slug}/${event.slug}`;
    window.open(url, "_blank");
  };

  const handleViewFeed = (event: EventConfig) => {
    const url = `/${currentUser?.slug}/${event.slug}/feed`;
    window.open(url, "_blank");
  };

  return (
    <>
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-semibold text-white">Your Events</h2>
        <Button
          onClick={() => navigate("/admin/events/create")}
          className="bg-indigo-600 hover:bg-indigo-500 text-white border-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Event
        </Button>
      </div>

      {/* Events List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-3xl bg-zinc-900/50 border border-white/5 p-6 h-[300px] animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-3xl bg-zinc-900/50 border border-white/5 p-12 text-center">
          <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full bg-zinc-800/50 flex items-center justify-center border border-white/5">
              <Calendar className="w-10 h-10 text-zinc-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">No events yet</h3>
              <p className="text-zinc-400 mb-6">
                Create your first event to start capturing photos and engaging with your audience.
              </p>
              <Button
                onClick={() => navigate("/admin/events/create")}
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div
              key={event._id}
              className="group relative rounded-3xl bg-zinc-900/50 backdrop-blur-sm border border-white/10 hover:border-indigo-500/30 transition-all hover:-translate-y-1 overflow-hidden flex flex-col"
            >
              {/* Card Header */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 mr-4">
                    <h3 className="text-lg font-bold text-white mb-1 line-clamp-1" title={event.title}>
                      {event.title}
                    </h3>
                    <p className="text-sm text-zinc-400 line-clamp-1">
                      {event.description || "No description"}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={event.is_active
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                    }
                  >
                    {event.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 py-4 border-t border-white/5 border-b mb-4">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <ImageIcon className="w-4 h-4 text-indigo-400" />
                    <span>{event.templates?.length || 0} templates</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <span>
                      {event.start_date
                        ? new Date(event.start_date).toLocaleDateString()
                        : "No date"}
                    </span>
                  </div>
                </div>

                {/* Quick Links */}
                <div className="space-y-2 mb-2">
                  <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-black/40 border border-white/5">
                    <span className="text-zinc-500">Event URL</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-indigo-400 max-w-[120px] truncate">
                        /{currentUser?.slug}/{event.slug}
                      </code>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/${currentUser?.slug}/${event.slug}`;
                            navigator.clipboard.writeText(url);
                            toast.success("Event URL copied to clipboard");
                          }}
                          className="text-zinc-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
                          title="Copy Link"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleViewEvent(event)}
                          className="text-zinc-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
                          title="Open Link"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-black/40 border border-white/5">
                    <span className="text-zinc-500">Feed URL</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-indigo-400 max-w-[120px] truncate">
                        /{currentUser?.slug}/{event.slug}/feed
                      </code>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/${currentUser?.slug}/${event.slug}/feed`;
                            navigator.clipboard.writeText(url);
                            toast.success("Feed URL copied to clipboard");
                          }}
                          className="text-zinc-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
                          title="Copy Link"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleViewFeed(event)}
                          className="text-zinc-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
                          title="Open Link"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer / Actions */}
              <div className="mt-auto p-4 bg-white/5 border-t border-white/5 grid grid-cols-2 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/admin/events/edit/${event._id}`)}
                  className="text-zinc-300 hover:text-white hover:bg-white/10"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Edit
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-zinc-300 hover:text-white hover:bg-white/10"
                    >
                      <MoreHorizontal className="w-4 h-4 mr-2" />
                      More
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-zinc-200">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleViewEvent(event)} className="focus:bg-white/10 focus:text-white cursor-pointer">
                      <ExternalLink className="w-4 h-4 mr-2" /> View Event
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleViewFeed(event)} className="focus:bg-white/10 focus:text-white cursor-pointer">
                      <ImageIcon className="w-4 h-4 mr-2" /> View Feed
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/admin/events/${event._id}/photos`)} className="focus:bg-white/10 focus:text-white cursor-pointer">
                      <ImageIcon className="w-4 h-4 mr-2" /> Manage Photos
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                      onClick={() => handleDeleteClick(event)}
                      className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Event
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete "{eventToDelete?.title}"? This action
              cannot be undone and will delete all associated photos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700 text-white border-0">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
