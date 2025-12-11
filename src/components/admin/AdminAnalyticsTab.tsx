import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getUserEvents, type User, type EventConfig } from "@/services/eventsApi";
import { 
  getDashboardStats, 
  getDownloadAnalytics,
  type AlbumSummary, 
  type StationAnalytics,
  type DownloadAnalytics
} from "@/services/analyticsApi";
import {
  BarChart3,
  Camera,
  Image as ImageIcon,
  TrendingUp,
  Eye,
  Activity,
  Clock,
  BookOpen,
  CheckCircle,
  CreditCard,
  Zap,
  Download,
  Printer
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from "@/components/ui/select";
import { ENV } from "@/config/env";

// Helper to get API URL
function getApiUrl(): string {
  let url = ENV.API_URL || '';
  if (url && url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    url = url.replace('http://', 'https://');
  }
  return url;
}

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
  const [rangeDays, setRangeDays] = useState(30);
  
  // Real statistics from API
  const [albumStats, setAlbumStats] = useState<AlbumSummary | null>(null);
  const [stationStats, setStationStats] = useState<StationAnalytics[]>([]);
  const [downloadStats, setDownloadStats] = useState<DownloadAnalytics | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  useEffect(() => {
    loadAnalytics(rangeDays);
  }, [rangeDays]);

  const loadAnalytics = useCallback(async (days: number) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("auth_token");

      // Load dashboard stats (albums, stations)
      try {
        const dashboardStats = await getDashboardStats(days);
        setAlbumStats(dashboardStats.albums);
        setStationStats(dashboardStats.stations);
      } catch (statsError) {
        console.warn("Failed to load dashboard stats:", statsError);
      }

      // Get events first
      const eventsData = await getUserEvents();
      setEvents(eventsData);

      // Fetch analytics for each event
      const analyticsPromises = eventsData.map(async (event) => {
        try {
          const response = await fetch(
            `${getApiUrl()}/api/admin/events/${event._id}/analytics`,
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

      // Load download analytics for the first event (or selected event)
      if (eventsData.length > 0) {
        const firstEvent = eventsData[0];
        if (firstEvent.postgresId) {
          setSelectedEventId(firstEvent.postgresId);
          try {
            const downloads = await getDownloadAnalytics(firstEvent.postgresId, days);
            setDownloadStats(downloads);
          } catch (downloadError) {
            console.warn("Failed to load download analytics:", downloadError);
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load analytics";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    <div className="space-y-8 max-w-[1280px] mx-auto">
      {/* Header with range selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-zinc-400">Insights for your events and stations</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-400">Range</span>
          <Select value={String(rangeDays)} onValueChange={(v) => setRangeDays(Number(v))}>
            <SelectTrigger className="w-32 bg-zinc-900 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10 text-white">
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Album Stats - Real Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Albums */}
        <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Albums</CardTitle>
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <BookOpen className="h-4 w-4 text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20 bg-zinc-800" />
            ) : (
              <>
                <div className="text-2xl font-bold text-white">
                  {albumStats?.total_albums?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {albumStats?.total_photos?.toLocaleString() || 0} photos total
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Completed Albums */}
        <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Completed Albums</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20 bg-zinc-800" />
            ) : (
              <>
                <div className="text-2xl font-bold text-emerald-400">
                  {albumStats?.completed_albums || 0}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {albumStats?.in_progress_albums || 0} in progress
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Paid Albums */}
        <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Paid Albums</CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10">
              <CreditCard className="h-4 w-4 text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20 bg-zinc-800" />
            ) : (
              <>
                <div className="text-2xl font-bold text-purple-400">
                  {albumStats?.paid_albums || 0}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Revenue from albums
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Download/Print Analytics */}
      {downloadStats && (downloadStats.total_downloads > 0 || downloadStats.total_photos_downloaded > 0) && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Printer className="w-5 h-5 text-orange-400" />
            Download & Print Analytics (Last {rangeDays} Days)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Downloads */}
            <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Total Downloads</CardTitle>
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Download className="h-4 w-4 text-orange-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-400">
                  {downloadStats.total_downloads}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Download sessions
                </p>
              </CardContent>
            </Card>

            {/* Photos Downloaded */}
            <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Photos Downloaded</CardTitle>
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <ImageIcon className="h-4 w-4 text-amber-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-400">
                  {downloadStats.total_photos_downloaded}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Photos for print/sales
                </p>
              </CardContent>
            </Card>

            {/* Unique Albums */}
            <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Unique Albums</CardTitle>
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <BookOpen className="h-4 w-4 text-yellow-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-400">
                  {downloadStats.unique_albums}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Albums with downloads
                </p>
              </CardContent>
            </Card>

            {/* Download Types */}
            <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">By Type</CardTitle>
                <div className="p-2 rounded-lg bg-lime-500/10">
                  <BarChart3 className="h-4 w-4 text-lime-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {Object.entries(downloadStats.downloads_by_type || {}).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-sm">
                      <span className="text-zinc-400 capitalize">{type}</span>
                      <span className="text-white font-medium">{count}</span>
                    </div>
                  ))}
                  {Object.keys(downloadStats.downloads_by_type || {}).length === 0 && (
                    <span className="text-zinc-500 text-sm">No data yet</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Station Analytics */}
      {stationStats.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-400" />
            Station Activity (Last 30 Days)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stationStats.map((station) => (
              <Card key={station.station_type} className="bg-zinc-900/50 border-white/10">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white capitalize">
                      {station.station_type || 'Unknown'} Station
                    </span>
                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                      {station.photo_count} photos
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {station.album_count} albums • Last: {station.last_photo ? new Date(station.last_photo).toLocaleDateString() : 'N/A'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Event Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Event Photos</CardTitle>
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <Camera className="h-4 w-4 text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20 bg-zinc-800" />
            ) : (
              <>
                <div className="text-2xl font-bold text-white">{totalStats.totalPhotos.toLocaleString()}</div>
                <p className="text-xs text-zinc-500 mt-1">
                  Across all events
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Views</CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Eye className="h-4 w-4 text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20 bg-zinc-800" />
            ) : (
              <>
                <div className="text-2xl font-bold text-white">{totalStats.totalViews.toLocaleString()}</div>
                <p className="text-xs text-zinc-500 mt-1">
                  Feed impressions
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Last 24 Hours</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20 bg-zinc-800" />
            ) : (
              <>
                <div className="text-2xl font-bold text-emerald-400">
                  +{totalStats.photosLast24h}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  New photos taken
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Active Events</CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Activity className="h-4 w-4 text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20 bg-zinc-800" />
            ) : (
              <>
                <div className="text-2xl font-bold text-amber-400">
                  {totalStats.activeEvents}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Of {events.length} total
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-Event Analytics */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          Event Performance
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-3xl bg-zinc-900/50 border border-white/5 p-6 h-[200px] animate-pulse" />
            ))}
          </div>
        ) : analytics.length === 0 ? (
          <div className="rounded-3xl bg-zinc-900/50 border border-white/5 p-12 text-center">
            <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
              <div className="w-20 h-20 rounded-full bg-zinc-800/50 flex items-center justify-center border border-white/5">
                <BarChart3 className="w-10 h-10 text-zinc-500" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">No analytics yet</h3>
                <p className="text-zinc-400">
                  Create events and start taking photos to see analytics
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {analytics.map((eventAnalytics) => (
              <Card key={eventAnalytics.event_id} className="bg-zinc-900/50 border-white/10 hover:border-indigo-500/30 transition-all group">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg text-white truncate pr-4" title={eventAnalytics.event_title}>
                      {eventAnalytics.event_title}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={eventAnalytics.is_active
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                      }
                    >
                      {eventAnalytics.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <ImageIcon className="w-3.5 h-3.5" />
                        Total Photos
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {eventAnalytics.total_photos.toLocaleString()}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <Eye className="w-3.5 h-3.5" />
                        Total Views
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {eventAnalytics.total_views.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Detailed Stats */}
                  <div className="space-y-3 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" /> Last 24h
                      </span>
                      <span className="text-emerald-400 font-medium">
                        +{eventAnalytics.photos_last_24h}
                      </span>
                    </div>

                    {eventAnalytics.most_used_template && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500 flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5" /> Top Template
                        </span>
                        <span className="text-white font-medium truncate max-w-[120px]" title={eventAnalytics.most_used_template}>
                          {eventAnalytics.most_used_template}
                        </span>
                      </div>
                    )}

                    {eventAnalytics.avg_processing_time && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500 flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5" /> Avg. Time
                        </span>
                        <span className="text-white font-medium">
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
