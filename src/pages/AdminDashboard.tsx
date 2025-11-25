import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getCurrentUser, logoutUser, updateUser } from "@/services/eventsApi";
import { LogOut, User, Sparkles, Clock, ShieldAlert, Edit2, Loader2, Upload, X, Camera, Settings, Users, ChevronDown, ExternalLink } from "lucide-react";
import { ENV } from "@/config/env";
import IndividualDashboard from "@/components/dashboard/IndividualDashboard";
import BusinessDashboard from "@/components/dashboard/BusinessDashboard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentUser = useMemo(() => {
    const user = getCurrentUser();
    console.log('👤 Current user loaded:', user);
    return user;
  }, []);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [editForm, setEditForm] = useState<{
    full_name: string;
    email: string;
    birth_date?: string;
    avatar_url?: string;
    cover_image_url?: string;
    bio?: string;
    social_links?: {
      x?: string;
      instagram?: string;
      youtube?: string;
      tiktok?: string;
    };
    password?: string;
  }>({
    full_name: '',
    email: '',
    birth_date: '',
    avatar_url: '',
    password: ''
  });

  // Default to individual if no role specified (backward compatibility)
  const userRole = currentUser?.role || 'individual';

  useEffect(() => {
    if (!currentUser) {
      navigate("/admin/auth");
      return;
    }
  }, [currentUser, navigate]);

  const handleLogout = () => {
    logoutUser();
    toast.success("Logged out successfully");
    navigate("/admin/auth");
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File too large. Maximum size is 5MB");
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }

      setAvatarFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    try {
      let avatarUrl = editForm.avatar_url;

      // Upload avatar if file selected
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);

        const token = localStorage.getItem('auth_token');
        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const uploadResponse = await fetch(`${ENV.API_URL || ''}/api/users/me/avatar`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload avatar');
        }

        const uploadData = await uploadResponse.json();
        avatarUrl = uploadData.avatar_url;
        toast.success("Avatar uploaded successfully");
      }

      // Update profile with avatar URL
      const updateData = { ...editForm, avatar_url: avatarUrl };
      const updatedUser = await updateUser(updateData);

      // Merge current user with updated data
      const mergedUser = {
        ...currentUser,
        ...updatedUser,
        avatar_url: avatarUrl || updatedUser.avatar_url || currentUser?.avatar_url
      };

      console.log('💾 Saving user to localStorage:', mergedUser);

      // Update local storage with new user data
      localStorage.setItem('user', JSON.stringify(mergedUser));
      toast.success("Profile updated successfully");
      setIsEditingProfile(false);
      setAvatarFile(null);
      setAvatarPreview('');

      // Force reload to reflect changes
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!currentUser) {
    return null;
  }

  // Pending Business Application View
  if (userRole === 'business_pending') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[100px] -z-10" />

        <div className="max-w-md w-full bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Application Under Review</h2>
          <p className="text-zinc-400 mb-8">
            Your application for a Business tier is currently being reviewed by our team. You will receive an email update at <span className="text-white">{currentUser.email}</span> once approved.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full border-white/10 hover:bg-white/5 text-white"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white relative overflow-hidden flex flex-col">
      {/* Background Effects */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-900/20 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white/5 via-black/0 to-black/0 -z-10 pointer-events-none" />

      <div className="w-full max-w-[1600px] mx-auto p-4 md:p-6 flex-1 min-h-0 flex flex-col relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                {userRole === 'individual' ? 'My Studio' : 'Business Dashboard'}
              </h1>
            </div>
            <p className="text-sm text-zinc-400 ml-1">
              {userRole === 'individual'
                ? 'Manage your personal photo booth and templates'
                : 'Manage your events, analytics, and business settings'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {userRole === 'superadmin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/super-admin")}
                className="hidden md:flex border-amber-500/20 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 hover:text-amber-400"
              >
                <ShieldAlert className="w-4 h-4 mr-2" />
                Super Admin
              </Button>
            )}

            {/* User Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-full bg-zinc-900/50 border border-white/10 backdrop-blur-sm hover:bg-zinc-800/50 transition-colors cursor-pointer">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 overflow-hidden">
                    {currentUser?.avatar_url ? (
                      <img
                        src={currentUser.avatar_url}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-medium text-white leading-none">
                      {currentUser?.name || currentUser?.full_name || currentUser?.username || currentUser?.email}
                    </span>
                    <span className="text-[10px] text-zinc-500 leading-none mt-1 capitalize">
                      {userRole.replace('_', ' ')}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-64 bg-zinc-900 border-white/10 text-white p-2"
              >
                {/* Credits Progress */}
                <div className="px-2 py-3 mb-2">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-zinc-400">
                      {Math.round(((currentUser?.tokens_remaining || 0) / (currentUser?.tokens_total || 1000)) * 100)}% credits used
                    </span>
                  </div>
                  <Progress 
                    value={((currentUser?.tokens_remaining || 0) / (currentUser?.tokens_total || 1000)) * 100} 
                    className="h-1.5 bg-zinc-800"
                  />
                </div>
                
                <DropdownMenuSeparator className="bg-white/10" />
                
                <DropdownMenuItem 
                  onClick={() => navigate(`/profile/${currentUser?.username || currentUser?.slug}`)}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/5 rounded-lg"
                >
                  <User className="w-4 h-4 text-zinc-400" />
                  <span>View profile</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => {
                    setEditForm({
                      full_name: currentUser?.full_name || currentUser?.name || '',
                      email: currentUser?.email || '',
                      birth_date: currentUser?.birth_date || '',
                      avatar_url: currentUser?.avatar_url || '',
                      cover_image_url: currentUser?.cover_image_url || '',
                      bio: currentUser?.bio || '',
                      social_links: currentUser?.social_links || {},
                      password: ''
                    });
                    setIsEditingProfile(true);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/5 rounded-lg text-lime-400"
                >
                  <Settings className="w-4 h-4" />
                  <span>Manage account</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => window.open('https://discord.gg/pictureme', '_blank')}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/5 rounded-lg"
                >
                  <Users className="w-4 h-4 text-zinc-400" />
                  <span>Join our community</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="bg-white/10" />
                
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/5 rounded-lg"
                >
                  <LogOut className="w-4 h-4 text-zinc-400" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 min-h-0">
          {userRole.startsWith('business') ? (
            <BusinessDashboard currentUser={currentUser} />
          ) : (
            <IndividualDashboard currentUser={currentUser} />
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-[500px] p-0 overflow-hidden gap-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>

          <div className="max-h-[85vh] overflow-y-auto">
            {/* Cover Image Area */}
            <div className="relative h-32 bg-gradient-to-r from-indigo-500 to-purple-500">
              {editForm.cover_image_url ? (
                <img
                  src={editForm.cover_image_url}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-indigo-500 to-purple-500" />
              )}

              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
                <div className="relative">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white text-black hover:bg-white/90"
                  >
                    Change Cover
                  </Button>
                  <input
                    type="url"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      // Simple prompt for URL for now, or file upload logic if we had it
                      const url = prompt("Enter cover image URL:", editForm.cover_image_url);
                      if (url !== null) setEditForm({ ...editForm, cover_image_url: url });
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="px-6 pb-6">
              {/* Avatar - Overlapping */}
              <div className="relative -mt-12 mb-6 w-24 h-24">
                <div className="w-24 h-24 rounded-full border-4 border-zinc-900 overflow-hidden bg-zinc-800">
                  <img
                    src={avatarPreview || editForm.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(editForm.full_name || 'User')}&background=random`}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => {
                    const url = prompt("Enter avatar URL:", editForm.avatar_url);
                    if (url !== null) setEditForm({ ...editForm, avatar_url: url });
                  }}
                  className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full text-black hover:bg-gray-200 transition-colors shadow-lg"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username*</Label>
                  <div className="relative">
                    <Input
                      id="username"
                      value={currentUser?.username || ''}
                      disabled
                      className="bg-black/50 border-white/10 pr-10"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded">
                      •••
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="bg-black/50 border-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Type bio here..."
                    value={editForm.bio || ''}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    className="bg-black/50 border-white/10 min-h-[100px] resize-none"
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <div className="space-y-2">
                    <Input
                      placeholder="x.com/"
                      value={editForm.social_links?.x || ''}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        social_links: { ...editForm.social_links, x: e.target.value }
                      })}
                      className="bg-black/50 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="instagram.com/"
                      value={editForm.social_links?.instagram || ''}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        social_links: { ...editForm.social_links, instagram: e.target.value }
                      })}
                      className="bg-black/50 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="youtube.com/@"
                      value={editForm.social_links?.youtube || ''}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        social_links: { ...editForm.social_links, youtube: e.target.value }
                      })}
                      className="bg-black/50 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="tiktok.com/@"
                      value={editForm.social_links?.tiktok || ''}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        social_links: { ...editForm.social_links, tiktok: e.target.value }
                      })}
                      className="bg-black/50 border-white/10"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/10">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="bg-black/50 border-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birth_date">Birth Date</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={editForm.birth_date || ''}
                    onChange={(e) => setEditForm({ ...editForm, birth_date: e.target.value })}
                    className="bg-black/50 border-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">New Password (Optional)</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Leave empty to keep current"
                    value={editForm.password || ''}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    className="bg-black/50 border-white/10"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 pt-2 border-t border-white/10 flex justify-end">
            <Button onClick={handleUpdateProfile} disabled={isUpdating} className="bg-white text-black hover:bg-gray-200 font-medium px-8">
              {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
