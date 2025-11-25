import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { getCurrentUser, updateUser, logoutUser } from "@/services/eventsApi";
import { 
  ArrowLeft, 
  User, 
  Camera, 
  Loader2, 
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff
} from "lucide-react";
import { ENV } from "@/config/env";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AccountSettings() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  
  const [formData, setFormData] = useState({
    username: currentUser?.username || '',
    email: currentUser?.email || '',
    publish_to_explore: currentUser?.publish_to_explore ?? true,
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (!currentUser) {
      navigate("/admin/auth");
    }
  }, [currentUser, navigate]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 5MB");
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${ENV.API_URL || ''}/api/users/me/avatar`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload avatar');

      const data = await response.json();
      
      // Update local storage
      const updatedUser = { ...currentUser, avatar_url: data.avatar_url };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      toast.success("Avatar updated successfully");
    } catch (error) {
      toast.error("Failed to upload avatar");
      setAvatarPreview('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    setIsLoading(true);
    try {
      const updateData: any = {
        publish_to_explore: formData.publish_to_explore
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      await updateUser(updateData);
      
      // Update local storage
      const updatedUser = { ...currentUser, publish_to_explore: formData.publish_to_explore };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      toast.success("Settings saved successfully");
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${ENV.API_URL || ''}/api/users/me`, {
        method: 'DELETE',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to delete account');

      logoutUser();
      toast.success("Account deleted successfully");
      navigate("/");
    } catch (error) {
      toast.error("Failed to delete account");
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin')}
            className="hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Account Settings</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Profile Card */}
        <Card className="bg-zinc-900/50 border-white/10">
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            {/* Avatar */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-800">
                {(avatarPreview || currentUser?.avatar_url) ? (
                  <img
                    src={avatarPreview || currentUser?.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full text-black hover:bg-gray-200 transition-colors cursor-pointer shadow-lg">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
            <div>
              <CardTitle className="text-white">{currentUser.name || currentUser.full_name || currentUser.username}</CardTitle>
              <CardDescription className="text-zinc-400">{currentUser.email}</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/profile/${currentUser.username || currentUser.slug}`)}
              className="ml-auto border-white/20 hover:bg-white/10"
            >
              <User className="w-4 h-4 mr-2" />
              Edit profile
            </Button>
          </CardHeader>
        </Card>

        {/* Account Details */}
        <Card className="bg-zinc-900/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-lg">Account details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-400">Username</Label>
              <Input
                value={formData.username}
                disabled
                className="bg-black/50 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">Email</Label>
              <Input
                value={formData.email}
                disabled
                className="bg-black/50 border-white/10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Publish to Explore */}
        <Card className="bg-zinc-900/50 border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white text-lg">Publish to explore</CardTitle>
                <CardDescription className="text-zinc-400 mt-1">
                  All your generations will be automatically published to the Explore page. Only premium users can disable this setting
                </CardDescription>
              </div>
              <Switch
                checked={formData.publish_to_explore}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, publish_to_explore: checked }))}
                disabled={currentUser.subscription_tier === 'free'}
              />
            </div>
          </CardHeader>
        </Card>

        {/* Change Password */}
        <Card className="bg-zinc-900/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-lg">Change Password</CardTitle>
            <CardDescription className="text-zinc-400">
              Leave empty to keep your current password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-400">New Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="bg-black/50 border-white/10 pr-10"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">Confirm Password</Label>
              <Input
                type={showPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="bg-black/50 border-white/10"
                placeholder="Confirm new password"
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          onClick={handleSaveSettings}
          disabled={isLoading}
          className="w-full bg-white text-black hover:bg-gray-200 font-medium"
        >
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save changes
        </Button>

        <Separator className="bg-white/10" />

        {/* Delete Account */}
        <Card className="bg-red-950/20 border-red-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  Delete Account
                </CardTitle>
                <CardDescription className="text-zinc-400 mt-1">
                  This will permanently delete your account
                </CardDescription>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-zinc-900 border-white/10 text-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription className="text-zinc-400">
                      This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-zinc-800 border-white/10 hover:bg-zinc-700">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Yes, delete my account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

