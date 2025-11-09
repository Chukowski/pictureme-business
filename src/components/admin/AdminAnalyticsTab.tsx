import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getUserEvents, type User, type EventConfig } from "@/services/eventsApi";
import {
  BarChart3,
  Camera,
  Image,
  TrendingUp,
  Eye,
  Calendar,
  Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const API_URL = import.meta.env.VITE_API_URL || "";

interface EventAnalytics {
  event_id: string;
  event_title: string;
  total_photos: number;
  total_views: number;
  photos_last_24h: number;
  most_used_template?: string;
  avg_processing_time?: number;
  is_active: boolean;
}

interface AdminAnalyticsTabProps {
  currentUser: User;
}

export default function AdminAnalyticsTab({ currentUser }: AdminAnalyticsTabProps) {
  const [events, setEvents] = useState<EventConfig[]>([]);
  const [analytics, setAnalytics] = useState<EventAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("auth_token");
      
      // Get events first
      const eventsData = await getUserEvents();
      setEvents(eventsData);

      // Fetch analytics for each event
      const analyticsPromises = eventsData.map(async (event) => {
        try {
          const response = await fetch(
            `${API_URL}/api/admin/events/${event._id}/analytics`,
            {
              headers: {
                Authorization: token ? `Bearer ${token}` : "",
              },
            }
          );

          if (!response.ok) {
            console.warn(`Failed to load analytics for event ${event._id}`);
            return null;
          }

          const data = await response.json();
          return {
            event_id: event._id,
            event_title: event.title,
            is_active: event.is_active,
            ...data,
          };
        } catch (error) {
          console.error(`Error loading analytics for event ${event._id}:`, error);
          return null;
        }
      });

      const analyticsResults = await Promise.all(analyticsPromises);
      const validAnalytics = analyticsResults.filter((a): a is EventAnalytics => a !== null);
      setAnalytics(validAnalytics);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load analytics";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const totalStats = analytics.reduce(
    (acc, curr) => ({
      totalPhotos: acc.totalPhotos + curr.total_photos,
      totalViews: acc.totalViews + curr.total_views,
      photosLast24h: acc.photosLast24h + curr.photos_last_24h,
      activeEvents: acc.activeEvents + (curr.is_active ? 1 : 0),
    }),
    { totalPhotos: 0, totalViews: 0, photosLast24h: 0, activeEvents: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Photos</CardTitle>
            <Camera className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{totalStats.totalPhotos.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all events
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-secondary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{totalStats.totalViews.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Feed impressions
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last 24 Hours</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-500">
                  +{totalStats.photosLast24h}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  New photos taken
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Events</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold text-blue-500">
                  {totalStats.activeEvents}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Of {events.length} total
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-Event Analytics */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          Event Performance
        </h2>
        
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
        ) : analytics.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <BarChart3 className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">No analytics yet</h3>
                  <p className="text-muted-foreground">
                    Create events and start taking photos to see analytics
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {analytics.map((eventAnalytics) => (
              <Card key={eventAnalytics.event_id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg">{eventAnalytics.event_title}</CardTitle>
                    <Badge variant={eventAnalytics.is_active ? "default" : "secondary"}>
                      {eventAnalytics.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Image className="w-3.5 h-3.5" />
                        Total Photos
                      </div>
                      <p className="text-2xl font-bold text-primary">
                        {eventAnalytics.total_photos}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Eye className="w-3.5 h-3.5" />
                        Total Views
                      </div>
                      <p className="text-2xl font-bold text-secondary">
                        {eventAnalytics.total_views}
                      </p>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Last 24h</span>
                      <Badge variant="outline" className="text-green-500 border-green-500/50">
                        +{eventAnalytics.photos_last_24h}
                      </Badge>
                    </div>
                    {eventAnalytics.most_used_template && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Top Template</span>
                        <span className="text-xs font-medium truncate max-w-[150px]">
                          {eventAnalytics.most_used_template}
                        </span>
                      </div>
                    )}
                    {eventAnalytics.avg_processing_time && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Avg. Process Time</span>
                        <span className="text-xs font-medium">
                          {eventAnalytics.avg_processing_time.toFixed(1)}s
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

