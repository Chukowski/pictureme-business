import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  EyeOff,
  Globe,
  Lock,
  Sparkles,
  Upload,
  Link as LinkIcon
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

export default function CreatorSettings() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [activeTab, setActiveTab] = useState('profile');
  
  const [formData, setFormData] = useState({
    username: currentUser?.username || '',
    email: currentUser?.email || '',
    full_name: currentUser?.full_name || currentUser?.name || '',
    bio: currentUser?.bio || '',
    birth_date: currentUser?.birth_date || '',
    is_public: currentUser?.is_public ?? true,
    publish_to_explore: currentUser?.publish_to_explore ?? true,
    social_links: currentUser?.social_links || {
      x: '',
      instagram: '',
      youtube: '',
      tiktok: ''
    },
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (!currentUser) {
      navigate("/admin/auth");
    }
  }, [currentUser, navigate]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = type === 'avatar' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File too large. Maximum size is ${type === 'avatar' ? '5MB' : '10MB'}`);
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'avatar') {
        setAvatarPreview(reader.result as string);
      } else {
        setCoverPreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);

    // Upload
    setIsLoading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const token = localStorage.getItem('auth_token');
      const endpoint = type === 'avatar' 
        ? `${ENV.API_URL || ''}/api/users/me/avatar`
        : `${ENV.API_URL || ''}/api/users/me/cover`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
        credentials: 'include',
        body: uploadFormData,
      });

      if (!response.ok) throw new Error(`Failed to upload ${type}`);

      const data = await response.json();
      
      // Update local storage
      const urlKey = type === 'avatar' ? 'avatar_url' : 'cover_image_url';
      const updatedUser = { ...currentUser, [urlKey]: data[urlKey] || data.url };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      toast.success(`${type === 'avatar' ? 'Avatar' : 'Cover image'} updated successfully`);
    } catch (error) {
      toast.error(`Failed to upload ${type}`);
      if (type === 'avatar') {
        setAvatarPreview('');
      } else {
        setCoverPreview('');
      }
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
      const updateData: Record<string, any> = {
        full_name: formData.full_name,
        bio: formData.bio,
        birth_date: formData.birth_date,
        is_public: formData.is_public,
        publish_to_explore: formData.publish_to_explore,
      };

      // Only include non-empty social links
      const cleanedSocialLinks: Record<string, string> = {};
      Object.entries(formData.social_links).forEach(([key, value]) => {
        if (value?.trim()) {
          cleanedSocialLinks[key] = value.trim();
        }
      });
      if (Object.keys(cleanedSocialLinks).length > 0) {
        updateData.social_links = cleanedSocialLinks;
      }

      if (formData.password) {
        updateData.password = formData.password;
      }

      await updateUser(updateData);
      
      // Update local storage
      const updatedUser = { 
        ...currentUser, 
        ...updateData,
        social_links: cleanedSocialLinks
      };
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
        body: uploadFormData,
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
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Cover Image - Fixed Height, part of layout but not scrolling the whole page */}
      <div className="relative shrink-0 h-48 sm:h-64 w-full group overflow-hidden">
        {(coverPreview || currentUser?.cover_image_url) ? (
          <img
            src={coverPreview || currentUser?.cover_image_url}
            alt="Cover"
            className="w-full h-full object-cover opacity-60"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-indigo-900 via-purple-900 to-zinc-900 opacity-60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        
        {/* Upload Cover Button */}
        <label className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-md border border-white/10 rounded-full text-xs hover:bg-black/70 transition-colors">
              <Upload className="w-3 h-3" />
              <span>Change Cover</span>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageChange(e, 'cover')}
            />
        </label>

        {/* Header Content Overlay */}
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 flex items-end gap-6">
            {/* Avatar */}
            <div className="relative shrink-0">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-black overflow-hidden bg-zinc-800 shadow-xl">
                {(avatarPreview || currentUser?.avatar_url) ? (
                    <img
                    src={avatarPreview || currentUser?.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <User className="w-10 h-10 text-white" />
                    </div>
                )}
                </div>
                <label className="absolute bottom-0 right-0 p-2 bg-white rounded-full text-black hover:bg-gray-200 transition-colors cursor-pointer shadow-lg">
                <Camera className="w-4 h-4" />
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'avatar')}
                    className="hidden"
                />
                </label>
            </div>

            {/* User Info */}
            <div className="mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-white">{formData.full_name || currentUser.username || 'User'}</h1>
                <p className="text-zinc-400">@{currentUser.username || currentUser.slug || 'user'}</p>
            </div>
        </div>

        {/* Back button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/creator/dashboard')}
          className="absolute top-4 left-4 bg-black/30 hover:bg-black/50 backdrop-blur-sm border border-white/10 rounded-full text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 md:p-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="bg-zinc-900/50 border border-white/10 p-1 h-auto">
                <TabsTrigger value="profile" className="px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-black">
                <User className="w-4 h-4 mr-2" />
                Profile
                </TabsTrigger>
                <TabsTrigger value="privacy" className="px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-black">
                <Lock className="w-4 h-4 mr-2" />
                Privacy
                </TabsTrigger>
                <TabsTrigger value="security" className="px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-black">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Security
                </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6 animate-in fade-in duration-300 slide-in-from-bottom-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Info */}
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-lg font-medium text-white">Personal Information</h3>
                            <Separator className="bg-white/10" />
                        </div>
                        
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input
                                    value={formData.full_name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                                    className="bg-zinc-900 border-white/10 focus:border-indigo-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Username</Label>
                                <Input
                                    value={formData.username}
                                    disabled
                                    className="bg-zinc-900/50 border-white/5 text-zinc-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    value={formData.email}
                                    disabled
                                    className="bg-zinc-900/50 border-white/5 text-zinc-500"
                                />
                            </div>
                             <div className="space-y-2">
                                <Label>Bio</Label>
                                <Textarea
                                    value={formData.bio}
                                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                                    className="bg-zinc-900 border-white/10 focus:border-indigo-500 min-h-[120px] resize-none"
                                    placeholder="Tell the world about yourself..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Social Links */}
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-lg font-medium text-white">Social Links</h3>
                            <Separator className="bg-white/10" />
                        </div>

                        <div className="space-y-4">
                             <div className="space-y-2">
                                <Label>X (Twitter)</Label>
                                <div className="flex">
                                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-white/10 bg-zinc-800 text-zinc-400 text-sm">x.com/</span>
                                    <Input
                                        value={formData.social_links.x}
                                        onChange={(e) => setFormData(prev => ({ ...prev, social_links: { ...prev.social_links, x: e.target.value } }))}
                                        className="bg-zinc-900 border-white/10 rounded-l-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label>Instagram</Label>
                                <div className="flex">
                                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-white/10 bg-zinc-800 text-zinc-400 text-sm">instagram.com/</span>
                                    <Input
                                        value={formData.social_links.instagram}
                                        onChange={(e) => setFormData(prev => ({ ...prev, social_links: { ...prev.social_links, instagram: e.target.value } }))}
                                        className="bg-zinc-900 border-white/10 rounded-l-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label>YouTube</Label>
                                <div className="flex">
                                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-white/10 bg-zinc-800 text-zinc-400 text-sm">youtube.com/@</span>
                                    <Input
                                        value={formData.social_links.youtube}
                                        onChange={(e) => setFormData(prev => ({ ...prev, social_links: { ...prev.social_links, youtube: e.target.value } }))}
                                        className="bg-zinc-900 border-white/10 rounded-l-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label>TikTok</Label>
                                <div className="flex">
                                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-white/10 bg-zinc-800 text-zinc-400 text-sm">tiktok.com/@</span>
                                    <Input
                                        value={formData.social_links.tiktok}
                                        onChange={(e) => setFormData(prev => ({ ...prev, social_links: { ...prev.social_links, tiktok: e.target.value } }))}
                                        className="bg-zinc-900 border-white/10 rounded-l-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="pt-4 flex justify-end">
                    <Button
                        onClick={handleSaveSettings}
                        disabled={isLoading}
                        className="bg-white text-black hover:bg-zinc-200 min-w-[120px]"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                    </Button>
                </div>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6 animate-in fade-in duration-300">
                <Card className="bg-zinc-900 border-white/10">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="text-base font-medium text-white flex items-center gap-2">
                                    {formData.is_public ? <Globe className="w-4 h-4 text-green-400" /> : <Lock className="w-4 h-4 text-zinc-400" />}
                                    Public Profile
                                </CardTitle>
                                <CardDescription>
                                    Allow others to see your profile and public creations.
                                </CardDescription>
                            </div>
                            <Switch
                                checked={formData.is_public}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
                            />
                        </div>
                    </CardHeader>
                </Card>

                 <Card className="bg-zinc-900 border-white/10">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="text-base font-medium text-white flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-indigo-400" />
                                    Publish to Explore
                                </CardTitle>
                                <CardDescription>
                                    Automatically share your AI creations to the community feed.
                                </CardDescription>
                            </div>
                            <Switch
                                checked={formData.publish_to_explore}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, publish_to_explore: checked }))}
                            />
                        </div>
                    </CardHeader>
                </Card>
                 <div className="pt-4 flex justify-end">
                    <Button
                        onClick={handleSaveSettings}
                        disabled={isLoading}
                        className="bg-white text-black hover:bg-zinc-200"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Privacy"}
                    </Button>
                </div>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-4">
                     <h3 className="text-lg font-medium text-white">Change Password</h3>
                     <Separator className="bg-white/10" />
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label>New Password</Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                    className="bg-zinc-900 border-white/10"
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
                            <Label>Confirm Password</Label>
                            <Input
                                type={showPassword ? "text" : "password"}
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                className="bg-zinc-900 border-white/10"
                            />
                        </div>
                     </div>
                     
                     <div className="flex justify-end">
                        <Button
                            onClick={handleSaveSettings}
                            disabled={isLoading || !formData.password}
                            className="bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                            Update Password
                        </Button>
                     </div>
                </div>
                
                <div className="pt-8">
                     <div className="bg-red-900/10 border border-red-500/20 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-red-400 flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-5 h-5" />
                            Danger Zone
                        </h3>
                        <p className="text-zinc-400 text-sm mb-4">
                            Deleting your account is irreversible. All your data, events, and creations will be permanently removed.
                        </p>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="bg-red-600/80 hover:bg-red-600">
                                    Delete Account
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-zinc-900 border-white/10 text-white">
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription className="text-zinc-400">
                                    This action cannot be undone. This will permanently delete your account 
                                    and remove all your data from our servers.
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
                </div>
            </TabsContent>
            </Tabs>
        </div>
      </div>
    </div>
  );
}
