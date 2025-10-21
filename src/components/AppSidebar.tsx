import { Home, Settings, Moon, Sun } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { useTheme } from '@/contexts/ThemeContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getCurrentEvent, updateEvent } from '@/services/adminStorage';
import { useEffect, useState } from 'react';

export function AppSidebar() {
  const { brandConfig, updateTheme } = useTheme();
  const { state } = useSidebar();
  const [userName, setUserName] = useState<string>('Event Guest');
  const [userRole, setUserRole] = useState<string>('Attendee');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);

  useEffect(() => {
    // Load event user from current event if present
    try {
      const current = getCurrentEvent();
      if (current?.userProfile) {
        setUserName(current.userProfile.name || 'Event Guest');
        setUserRole(current.userProfile.role || 'Attendee');
        setAvatarUrl(current.userProfile.avatarUrl);
      } else {
        // Graceful fallback using brand
        const brand = brandConfig.brandName || 'Photobooth';
        setUserName(`${brand} Guest`);
        setUserRole('Attendee');
        setAvatarUrl(undefined);
      }
      setCurrentEventId(current?.id || null);
    } catch {
      // ignore
    }
  }, [brandConfig.brandName]);

  const currentMode = brandConfig.mode === 'dark' ? 'dark' : 'light';
  const ModeIcon = currentMode === 'dark' ? Sun : Moon;

  const toggleThemeMode = () => {
    const nextMode = currentMode === 'dark' ? 'light' : 'dark';
    updateTheme({ mode: nextMode });
    try {
      if (currentEventId) {
        updateEvent(currentEventId, { themeMode: nextMode });
      }
    } catch (error) {
      console.warn('Failed to persist theme mode', error);
    }
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="relative flex items-center gap-3 border-b border-sidebar-border px-5 py-3">
        {state !== 'collapsed' && (
          <SidebarTrigger className="hidden md:flex fixed top-3 left-3 z-40 shadow-card" />
        )}
        <div className="h-8 w-8 rounded-xl gradient-primary shadow-card" />
        <span className="text-sm font-semibold text-sidebar-foreground truncate max-w-[10rem]">
          {brandConfig.brandName || 'AI Photobooth'}
        </span>
      </SidebarHeader>
      <SidebarContent>
        {/* Event User Profile */}
        <SidebarGroup>
          <SidebarGroupLabel>User</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-3 py-3 flex items-center gap-3 rounded-lg border border-sidebar-border bg-sidebar-accent">
              <Avatar className="h-9 w-9">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={userName} />
                ) : (
                  <AvatarFallback>
                    {userName
                      .split(' ')
                      .map((s) => s[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate text-sidebar-foreground">{userName}</p>
                <p className="text-xs text-sidebar-foreground/70 truncate">{userRole}</p>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Event Info</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-3 py-2 space-y-2 text-sm">
              <div>
                <p className="font-semibold text-sidebar-foreground">{brandConfig.brandName}</p>
                {brandConfig.tagline && (
                  <p className="text-xs text-sidebar-foreground/70">{brandConfig.tagline}</p>
                )}
              </div>
              <div className="flex gap-2 items-center">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: brandConfig.primaryColor }}
                />
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: brandConfig.secondaryColor }}
                />
                <span className="text-xs text-sidebar-foreground/70">Theme</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-sidebar-foreground/70">Mode</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium gradient-card text-foreground border border-sidebar-border/60">
                  {(brandConfig.mode || 'light').charAt(0).toUpperCase() + (brandConfig.mode || 'light').slice(1)}
                </span>
              </div>
              <Button
                size="sm"
                onClick={toggleThemeMode}
                className="w-full mt-2 flex items-center justify-center gap-2 gradient-primary text-primary-foreground shadow-card border-0 hover:opacity-90"
              >
                <ModeIcon className="w-4 h-4" />
                <span className="text-xs font-semibold">
                  Switch to {currentMode === 'dark' ? 'Light' : 'Dark'}
                </span>
              </Button>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/" end>
                    <Home className="h-4 w-4" />
                    <span>Photo Booth</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/admin/login">
                    <Settings className="h-4 w-4" />
                    <span>Admin Panel</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>About</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-3 py-2 text-xs text-sidebar-foreground/70">
              <p className="font-semibold text-sidebar-foreground mb-1">AI Photobooth</p>
              <p>Powered by Akitá</p>
              <p className="mt-2 text-[10px]">
                Advanced AI photo processing with dynamic scene compositing
              </p>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail className="relative border-none bg-transparent after:content-[''] after:bg-transparent group-data-[state=collapsed]:w-12">
        <SidebarTrigger className="absolute left-full top-1/2 -translate-y-1/2 ml-1 hidden group-data-[state=collapsed]:flex h-9 w-9 items-center justify-center rounded-full border border-sidebar-border bg-sidebar shadow-card text-sidebar-foreground hover:bg-sidebar-accent">
          <div className="h-6 w-6 rounded-xl gradient-primary" />
        </SidebarTrigger>
      </SidebarRail>
    </Sidebar>
  );
}
