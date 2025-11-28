/**
 * StaffStationAnalytics Component
 * 
 * Chart/stats view for station usage analytics.
 * Shows photo counts, album counts, and activity by station type.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Camera, 
  Users, 
  Image, 
  Clock, 
  TrendingUp, 
  RefreshCw,
  Loader2,
  BarChart3,
  Activity
} from 'lucide-react';
import { ENV } from '@/config/env';

interface StationStats {
  station_type: string;
  photo_count: number;
  album_count: number;
  first_photo: string | null;
  last_photo: string | null;
}

interface AlbumSummary {
  total_albums: number;
  completed_albums: number;
  in_progress_albums: number;
  paid_albums: number;
  total_photos: number;
  period_days: number;
}

interface StaffStationAnalyticsProps {
  eventId?: number;
  className?: string;
}

const STATION_TYPE_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  registration: { label: 'Registration', icon: Users, color: 'bg-blue-500' },
  booth: { label: 'Photo Booth', icon: Camera, color: 'bg-purple-500' },
  playground: { label: 'Playground', icon: Activity, color: 'bg-green-500' },
  viewer: { label: 'Viewer', icon: Image, color: 'bg-orange-500' },
  unknown: { label: 'Unknown', icon: BarChart3, color: 'bg-slate-500' },
};

export function StaffStationAnalytics({ eventId, className }: StaffStationAnalyticsProps) {
  const [stationStats, setStationStats] = useState<StationStats[]>([]);
  const [albumSummary, setAlbumSummary] = useState<AlbumSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState<string>('30');

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const baseUrl = ENV.API_URL || '';
      const eventParam = eventId ? `&event_id=${eventId}` : '';
      
      const [stationsRes, summaryRes] = await Promise.all([
        fetch(`${baseUrl}/api/analytics/stations?days=${periodDays}${eventParam}`, { headers }),
        fetch(`${baseUrl}/api/analytics/albums/summary?days=${periodDays}${eventParam}`, { headers })
      ]);

      if (!stationsRes.ok || !summaryRes.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const stationsData = await stationsRes.json();
      const summaryData = await summaryRes.json();

      setStationStats(stationsData);
      setAlbumSummary(summaryData);
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [eventId, periodDays]);

  const totalPhotos = stationStats.reduce((sum, s) => sum + s.photo_count, 0);
  const maxPhotos = Math.max(...stationStats.map(s => s.photo_count), 1);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  const getTimeSince = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <p className="text-red-400">{error}</p>
          <Button variant="outline" onClick={fetchAnalytics}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Header with Controls */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Station Analytics</h3>
          <p className="text-sm text-slate-400">Usage breakdown by station type</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={periodDays} onValueChange={setPeriodDays}>
            <SelectTrigger className="w-32 bg-slate-700/50 border-slate-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchAnalytics}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {albumSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/20">
                  <Users className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{albumSummary.total_albums}</p>
                  <p className="text-xs text-slate-400">Total Albums</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Image className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{albumSummary.total_photos}</p>
                  <p className="text-xs text-slate-400">Total Photos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{albumSummary.completed_albums}</p>
                  <p className="text-xs text-slate-400">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <Activity className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{albumSummary.in_progress_albums}</p>
                  <p className="text-xs text-slate-400">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Station Breakdown */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Station Breakdown</CardTitle>
          <CardDescription>Photos captured at each station type</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stationStats.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No station data available yet</p>
            </div>
          ) : (
            stationStats.map((station) => {
              const config = STATION_TYPE_LABELS[station.station_type] || STATION_TYPE_LABELS.unknown;
              const Icon = config.icon;
              const percentage = totalPhotos > 0 ? (station.photo_count / totalPhotos) * 100 : 0;
              const barWidth = (station.photo_count / maxPhotos) * 100;

              return (
                <div key={station.station_type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${config.color}/20`}>
                        <Icon className={`w-4 h-4 text-${config.color.replace('bg-', '')}`} />
                      </div>
                      <div>
                        <p className="font-medium text-white">{config.label}</p>
                        <p className="text-xs text-slate-400">
                          {station.album_count} albums • Last: {getTimeSince(station.last_photo)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">{station.photo_count}</p>
                      <p className="text-xs text-slate-400">{percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${config.color} transition-all duration-500`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default StaffStationAnalytics;

