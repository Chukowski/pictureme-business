import { Home, Settings } from 'lucide-react';
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
  useSidebar,
} from '@/components/ui/sidebar';
import { useTheme } from '@/contexts/ThemeContext';

export function AppSidebar() {
  const { state } = useSidebar();
  const { brandConfig } = useTheme();
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent>
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
    </Sidebar>
  );
}
