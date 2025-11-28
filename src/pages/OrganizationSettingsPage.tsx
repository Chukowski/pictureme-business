import { useEffect, useState } from 'react';
import { getUserOrganizations, getOrganizationMembers, inviteMember, Organization, OrganizationMember } from '@/services/eventsApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Loader2, 
  UserPlus, 
  Building2, 
  Users, 
  Crown, 
  Shield, 
  User,
  Trash2,
  Edit2,
  Save,
  AlertTriangle,
  Mail,
  Settings
} from 'lucide-react';
import { ENV } from '@/config/env';

export default function OrganizationSettingsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'staff' | 'admin'>('staff');
  const [isInviting, setIsInviting] = useState(false);
  
  // Edit org name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  
  // Remove member dialog
  const [memberToRemove, setMemberToRemove] = useState<OrganizationMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  
  // Current user info
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    loadOrgs();
    // Get current user ID
    const userStr = localStorage.getItem('current_user') || localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUserId(user.id);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      loadMembers(selectedOrg.id);
      setEditedName(selectedOrg.name);
      // Check if current user is owner
      setIsOwner(selectedOrg.owner_user_id === currentUserId);
    }
  }, [selectedOrg, currentUserId]);

  const loadOrgs = async () => {
    try {
      const data = await getUserOrganizations();
      setOrgs(data);
      if (data.length > 0) {
        setSelectedOrg(data[0]);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (orgId: string) => {
    try {
      const data = await getOrganizationMembers(orgId);
      setMembers(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleInvite = async () => {
    if (!selectedOrg || !inviteEmail) return;
    setIsInviting(true);
    try {
      await inviteMember(selectedOrg.id, inviteEmail, inviteRole);
      toast.success('Member added successfully');
      setInviteEmail('');
      setInviteRole('staff');
      loadMembers(selectedOrg.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to invite');
    } finally {
      setIsInviting(false);
    }
  };

  const handleSaveName = async () => {
    if (!selectedOrg || !editedName.trim()) return;
    setIsSavingName(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const baseUrl = ENV.API_URL || '';
      const res = await fetch(`${baseUrl}/api/organizations/${selectedOrg.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ name: editedName.trim() })
      });

      if (!res.ok) throw new Error('Failed to update');
      
      toast.success('Organization name updated');
      setIsEditingName(false);
      
      // Update local state
      setSelectedOrg({ ...selectedOrg, name: editedName.trim() });
      setOrgs(orgs.map(o => o.id === selectedOrg.id ? { ...o, name: editedName.trim() } : o));
    } catch (error) {
      toast.error('Failed to update organization name');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleUpdateRole = async (member: OrganizationMember, newRole: string) => {
    if (!selectedOrg) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const baseUrl = ENV.API_URL || '';
      const res = await fetch(`${baseUrl}/api/organizations/${selectedOrg.id}/members/${member.user_id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ role: newRole })
      });

      if (!res.ok) throw new Error('Failed to update role');
      
      toast.success('Member role updated');
      loadMembers(selectedOrg.id);
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedOrg || !memberToRemove) return;
    setIsRemoving(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const baseUrl = ENV.API_URL || '';
      const res = await fetch(`${baseUrl}/api/organizations/${selectedOrg.id}/members/${memberToRemove.user_id}`, {
        method: 'DELETE',
        headers
      });

      if (!res.ok) throw new Error('Failed to remove member');
      
      toast.success('Member removed');
      setMemberToRemove(null);
      loadMembers(selectedOrg.id);
    } catch (error) {
      toast.error('Failed to remove member');
    } finally {
      setIsRemoving(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-amber-400" />;
      case 'admin': return <Shield className="w-4 h-4 text-indigo-400" />;
      default: return <User className="w-4 h-4 text-slate-400" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'admin': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (orgs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
        <Card className="max-w-md bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6 text-center">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-slate-500" />
            <h2 className="text-xl font-semibold text-white mb-2">No Organization Found</h2>
            <p className="text-slate-400 mb-4">
              Upgrade to a Business plan to create an organization and invite team members.
            </p>
            <Button onClick={() => window.location.href = '/admin/billing'}>
              View Plans
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-500/20">
              <Building2 className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Organization Settings</h1>
              <p className="text-slate-400">Manage your team and organization</p>
            </div>
          </div>
        </div>

        {/* Org Selector if multiple */}
        {orgs.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {orgs.map(org => (
              <Button 
                key={org.id} 
                variant={selectedOrg?.id === org.id ? 'default' : 'outline'}
                onClick={() => setSelectedOrg(org)}
                className={selectedOrg?.id !== org.id ? 'border-slate-600' : ''}
              >
                {org.name}
              </Button>
            ))}
          </div>
        )}

        {selectedOrg && (
          <div className="grid gap-6">
            {/* Organization Info Card */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Organization Details
                    </CardTitle>
                    <CardDescription>
                      Basic information about your organization
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Organization Name */}
                <div className="space-y-2">
                  <Label>Organization Name</Label>
                  {isEditingName ? (
                    <div className="flex gap-2">
                      <Input
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="bg-slate-700/50 border-slate-600"
                        placeholder="Organization name"
                      />
                      <Button onClick={handleSaveName} disabled={isSavingName}>
                        {isSavingName ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsEditingName(false);
                          setEditedName(selectedOrg.name);
                        }}
                        className="border-slate-600"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">{selectedOrg.name}</p>
                      {isOwner && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setIsEditingName(true)}
                          className="h-8 w-8"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Plan Badge */}
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
                    {selectedOrg.plan || 'Business'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Team Members Card */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Team Members
                    </CardTitle>
                    <CardDescription>
                      {members.length} member{members.length !== 1 ? 's' : ''} in your organization
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Members List */}
                <div className="space-y-3">
                  {/* Owner (not in members list) */}
                  <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <Crown className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          Owner (ID: {selectedOrg.owner_user_id})
                          {selectedOrg.owner_user_id === currentUserId && (
                            <span className="text-xs text-indigo-400 ml-2">(You)</span>
                          )}
                        </p>
                        <Badge className={getRoleBadgeColor('owner')}>
                          Owner
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Team Members */}
                  {members.map(member => (
                    <div 
                      key={member.id} 
                      className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center">
                          {getRoleIcon(member.role)}
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            User ID: {member.user_id}
                            {member.user_id === currentUserId && (
                              <span className="text-xs text-indigo-400 ml-2">(You)</span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getRoleBadgeColor(member.role)}>
                              {member.role}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {member.status}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Actions (only for owner/admin) */}
                      {isOwner && member.user_id !== currentUserId && (
                        <div className="flex items-center gap-2">
                          {/* Role Selector */}
                          <Select
                            value={member.role}
                            onValueChange={(value) => handleUpdateRole(member, value)}
                          >
                            <SelectTrigger className="w-28 bg-slate-700/50 border-slate-600">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>

                          {/* Remove Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMemberToRemove(member)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}

                  {members.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No team members yet</p>
                      <p className="text-sm mt-1">Invite your first team member below</p>
                    </div>
                  )}
                </div>

                {/* Invite Section */}
                <div className="pt-4 border-t border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    Invite Team Member
                  </h3>
                  <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                    <div className="flex-1 min-w-[200px]">
                      <Input 
                        placeholder="Email address" 
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        className="bg-slate-700/50 border-slate-600"
                        type="email"
                      />
                    </div>
                    <Select value={inviteRole} onValueChange={(v: 'staff' | 'admin') => setInviteRole(v)}>
                      <SelectTrigger className="w-32 bg-slate-700/50 border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Staff
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Admin
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleInvite} disabled={!inviteEmail || isInviting}>
                      {isInviting ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Mail className="w-4 h-4 mr-2" />
                      )}
                      Invite
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    User must already have a PictureMe account to be invited.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Role Permissions Info */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-base">Role Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="w-4 h-4 text-amber-400" />
                      <span className="font-medium text-amber-400">Owner</span>
                    </div>
                    <ul className="text-xs text-slate-400 space-y-1">
                      <li>• Full organization control</li>
                      <li>• Manage billing & tokens</li>
                      <li>• Add/remove all members</li>
                      <li>• Access all events</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-indigo-400" />
                      <span className="font-medium text-indigo-400">Admin</span>
                    </div>
                    <ul className="text-xs text-slate-400 space-y-1">
                      <li>• Manage all events</li>
                      <li>• Invite staff members</li>
                      <li>• View analytics</li>
                      <li>• Cannot manage billing</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-500/10 border border-slate-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-400">Staff</span>
                    </div>
                    <ul className="text-xs text-slate-400 space-y-1">
                      <li>• Access Staff Dashboard</li>
                      <li>• Manage assigned events</li>
                      <li>• Approve album photos</li>
                      <li>• Limited permissions</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Remove Member Confirmation Dialog */}
      <Dialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Remove Team Member
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this member from your organization? 
              They will lose access to all organization events.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setMemberToRemove(null)}
              className="border-slate-600"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
