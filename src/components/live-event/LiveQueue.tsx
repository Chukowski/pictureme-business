import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Album } from "@/services/eventsApi";
import { Check, Eye, Share2, CreditCard, MoreHorizontal, Search, Filter, Trash2, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LiveQueueProps {
  albums: Album[];
  onAction: (action: string, album: Album) => void;
}

export function LiveQueue({ albums, onAction }: LiveQueueProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredAlbums = albums.filter(album => {
    const matchesSearch = (album.owner_name || album.code).toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || album.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">Live Queue</h2>
        <div className="flex gap-2 flex-1 sm:flex-none">
           <div className="relative flex-1 sm:w-64">
             <Search className="absolute left-2 top-2.5 w-4 h-4 text-zinc-500" />
             <Input 
               placeholder="Search name or code..." 
               className="pl-8 bg-zinc-900/50 border-white/10 text-white"
               value={search}
               onChange={(e) => setSearch(e.target.value)}
             />
           </div>
           <Select value={statusFilter} onValueChange={setStatusFilter}>
             <SelectTrigger className="w-[130px] bg-zinc-900/50 border-white/10 text-white">
               <SelectValue placeholder="Status" />
             </SelectTrigger>
             <SelectContent className="bg-zinc-900 border-white/10">
               <SelectItem value="all" className="text-white">All Status</SelectItem>
               <SelectItem value="in_progress" className="text-amber-400">In Progress</SelectItem>
               <SelectItem value="completed" className="text-emerald-400">Completed</SelectItem>
               <SelectItem value="paid" className="text-blue-400">Paid</SelectItem>
             </SelectContent>
           </Select>
        </div>
      </div>

      <div className="grid gap-3">
        {filteredAlbums.length === 0 ? (
          <div className="text-center py-12 bg-zinc-900/30 rounded-xl border border-white/5 border-dashed">
            <p className="text-zinc-500">No active albums found</p>
          </div>
        ) : (
          filteredAlbums.map(album => (
            <Card key={album.id} className="bg-zinc-900/50 border-white/10 hover:bg-zinc-900/80 transition-colors group">
              <CardContent className="p-4 flex items-center gap-4">
                {/* Status Indicator */}
                <div className={`w-1.5 h-12 rounded-full ${
                  album.status === 'completed' ? 'bg-emerald-500' : 
                  album.status === 'paid' ? 'bg-blue-500' : 'bg-amber-500'
                }`} />
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-white truncate">{album.owner_name || 'Guest User'}</h3>
                    <Badge variant="outline" className="text-[10px] h-5 border-white/10 text-zinc-400 font-mono">
                      {album.code}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-500 flex items-center gap-2">
                    <span>{album.photo_count || 0} photos</span>
                    <span>•</span>
                    <span className="capitalize">{album.status.replace('_', ' ')}</span>
                  </p>
                </div>

                {/* Progress / Status */}
                 <div className="hidden md:block text-right mr-4">
                    <div className={`text-xs font-medium ${album.payment_status === 'paid' ? 'text-emerald-400' : 'text-zinc-400'}`}>
                        {album.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                        {new Date(album.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                 </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-white/10"
                    onClick={() => onAction('view', album)}
                    title="View Photos"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  
                  {album.status !== 'completed' && album.status !== 'paid' && (
                     <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                        onClick={() => onAction('approve', album)}
                        title="Approve Album"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                  )}

                  {album.payment_status !== 'paid' && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                      onClick={() => onAction('pay', album)}
                      title="Mark Paid"
                    >
                      <CreditCard className="w-4 h-4" />
                    </Button>
                  )}

                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-white/10"
                    onClick={() => onAction('share', album)}
                    title="Share"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>

                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onAction('delete', album)}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

