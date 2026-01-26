import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  getUserEvents,
  deleteEvent,
  getCurrentUser,
  logoutUser,
  type EventConfig,
} from "@/services/eventsApi";
import {
  Calendar,
  Eye,
  EyeOff,
  Image,
  LogOut,
  Pencil,
  Plus,
  Trash2,
  User,
  ExternalLink,
} from "lucide-react";
import { DarkModeToggle } from "@/components/DarkModeToggle";
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

export default function AdminEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<EventConfig | null>(null);

  const currentUser = useMemo(() => getCurrentUser(), []);

  useEffect(() => {
    if (!currentUser) {
      navigate("/auth");
      return;
    }

    loadEvents();
  }, [currentUser, navigate]);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const data = await getUserEvents();
      setEvents(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load events");
      if (error.message.includes("Not authenticated")) {
        navigate("/auth");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    toast.success("Logged out successfully");
    navigate("/auth");
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
    <div className="min-h-screen bg-gradient-dark p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Event Management</h1>
            <p className="text-muted-foreground">
              Manage your photo booth events and templates
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card/50">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">
                {currentUser?.full_name || currentUser?.username}
              </span>
            </div>
            <DarkModeToggle />
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Create Event Button */}
        <Button
          onClick={() => navigate("/business/events/create")}
          size="lg"
          className="mb-6"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create New Event
        </Button>

        {/* Events List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : events.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">No events yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first event to get started
                  </p>
                  <Button onClick={() => navigate("/business/events/create")}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Event
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Card key={event._id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-xl">{event.title}</CardTitle>
                    <Badge variant={event.is_active ? "default" : "secondary"}>
                      {event.is_active ? (
                        <>
                          <Eye className="w-3 h-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </Badge>
                  </div>
                  <CardDescription>
                    {event.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Image className="w-4 h-4" />
                      <span>{event.templates?.length || 0} templates</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {event.start_date
                          ? new Date(event.start_date).toLocaleDateString()
                          : "No date"}
                      </span>
                    </div>
                  </div>

                  {/* Event URL */}
                  <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Event URL:</p>
                      <code className="text-xs text-primary break-all">
                        /{currentUser?.slug}/{event.slug}
                      </code>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Feed URL:</p>
                      <code className="text-xs text-primary break-all">
                        /{currentUser?.slug}/{event.slug}/feed
                      </code>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewEvent(event)}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Event
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewFeed(event)}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Feed
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/business/events/edit/${event._id}`)}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/business/events/${event._id}/photos`)}
                    >
                      <Image className="w-4 h-4 mr-1" />
                      Photos
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(event)}
                      className="col-span-2"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{eventToDelete?.title}"? This action
              cannot be undone and will delete all associated photos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

