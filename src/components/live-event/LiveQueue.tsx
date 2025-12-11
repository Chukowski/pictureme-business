import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Album } from "@/services/eventsApi";
import { Check, Eye, Share2, CreditCard, Search, Trash2, Clock, AlertTriangle, RefreshCw, ChevronDown, ChevronUp, MoreHorizontal, Mail, MessageCircle, Printer, Copy, Link, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface LiveQueueProps {
  albums: Album[];
  onAction: (action: string, album: Album) => void;
}

export function LiveQueue({ albums, onAction }: LiveQueueProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedAlbums, setExpandedAlbums] = useState<string[]>([]);

  const toggleExpand = (id: string) => {
    setExpandedAlbums(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const filteredAlbums = albums.filter(album => {
    if (!search.trim()) {
      // No search query, just filter by status
      const matchesStatus = statusFilter === 'all' || album.status === statusFilter;
      return matchesStatus;
    }
    
    const searchLower = search.toLowerCase().trim();
    
    // Search in multiple fields
    const searchableFields = [
      album.code,
      album.owner_name,
      album.owner_email,
      album.visitor_number?.toString(),
      album.id,
    ].filter(Boolean); // Remove null/undefined
    
    const matchesSearch = searchableFields.some(field => 
      field!.toLowerCase().includes(searchLower)
    );
    
    const matchesStatus = statusFilter === 'all' || album.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider px-1">Live Queue</h2>
        <div className="flex gap-2 flex-1 sm:flex-none">
           <div className="relative flex-1 sm:w-64">
             <Search className="absolute left-2 top-2.5 w-4 h-4 text-zinc-500" />
             <Input 
               placeholder="Search name or code..." 
               className="pl-8 bg-zinc-900/50 border-white/10 text-white focus:bg-zinc-900 h-9 text-sm"
               value={search}
               onChange={(e) => setSearch(e.target.value)}
             />
           </div>
           <Select value={statusFilter} onValueChange={setStatusFilter}>
             <SelectTrigger className="w-[130px] bg-zinc-900/50 border-white/10 text-white focus:bg-zinc-900 h-9 text-sm">
               <SelectValue placeholder="Status" />
             </SelectTrigger>
             <SelectContent className="bg-zinc-900 border-white/10 text-white">
               <SelectItem value="all" className="text-white hover:bg-zinc-800">All Status</SelectItem>
               <SelectItem value="in_progress" className="text-amber-400 hover:bg-zinc-800">In Progress</SelectItem>
               <SelectItem value="completed" className="text-emerald-400 hover:bg-zinc-800">Completed</SelectItem>
               <SelectItem value="paid" className="text-blue-400 hover:bg-zinc-800">Paid</SelectItem>
             </SelectContent>
           </Select>
        </div>
      </div>

      <div className="space-y-3">
        {filteredAlbums.length === 0 ? (
          <div className="text-center py-12 bg-zinc-900/30 rounded-xl border border-white/5 border-dashed">
            <p className="text-zinc-500">No active albums found</p>
            <p className="text-xs text-zinc-600 mt-1">Waiting for first visitor...</p>
          </div>
        ) : (
          filteredAlbums.map(album => (
            <Collapsible 
              key={album.id} 
              open={expandedAlbums.includes(album.id)}
              onOpenChange={() => toggleExpand(album.id)}
              className="bg-zinc-900 border border-white/10 hover:border-white/20 transition-all group rounded-xl overflow-hidden"
            >
              <div className="p-4 flex items-center gap-4">
                {/* Status Bar */}
                <div className={`w-1 h-10 rounded-full ${
                  album.status === 'completed' ? 'bg-emerald-500' : 
                  album.status === 'paid' ? 'bg-blue-500' : 'bg-amber-500'
                }`} />
                
                {/* Main Info */}
                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div className="col-span-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-white truncate text-sm">{album.owner_name || 'Guest User'}</h3>
                      <Badge variant="outline" className="text-[10px] h-5 border-white/10 text-zinc-400 font-mono bg-zinc-950/50">
                        {album.code}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 12m ago</span>
                      <span className="capitalize text-zinc-400">{album.status.replace('_', ' ')}</span>
                    </div>
                  </div>

                  {/* Stats / Progress */}
                  <div className="hidden md:flex flex-col justify-center items-start">
                     <div className="text-xs text-zinc-500 mb-1">Progress</div>
                     <div className="flex items-center gap-2 w-full max-w-[120px]">
                        <div className="h-1.5 flex-1 bg-zinc-800 rounded-full overflow-hidden">
                           <div 
                              className="h-full bg-indigo-500 rounded-full" 
                              style={{ width: `${Math.min(((album.photo_count || 0) / 5) * 100, 100)}%` }} // Assuming 5 is target
                           />
                        </div>
                        <span className="text-xs font-mono text-white">{album.photo_count || 0}/5</span>
                     </div>
                  </div>

                  {/* Payment Status - Check both status and payment_status */}
                  <div className="hidden md:block">
                     <div className={`text-xs font-medium inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${
                        (album.payment_status === 'paid' || album.status === 'paid') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                     }`}>
                        <CreditCard className="w-3 h-3" />
                        {(album.payment_status === 'paid' || album.status === 'paid') ? 'Paid' : 'Unpaid'}
                     </div>
                  </div>
                </div>

                {/* Quick Actions (Always Visible) */}
                <div className="flex items-center gap-1">
                   {album.status !== 'completed' && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={(e) => { e.stopPropagation(); onAction('approve', album); }}
                        className="h-8 w-8 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                        title="Approve All"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                   )}
                   
                   <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-400 hover:text-white">
                        {expandedAlbums.includes(album.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                   </CollapsibleTrigger>
                </div>
              </div>

              {/* Expanded Details */}
              <CollapsibleContent className="border-t border-white/5 bg-zinc-950/30">
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <p className="text-xs font-medium text-zinc-400 uppercase">Details</p>
                      <div className="text-sm text-zinc-300 grid grid-cols-2 gap-2">
                         <span className="text-zinc-500">Email:</span> <span>{album.owner_email || 'N/A'}</span>
                         <span className="text-zinc-500">Created:</span> <span>{new Date(album.created_at).toLocaleString()}</span>
                         <span className="text-zinc-500">Station:</span> <span>Main Booth (Active)</span>
                      </div>
                   </div>

                   <div className="space-y-2">
                      <p className="text-xs font-medium text-zinc-400 uppercase">Actions</p>
                      <div className="flex flex-wrap gap-2">
                         <Button size="sm" variant="outline" className="h-7 text-xs border-white/10 bg-zinc-900 text-zinc-300 hover:bg-white/10" onClick={() => onAction('view', album)}>
                            <Eye className="w-3 h-3 mr-2" /> View Album
                         </Button>
                         <Button size="sm" variant="outline" className="h-7 text-xs border-white/10 bg-zinc-900 text-zinc-300 hover:bg-white/10" onClick={() => onAction('share', album)}>
                            <Share2 className="w-3 h-3 mr-2" /> Share
                         </Button>
                         
                         {/* More Actions Dropdown (Full Menu) */}
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button size="sm" variant="ghost" className="h-7 px-2 ml-auto text-zinc-400 hover:text-white">
                               <MoreHorizontal className="w-4 h-4 mr-1" /> More
                             </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-zinc-300 w-56">
                             <DropdownMenuItem onClick={() => onAction('view', album)}>
                               <Eye className="w-4 h-4 mr-2" /> View Album
                             </DropdownMenuItem>
                            {album.status !== 'completed' && album.status !== 'paid' && (
                              <DropdownMenuItem onClick={() => onAction('approve', album)}>
                                <Check className="w-4 h-4 mr-2" /> Mark Complete
                              </DropdownMenuItem>
                            )}
                            {album.status !== 'paid' && album.payment_status !== 'paid' ? (
                              <DropdownMenuItem onClick={() => onAction('pay', album)} className="text-emerald-400 focus:text-emerald-400">
                                <DollarSign className="w-4 h-4 mr-2" /> Mark Paid
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem disabled className="text-zinc-500">
                                <Check className="w-4 h-4 mr-2" /> Already Paid
                              </DropdownMenuItem>
                            )}
                             
                             <DropdownMenuSeparator className="bg-white/10" />
                             
                             <DropdownMenuItem onClick={() => onAction('email', album)}>
                               <Mail className="w-4 h-4 mr-2" /> Send Email
                             </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => onAction('whatsapp', album)}>
                               <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                             </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => onAction('print', album)}>
                               <Printer className="w-4 h-4 mr-2" /> Print
                             </DropdownMenuItem>
                             
                             <DropdownMenuSeparator className="bg-white/10" />

                             <DropdownMenuItem onClick={() => onAction('copy_code', album)}>
                               <Copy className="w-4 h-4 mr-2" /> Copy Album Code
                             </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => onAction('copy_url', album)}>
                               <Link className="w-4 h-4 mr-2" /> Copy Album URL
                             </DropdownMenuItem>
                             
                             <DropdownMenuSeparator className="bg-white/10" />
                             
                             <DropdownMenuItem className="text-red-400 focus:text-red-400" onClick={() => onAction('delete', album)}>
                               <Trash2 className="w-4 h-4 mr-2" /> Delete Album
                             </DropdownMenuItem>
                           </DropdownMenuContent>
                         </DropdownMenu>
                      </div>
                   </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))
        )}
      </div>
    </div>
  );
}
