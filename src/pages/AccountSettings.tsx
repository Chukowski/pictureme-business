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
  Building2,
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

export default function AccountSettings() {
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
    // Organization/Business name for event URLs
    organization_name: currentUser?.organization_name || currentUser?.business_name || '',
    organization_slug: currentUser?.organization_slug || currentUser?.business_slug || '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (!currentUser) {
      navigate("/auth");
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

  // Generate slug from organization name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
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
        organization_name: formData.organization_name,
        organization_slug: formData.organization_slug,
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

  const backDestination = currentUser?.role?.startsWith('business') && currentUser.role !== 'business_pending' 
    ? '/business/home' 
    : '/creator/dashboard';

  return (
    <div className="min-h-screen bg-[#101112] text-white">
      {/* Header with Cover Image */}
      <div className="relative">
        {/* Cover Image */}
        <div className="h-48 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 relative group sm:rounded-b-none rounded-lg overflow-hidden">
          {(coverPreview || currentUser?.cover_image_url) && (
            <img
              src={coverPreview || currentUser?.cover_image_url}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          )}
          <label className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-[#101112]/40 cursor-pointer">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/90 rounded-lg text-black text-sm font-medium hover:bg-white transition-colors">
              <Upload className="w-4 h-4" />
              Change Cover
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageChange(e, 'cover')}
            />
          </label>
        </div>

        {/* Back button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(backDestination)}
          className="absolute top-4 left-4 bg-[#101112]/50 hover:bg-[#101112]/70 backdrop-blur-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {/* Avatar overlapping cover */}
        <div className="absolute -bottom-16 left-8">
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-4 border-black overflow-hidden bg-zinc-800">
              {(avatarPreview || currentUser?.avatar_url) ? (
                <img
                  src={avatarPreview || currentUser?.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <User className="w-12 h-12 text-white" />
                </div>
              )}
            </div>
            <label className="absolute bottom-2 right-2 p-2 bg-white rounded-full text-black hover:bg-gray-200 transition-colors cursor-pointer shadow-lg">
              <Camera className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(e, 'avatar')}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* User info below avatar */}
      <div className="pt-20 px-8 pb-4">
        <h1 className="text-2xl font-bold">{formData.full_name || currentUser.username || currentUser.name || 'User'}</h1>
        <p className="text-zinc-400">@{currentUser.username || currentUser.slug || currentUser.email?.split('@')[0] || 'user'}</p>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card border border-zinc-800 w-full justify-start">
            <TabsTrigger value="profile" className="data-[state=active]:bg-indigo-500">
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="privacy" className="data-[state=active]:bg-indigo-500">
              <Lock className="w-4 h-4 mr-2" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="business" className="data-[state=active]:bg-indigo-500">
              <Building2 className="w-4 h-4 mr-2" />
              Business URL
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-indigo-500">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            {/* Basic Info */}
            <Card className="bg-card/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">Personal Information</CardTitle>
                <CardDescription className="text-zinc-400">
                  Update your profile information visible to others
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Username</Label>
                    <Input
                      value={formData.username}
                      disabled
                      className="bg-[#101112]/50 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Email</Label>
                    <Input
                      value={formData.email}
                      disabled
                      className="bg-[#101112]/50 border-white/10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Full Name</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="bg-[#101112]/50 border-white/10"
                    placeholder="Your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Bio</Label>
                  <Textarea
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    className="bg-[#101112]/50 border-white/10 min-h-[100px] resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Birth Date</Label>
                  <Input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                    className="bg-[#101112]/50 border-white/10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Social Links */}
            <Card className="bg-card/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <LinkIcon className="w-5 h-5" />
                  Social Links
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Connect your social media profiles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-400">X (Twitter)</Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-white/10 bg-zinc-800 text-zinc-400 text-sm">
                        x.com/
                      </span>
                      <Input
                        value={formData.social_links.x || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          social_links: { ...prev.social_links, x: e.target.value }
                        }))}
                        className="bg-[#101112]/50 border-white/10 rounded-l-none"
                        placeholder="username"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Instagram</Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-white/10 bg-zinc-800 text-zinc-400 text-sm">
                        instagram.com/
                      </span>
                      <Input
                        value={formData.social_links.instagram || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          social_links: { ...prev.social_links, instagram: e.target.value }
                        }))}
                        className="bg-[#101112]/50 border-white/10 rounded-l-none"
                        placeholder="username"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400">YouTube</Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-white/10 bg-zinc-800 text-zinc-400 text-sm">
                        youtube.com/@
                      </span>
                      <Input
                        value={formData.social_links.youtube || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          social_links: { ...prev.social_links, youtube: e.target.value }
                        }))}
                        className="bg-[#101112]/50 border-white/10 rounded-l-none"
                        placeholder="channel"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400">TikTok</Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-white/10 bg-zinc-800 text-zinc-400 text-sm">
                        tiktok.com/@
                      </span>
                      <Input
                        value={formData.social_links.tiktok || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          social_links: { ...prev.social_links, tiktok: e.target.value }
                        }))}
                        className="bg-[#101112]/50 border-white/10 rounded-l-none"
                        placeholder="username"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleSaveSettings}
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-medium"
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Profile
            </Button>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-6">
            {/* Public Profile */}
            <Card className="bg-card/50 border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {formData.is_public ? (
                      <Globe className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <Lock className="w-6 h-6 text-zinc-400" />
                    )}
                    <div>
                      <CardTitle className="text-white text-lg">Public Profile</CardTitle>
                      <CardDescription className="text-zinc-400 mt-1">
                        {formData.is_public 
                          ? "Anyone can view your profile and creations" 
                          : "Only you can see your profile"}
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={formData.is_public}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
                  />
                </div>
              </CardHeader>
            </Card>

            {/* Publish to Explore */}
            <Card className="bg-card/50 border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-6 h-6 text-indigo-400" />
                    <div>
                      <CardTitle className="text-white text-lg">Publish to Explore</CardTitle>
                      <CardDescription className="text-zinc-400 mt-1">
                        Automatically publish your AI generations to the public Explore feed
                        {currentUser.subscription_tier === 'free' && (
                          <span className="block text-amber-400 mt-1">
                            Upgrade to a premium plan to disable this
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={formData.publish_to_explore}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, publish_to_explore: checked }))}
                    disabled={currentUser.subscription_tier === 'free'}
                  />
                </div>
              </CardHeader>
            </Card>

            <Button
              onClick={handleSaveSettings}
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-medium"
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Privacy Settings
            </Button>
          </TabsContent>

          {/* Business URL Tab */}
          <TabsContent value="business" className="space-y-6">
            <Card className="bg-card/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                  Business/Organization Name
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Set a custom name for your event URLs. This allows you to use a business name 
                  instead of your personal username for event links.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400">Organization Name</Label>
                  <Input
                    value={formData.organization_name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        organization_name: name,
                        organization_slug: generateSlug(name)
                      }));
                    }}
                    className="bg-[#101112]/50 border-white/10"
                    placeholder="e.g., Acme Corp, My Photo Studio"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">URL Slug</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-white/10 bg-zinc-800 text-zinc-400 text-sm">
                      pictureme.now/
                    </span>
                    <Input
                      value={formData.organization_slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, organization_slug: e.target.value }))}
                      className="bg-[#101112]/50 border-white/10 rounded-l-none"
                      placeholder="acme-corp"
                    />
                  </div>
                  <p className="text-xs text-zinc-500">
                    This will be used as the base URL for your events: pictureme.now/{formData.organization_slug || 'your-slug'}/event-name
                  </p>
                </div>

                {/* Preview */}
                {formData.organization_slug && (
                  <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                    <p className="text-sm text-zinc-400 mb-2">Your event URLs will look like:</p>
                    <code className="text-indigo-400 bg-[#101112]/30 px-2 py-1 rounded">
                      pictureme.now/{formData.organization_slug}/your-event
                    </code>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              onClick={handleSaveSettings}
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-medium"
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Business Settings
            </Button>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            {/* Change Password */}
            <Card className="bg-card/50 border-white/10">
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
                      className="bg-[#101112]/50 border-white/10 pr-10"
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
                    className="bg-[#101112]/50 border-white/10"
                    placeholder="Confirm new password"
                  />
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleSaveSettings}
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-medium"
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update Password
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
                      This will permanently delete your account and all associated data
                    </CardDescription>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-white/10 text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                          This action cannot be undone. This will permanently delete your account 
                          and remove all your data from our servers including events, photos, and templates.
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

