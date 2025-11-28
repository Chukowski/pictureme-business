/**
 * BusinessSettingsPage
 * 
 * Comprehensive business settings page for organizations.
 * Features:
 * - Organization profile management
 * - Team members list with roles
 * - Invite/remove members
 * - Default event settings
 * - Billing & tokens overview
 * - Transaction history
 * - Analytics summary
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Building2,
  Users,
  CreditCard,
  Mail,
  MoreVertical,
  UserPlus,
  Trash2,
  Edit,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Coins,
  Shield,
  Crown,
  UserCog,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getUserOrganizations,
  getOrganizationMembers,
  inviteMember,
  Organization,
  OrganizationMember,
  User as EventsUser,
} from '@/services/eventsApi';
import { getTokenStats, TokenStats } from '@/services/billingApi';
import { ENV } from '@/config/env';
import TokensTab from '@/components/dashboard/TokensTab';
import BillingTab from '@/components/dashboard/BillingTab';

interface User {
  id: number;
  email: string;
  name?: string;
  role?: string;
  plan?: string;
  organization_id?: string;
}

export function BusinessSettingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  
  // Organization data
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  
  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditOrgModal, setShowEditOrgModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'staff'>('staff');
  const [newOrgName, setNewOrgName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const orgs = await getUserOrganizations();
      if (orgs.length > 0) {
        const orgData = orgs[0]; // Use first org
        setOrganization(orgData);
        setNewOrgName(orgData.name);
        
        const membersData = await getOrganizationMembers(orgData.id);
        setMembers(membersData);
      }
      
      const statsData = await getTokenStats().catch(() => null);
      setTokenStats(statsData);
    } catch (error) {
      console.error('Failed to load business data:', error);
      toast.error('Failed to load business settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load user from localStorage
  useEffect(() => {
    const userStr = localStorage.getItem('current_user') || localStorage.getItem('user');
    const token = localStorage.getItem('auth_token');
    
    if (!token || !userStr) {
      navigate('/login');
      return;
    }
    
    try {
      const userData = JSON.parse(userStr);
      setUser(userData);
      
      // Check for any business role (business, business_pro, business_starter, etc.)
      const isBusiness = userData.role?.startsWith('business') && userData.role !== 'business_pending';
      if (!isBusiness) {
        toast.error('Business account required');
        navigate('/admin');
        return;
      }
      
      loadData();
    } catch {
      navigate('/login');
    }
  }, [navigate, loadData]);

  // Invite member
  const handleInvite = async () => {
    if (!inviteEmail || !organization) return;
    
    setIsSubmitting(true);
    try {
      await inviteMember(organization.id, inviteEmail, inviteRole);
      toast.success(`Invitation sent to ${inviteEmail}`);
      setShowInviteModal(false);
      setInviteEmail('');
      loadData();
    } catch (error) {
      console.error('Failed to invite member:', error);
      toast.error('Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remove member
  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!organization) return;
    
    if (!confirm(`Remove ${memberName} from the organization?`)) return;
    
    try {
      const res = await fetch(`${ENV.API_URL}/api/organizations/${organization.id}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      if (!res.ok) throw new Error('Failed to remove');
      toast.success(`${memberName} has been removed`);
      loadData();
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('Failed to remove member');
    }
  };

  // Update member role
  const handleRoleChange = async (memberId: string, newRole: 'admin' | 'staff') => {
    if (!organization) return;
    
    try {
      const res = await fetch(`${ENV.API_URL}/api/organizations/${organization.id}/members/${memberId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success('Role updated');
      loadData();
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error('Failed to update role');
    }
  };

  // Update organization name
  const handleUpdateOrg = async () => {
    if (!organization || !newOrgName) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`${ENV.API_URL}/api/organizations/${organization.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newOrgName }),
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success('Organization updated');
      setShowEditOrgModal(false);
      loadData();
    } catch (error) {
      console.error('Failed to update organization:', error);
      toast.error('Failed to update organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get role badge
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <Badge className="bg-amber-500/20 text-amber-400"><Crown className="w-3 h-3 mr-1" />Owner</Badge>;
      case 'admin':
        return <Badge className="bg-purple-500/20 text-purple-400"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
      default:
        return <Badge className="bg-zinc-500/20 text-zinc-400"><UserCog className="w-3 h-3 mr-1" />Staff</Badge>;
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle2 className="w-3 h-3 mr-1" />Active</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge className="bg-red-500/20 text-red-400"><XCircle className="w-3 h-3 mr-1" />Inactive</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const isOwner = members.find(m => m.user_id === user?.id)?.role === 'owner';

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Building2 className="w-8 h-8 text-indigo-400" />
              Business Settings
            </h1>
            <p className="text-zinc-400 mt-1">
              Manage your organization, team, and billing
            </p>
          </div>
          <Button
            variant="outline"
            className="border-zinc-700 text-zinc-300"
            onClick={() => navigate('/admin')}
          >
            Back to Dashboard
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="overview" className="data-[state=active]:bg-indigo-500">
              <Building2 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="team" className="data-[state=active]:bg-indigo-500">
              <Users className="w-4 h-4 mr-2" />
              Team
            </TabsTrigger>
            <TabsTrigger value="tokens" className="data-[state=active]:bg-indigo-500">
              <Coins className="w-4 h-4 mr-2" />
              Tokens
            </TabsTrigger>
            <TabsTrigger value="billing" className="data-[state=active]:bg-indigo-500">
              <CreditCard className="w-4 h-4 mr-2" />
              Billing
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Organization Card */}
              <Card className="md:col-span-2 bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Organization Profile</CardTitle>
                    <CardDescription className="text-zinc-400">
                      Your business information
                    </CardDescription>
                  </div>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowEditOrgModal(true)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarFallback className="bg-indigo-500/20 text-indigo-400 text-xl">
                        {organization?.name?.charAt(0) || 'B'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        {organization?.name || 'Your Organization'}
                      </h3>
                      <p className="text-zinc-400">{user?.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                    <div>
                      <p className="text-sm text-zinc-400">Members</p>
                      <p className="text-2xl font-bold text-white">{members.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-400">Created</p>
                      <p className="text-lg text-white">
                        {organization?.created_at
                          ? new Date(organization.created_at).toLocaleDateString()
                          : '-'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white">Token Balance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <Coins className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-white">
                        {tokenStats?.balance?.toLocaleString() || '0'}
                      </p>
                      <p className="text-sm text-zinc-400">Available tokens</p>
                    </div>
                  </div>
                  <Button className="w-full bg-indigo-500 hover:bg-indigo-600">
                    Purchase Tokens
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Quick Links */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2 border-zinc-700 hover:bg-zinc-800"
                    onClick={() => setActiveTab('tokens')}
                  >
                    <Coins className="w-6 h-6 text-yellow-400" />
                    <span className="text-white">View Token Usage</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2 border-zinc-700 hover:bg-zinc-800"
                    onClick={() => setActiveTab('billing')}
                  >
                    <CreditCard className="w-6 h-6 text-indigo-400" />
                    <span className="text-white">Manage Billing</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2 border-zinc-700 hover:bg-zinc-800"
                    onClick={() => setActiveTab('team')}
                  >
                    <Users className="w-6 h-6 text-green-400" />
                    <span className="text-white">Manage Team</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-white">Team Members</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Manage your organization's team
                  </CardDescription>
                </div>
                <Button onClick={() => setShowInviteModal(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Member
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead className="text-zinc-400">Member</TableHead>
                      <TableHead className="text-zinc-400">Role</TableHead>
                      <TableHead className="text-zinc-400">Status</TableHead>
                      <TableHead className="text-zinc-400">Joined</TableHead>
                      <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id} className="border-zinc-800">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={member.avatar_url} />
                              <AvatarFallback className="bg-zinc-700 text-white">
                                {member.name?.charAt(0) || member.email?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-white font-medium">
                                {member.name || 'Unnamed'}
                              </p>
                              <p className="text-xs text-zinc-400">{member.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(member.role)}</TableCell>
                        <TableCell>{getStatusBadge(member.status)}</TableCell>
                        <TableCell className="text-zinc-400">
                          {member.joined_at
                            ? new Date(member.joined_at).toLocaleDateString()
                            : 'Pending'}
                        </TableCell>
                        <TableCell className="text-right">
                          {member.role !== 'owner' && isOwner && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                                <DropdownMenuItem
                                  onClick={() => handleRoleChange(
                                    member.user_id,
                                    member.role === 'admin' ? 'staff' : 'admin'
                                  )}
                                >
                                  <Shield className="w-4 h-4 mr-2" />
                                  {member.role === 'admin' ? 'Demote to Staff' : 'Promote to Admin'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleRemoveMember(member.user_id, member.name || member.email)}
                                  className="text-red-400"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Remove Member
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tokens Tab - Full TokensTab Component */}
          <TabsContent value="tokens" className="space-y-6">
            {user && (
              <TokensTab currentUser={user as unknown as EventsUser} />
            )}
          </TabsContent>

          {/* Billing Tab - Full BillingTab Component */}
          <TabsContent value="billing" className="space-y-6">
            {user && (
              <BillingTab currentUser={user as unknown as EventsUser} />
            )}
          </TabsContent>
        </Tabs>

        {/* Invite Member Modal */}
        <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-white">Invite Team Member</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Send an invitation to join your organization
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="text-zinc-300">Role</Label>
                <Select value={inviteRole} onValueChange={(v: 'admin' | 'staff') => setInviteRole(v)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="admin">Admin - Full access</SelectItem>
                    <SelectItem value="staff">Staff - Event access only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowInviteModal(false)}
                className="border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleInvite}
                disabled={!inviteEmail || isSubmitting}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Organization Modal */}
        <Dialog open={showEditOrgModal} onOpenChange={setShowEditOrgModal}>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Organization</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Update your organization details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="orgName" className="text-zinc-300">Organization Name</Label>
                <Input
                  id="orgName"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Your Company Name"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEditOrgModal(false)}
                className="border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateOrg}
                disabled={!newOrgName || isSubmitting}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default BusinessSettingsPage;

