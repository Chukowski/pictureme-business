import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  getUserEvents,
  deleteEvent,
  type EventConfig,
  type User,
} from "@/services/eventsApi";
import { getPlanFeatures, getPlanDisplayName } from "@/lib/planFeatures";
import {
  Calendar,
  Plus,
  Trash2,
  ExternalLink,
  MoreHorizontal,
  Settings,
  LayoutTemplate,
  Activity,
  Image as ImageIcon,
  PlayCircle,
  Megaphone
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

  // Get plan features from centralized config
  const userRole = currentUser?.subscription_tier || currentUser?.role || 'individual';
  const planFeatures = getPlanFeatures(userRole);
  const planDisplayName = getPlanDisplayName(userRole);

  // Calculate active events and limit from plan features
  const activeEventsCount = events.filter(e => e.is_active).length;
  const maxEvents = planFeatures.maxActiveEvents;
  const canCreateEvent = activeEventsCount < maxEvents;
  const totalTemplates = events.reduce((acc, e) => acc + (e.templates?.length || 0), 0);

  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getUserEvents();
      setEvents(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load events";
      toast.error(message);
      if (message.includes("Not authenticated")) {
        navigate("/auth");
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

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
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to delete event");
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
    <div className="max-w-[1280px] mx-auto space-y-8">
      {/* Dashboard Stats & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 h-full">
            <Card className="bg-card/50 border-white/10 backdrop-blur-sm p-4 flex flex-col justify-center h-full">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Active Events</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white">{activeEventsCount}</span>
                    <span className="text-sm text-zinc-500 font-medium">/ {maxEvents}</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-card/50 border-white/10 backdrop-blur-sm p-4 flex flex-col justify-center h-full">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <LayoutTemplate className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Templates</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white">{totalTemplates}</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-card/50 border-white/10 backdrop-blur-sm p-4 flex flex-col justify-center h-full">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Plan</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-white">
                      {planDisplayName}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Your Events</h2>
            <p className="text-sm text-zinc-400">Manage and monitor your active photo booths</p>
          </div>

          <div className="flex items-center gap-3">
            {!canCreateEvent && (
              <span className="hidden sm:inline text-xs text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
                Limit reached ({maxEvents}/{maxEvents})
              </span>
            )}
            <Button
              onClick={() => navigate("/business/events/create")}
              className="bg-white text-black hover:bg-zinc-200 font-medium"
              disabled={!canCreateEvent}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Button>
          </div>
        </div>

        {/* Events Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl bg-card/50 border border-white/5 p-6 h-[240px] animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl bg-card/30 border border-white/10 border-dashed p-12 text-center">
            <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center border border-white/5">
                <Calendar className="w-8 h-8 text-zinc-500" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white mb-2">You don't have any events yet</h3>
                <p className="text-sm text-zinc-400 mb-6">
                  Start growing your workspace by creating your first event.
                </p>
                <Button
                  onClick={() => navigate("/business/events/create")}
                  variant="outline"
                  className="border-white/10 text-white hover:bg-white/5"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Event
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <div
                key={event._id}
                className="group relative rounded-2xl bg-card/50 backdrop-blur-sm border border-white/10 hover:border-indigo-500/30 transition-all hover:bg-card/80 flex flex-col"
              >
                {/* Card Header */}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 mr-3 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-white truncate" title={event.title}>
                          {event.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 h-5 border-0 ${event.is_active
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-zinc-500/10 text-zinc-400"
                            }`}
                        >
                          {event.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-400 truncate">
                        /{event.slug}
                      </p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10 -mr-2"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-white/10 text-zinc-200">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleViewEvent(event)} className="cursor-pointer">
                          <ExternalLink className="w-4 h-4 mr-2" /> View Event
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewFeed(event)} className="cursor-pointer">
                          <ImageIcon className="w-4 h-4 mr-2" /> View Feed
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/business/events/${event.slug}/photos`)} className="cursor-pointer">
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

                  <p className="text-xs text-zinc-500 line-clamp-2 h-8 mb-2">
                    {event.description || "No description provided for this event."}
                  </p>
                </div>

                {/* Stats Bar */}
                <div className="px-5 py-3 bg-white/[0.02] border-t border-b border-white/5 grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Templates</span>
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <LayoutTemplate className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-sm font-medium">{event.templates?.length || 0}</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Created</span>
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-sm font-medium">
                        {event.start_date
                          ? new Date(event.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="p-4 mt-auto grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/business/events/edit/${event._id}`)}
                    className="h-9 text-xs border-white/10 bg-transparent hover:bg-white/5 text-zinc-300 hover:text-white"
                  >
                    <Settings className="w-3.5 h-3.5 mr-2" />
                    Configure
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => navigate(`/business/events/${event._id}/live`)}
                    className="h-9 text-xs bg-zinc-100 hover:bg-white text-black border-0"
                  >
                    <PlayCircle className="w-3.5 h-3.5 mr-2" />
                    Live Mode
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-white/10 text-white">
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
    </div>
  );
}
