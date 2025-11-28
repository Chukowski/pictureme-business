/**
 * AlbumStackCard Component
 * 
 * Displays an album as a stacked photo preview.
 * Shows first photo as cover with stacked shadows underneath.
 * Used in Album Mode feeds instead of individual photos.
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  User,
  Camera,
  Clock,
  CheckCircle2,
  AlertCircle,
  Lock,
  Eye,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type AlbumStatus = 'in_progress' | 'completed' | 'pending_approval' | 'approved' | 'rejected';
export type PaymentStatus = 'unpaid' | 'paid' | 'free';

interface AlbumStackCardProps {
  albumId: string;
  albumCode: string;
  ownerName?: string;
  status: AlbumStatus;
  paymentStatus: PaymentStatus;
  photoCount: number;
  maxPhotos: number;
  coverPhotoUrl?: string;
  stackPhotos?: string[]; // Additional photos for stack effect
  createdAt: string;
  onClick?: () => void;
  onUnlock?: () => void;
  primaryColor?: string;
}

const statusConfig: Record<AlbumStatus, { label: string; icon: React.ReactNode; className: string }> = {
  in_progress: {
    label: 'In Progress',
    icon: <Clock className="w-3 h-3" />,
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  completed: {
    label: 'Completed',
    icon: <CheckCircle2 className="w-3 h-3" />,
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  pending_approval: {
    label: 'Pending',
    icon: <AlertCircle className="w-3 h-3" />,
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  approved: {
    label: 'Approved',
    icon: <CheckCircle2 className="w-3 h-3" />,
    className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  rejected: {
    label: 'Rejected',
    icon: <AlertCircle className="w-3 h-3" />,
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
};

export function AlbumStackCard({
  albumId,
  albumCode,
  ownerName,
  status,
  paymentStatus,
  photoCount,
  maxPhotos,
  coverPhotoUrl,
  stackPhotos = [],
  createdAt,
  onClick,
  onUnlock,
  primaryColor = '#6366F1',
}: AlbumStackCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const statusInfo = statusConfig[status];
  const isLocked = paymentStatus === 'unpaid' && status === 'completed';
  const showUnlock = isLocked && onUnlock;

  const handleUnlock = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUnlock) return;
    setIsUnlocking(true);
    try {
      await onUnlock();
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <Card
      className={cn(
        'relative overflow-hidden bg-zinc-900/50 border-zinc-800 cursor-pointer transition-all duration-300',
        isHovered && 'scale-[1.02] shadow-xl shadow-black/30 border-zinc-700'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Stacked Photo Effect */}
        <div className="relative aspect-[4/3] overflow-hidden">
          {/* Stack shadows */}
          <div className="absolute inset-0">
            {/* Third layer (back) */}
            <div
              className="absolute top-2 left-2 right-2 bottom-0 rounded-t-lg bg-zinc-700/50"
              style={{ transform: 'rotate(-3deg)' }}
            />
            {/* Second layer (middle) */}
            <div
              className="absolute top-1 left-1 right-1 bottom-0 rounded-t-lg bg-zinc-600/50"
              style={{ transform: 'rotate(2deg)' }}
            />
          </div>

          {/* Cover photo */}
          <div className="relative w-full h-full rounded-t-lg overflow-hidden">
            {coverPhotoUrl ? (
              <img
                src={coverPhotoUrl}
                alt={`Album ${albumCode}`}
                className={cn(
                  'w-full h-full object-cover transition-transform duration-500',
                  isHovered && 'scale-110',
                  isLocked && 'blur-sm'
                )}
              />
            ) : (
              <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                <Camera className="w-12 h-12 text-zinc-600" />
              </div>
            )}

            {/* Locked overlay */}
            {isLocked && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                <Lock className="w-8 h-8 text-white mb-2" />
                <p className="text-white text-sm font-medium">Unlock to view</p>
              </div>
            )}

            {/* Photo count badge */}
            <div className="absolute top-3 right-3">
              <Badge className="bg-black/70 text-white border-0">
                <Camera className="w-3 h-3 mr-1" />
                {photoCount}/{maxPhotos}
              </Badge>
            </div>

            {/* Status badge */}
            <div className="absolute top-3 left-3">
              <Badge variant="outline" className={statusInfo.className}>
                {statusInfo.icon}
                <span className="ml-1">{statusInfo.label}</span>
              </Badge>
            </div>

            {/* Hover overlay */}
            {isHovered && !isLocked && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center pb-4">
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Album
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Album info */}
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <User className="w-4 h-4" style={{ color: primaryColor }} />
              </div>
              <div>
                <p className="text-white font-medium text-sm">
                  {ownerName || 'Guest'}
                </p>
                <p className="text-xs text-zinc-500 font-mono">{albumCode}</p>
              </div>
            </div>
            
            {/* Payment status */}
            {paymentStatus === 'paid' && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <CreditCard className="w-3 h-3 mr-1" />
                Paid
              </Badge>
            )}
          </div>

          {/* Time */}
          <p className="text-xs text-zinc-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(createdAt).toLocaleString()}
          </p>

          {/* Unlock button */}
          {showUnlock && (
            <Button
              onClick={handleUnlock}
              disabled={isUnlocking}
              className="w-full mt-2"
              style={{ backgroundColor: primaryColor }}
            >
              {isUnlocking ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              Unlock Album
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default AlbumStackCard;

