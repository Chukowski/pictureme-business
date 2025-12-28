/**
 * AlbumResultActions Component
 * 
 * Actions shown after a photo is taken in Album Tracking mode.
 * Replaces the standard result actions with album-specific options.
 */

import { useState } from "react";
import { BookOpen, Camera, ArrowRight, Share2, Download, Settings, Trash2, X, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface AlbumResultActionsProps {
  albumId: string;
  currentPhotos: number;
  maxPhotos: number;
  shareCode?: string;
  onTakeAnother: () => void;
  onViewAlbum: () => void;
  onShare?: () => void;
  onDownload?: () => void;
  onDeletePhoto?: (staffPin?: string) => Promise<void>; // Callback to delete current photo with optional staff PIN
  canTakeMore: boolean;
  primaryColor?: string;
  className?: string;
  staffPin?: string; // Staff PIN for authentication
}

export function AlbumResultActions({
  albumId,
  currentPhotos,
  maxPhotos,
  shareCode,
  onTakeAnother,
  onViewAlbum,
  onShare,
  onDownload,
  onDeletePhoto,
  canTakeMore,
  primaryColor = "#06B6D4",
  className = "",
  staffPin,
}: AlbumResultActionsProps) {
  const isComplete = currentPhotos >= maxPhotos;
  
  // Staff options state
  const [showStaffDialog, setShowStaffDialog] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Check if staff PIN is configured
  const hasStaffPin = !!staffPin;
  
  const handlePinSubmit = () => {
    if (pinInput === staffPin) {
      setIsStaffAuthenticated(true);
      setPinInput("");
      toast.success("Staff access granted");
    } else {
      toast.error("Incorrect PIN");
      setPinInput("");
    }
  };
  
  const handleDeletePhoto = async () => {
    if (!onDeletePhoto) return;
    
    setIsDeleting(true);
    try {
      // Pass the staff PIN to the delete function
      await onDeletePhoto(staffPin);
      toast.success("Photo deleted. You can try again!");
      setShowStaffDialog(false);
      setIsStaffAuthenticated(false);
      // The parent component should handle navigation back to camera
    } catch (error) {
      toast.error("Failed to delete photo");
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleCloseDialog = () => {
    setShowStaffDialog(false);
    setIsStaffAuthenticated(false);
    setPinInput("");
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Progress indicator */}
      <div className="text-center mb-4">
        <p className="text-zinc-400 text-sm">
          Photo {currentPhotos} of {maxPhotos} in your album
        </p>
        <div className="flex justify-center gap-1 mt-2">
          {Array.from({ length: maxPhotos }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i < currentPhotos 
                  ? 'bg-cyan-400' 
                  : 'bg-zinc-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Primary Actions */}
      <div className="grid grid-cols-2 gap-3">
        {canTakeMore ? (
          <Button
            onClick={onTakeAnother}
            className="bg-white text-black hover:bg-zinc-200 h-14"
          >
            <Camera className="w-5 h-5 mr-2" />
            Take Another
          </Button>
        ) : (
          <Button
            disabled
            className="bg-zinc-800 text-zinc-500 h-14 cursor-not-allowed"
          >
            <Camera className="w-5 h-5 mr-2" />
            Limit Reached
          </Button>
        )}
        
        <Button
          onClick={onViewAlbum}
          style={{ backgroundColor: primaryColor }}
          className="text-white hover:opacity-90 h-14"
        >
          <BookOpen className="w-5 h-5 mr-2" />
          View Album
        </Button>
      </div>

      {/* Secondary Actions */}
      <div className="flex gap-2 justify-center">
        {onDownload && (
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            className="border-white/20 text-zinc-300 hover:text-white"
          >
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
        )}
        {onShare && (
          <Button
            variant="outline"
            size="sm"
            onClick={onShare}
            className="border-white/20 text-zinc-300 hover:text-white"
          >
            <Share2 className="w-4 h-4 mr-1" />
            Share
          </Button>
        )}
      </div>

      {/* Album Complete Message */}
      {isComplete && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
          <p className="text-green-400 font-medium mb-2">
            🎉 Album Complete!
          </p>
          <p className="text-zinc-400 text-sm">
            Head to the final station to view and collect your album.
          </p>
          <Button
            onClick={onViewAlbum}
            className="mt-3 bg-green-600 hover:bg-green-500 text-white"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Continue to Album Viewer
          </Button>
        </div>
      )}

      {/* Share Code */}
      {shareCode && (
        <p className="text-center text-xs text-zinc-500">
          Share code: <span className="font-mono text-zinc-400">{shareCode}</span>
        </p>
      )}
      
      {/* Staff Options Button - Only show if PIN is configured and delete callback exists */}
      {hasStaffPin && onDeletePhoto && (
        <div className="pt-4 border-t border-white/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStaffDialog(true)}
            className="w-full text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
          >
            <Settings className="w-4 h-4 mr-2" />
            Staff Options
          </Button>
        </div>
      )}
      
      {/* Staff Options Dialog */}
      <Dialog open={showStaffDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="bg-card border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-400" />
              Staff Options
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {isStaffAuthenticated 
                ? "Choose an action for this photo"
                : "Enter staff PIN to access options"
              }
            </DialogDescription>
          </DialogHeader>
          
          {!isStaffAuthenticated ? (
            // PIN Entry
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Staff PIN</label>
                <Input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
                  placeholder="Enter PIN"
                  className="bg-zinc-800 border-white/10 text-white text-center text-2xl tracking-widest"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCloseDialog}
                  className="flex-1 border-white/10 text-zinc-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePinSubmit}
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white"
                >
                  <KeyRound className="w-4 h-4 mr-2" />
                  Verify
                </Button>
              </div>
            </div>
          ) : (
            // Staff Actions
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <h4 className="text-red-400 font-medium mb-2 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Delete This Photo
                </h4>
                <p className="text-zinc-400 text-sm mb-4">
                  Remove this photo from the album and let the visitor try again. 
                  This cannot be undone.
                </p>
                <Button
                  onClick={handleDeletePhoto}
                  disabled={isDeleting}
                  className="w-full bg-red-600 hover:bg-red-500 text-white"
                >
                  {isDeleting ? (
                    <>Deleting...</>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete & Try Again
                    </>
                  )}
                </Button>
              </div>
              
              <Button
                variant="outline"
                onClick={handleCloseDialog}
                className="w-full border-white/10 text-zinc-300"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AlbumResultActions;

