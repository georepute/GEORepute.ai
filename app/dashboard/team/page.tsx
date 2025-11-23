"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { 
  Users, 
  Plus,
  Search,
  MoreVertical,
  Mail,
  Shield,
  UserCheck,
  UserX,
  Edit,
  Trash2,
  Crown,
  Briefcase,
  User,
  X,
  Loader2,
  AlertCircle,
  RotateCw
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { 
  getUserOrganizations, 
  getOrganizationMembers,
  isOrganizationAdmin,
  getAllRoles,
  updateUserRole,
  removeUserFromOrganization
} from "@/lib/organizations";
import toast from "react-hot-toast";

interface TeamMember {
  id: string;
  user_id: string | null;
  organization_id: string;
  role_id: string;
  status: string;
  joined_at: string | null;
  invited_at: string | null;
  created_at: string;
  role: {
    id: string;
    name: string;
    description: string;
  };
}

interface UserProfile {
  user_id: string;
  email: string;
  full_name: string;
}

export default function Team() {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [removing, setRemoving] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [openInvitationMenu, setOpenInvitationMenu] = useState<string | null>(null);
  const [cancellingInvitation, setCancellingInvitation] = useState<string | null>(null);
  const [resendingInvitation, setResendingInvitation] = useState<string | null>(null);

  useEffect(() => {
    loadTeamData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openInvitationMenu) {
        const target = event.target as HTMLElement;
        if (!target.closest('.invitation-menu-container')) {
          setOpenInvitationMenu(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openInvitationMenu]);

  async function loadTeamData() {
    try {
      setLoading(true);

      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }

      // Get user's organization
      const { organizations } = await getUserOrganizations();
      
      if (!organizations || organizations.length === 0) {
        toast.error("No organization found");
        return;
      }

      const orgId = organizations[0].organization.id;
      setOrganizationId(orgId);

      // Check if user is admin
      const adminStatus = await isOrganizationAdmin(orgId);
      setIsAdmin(adminStatus);

      // Get ALL organization members directly from organization_users table
      // This includes all statuses: active, inactive, invited, suspended
      const { data: orgMembers, error: membersError } = await supabase
        .from('organization_users')
        .select(`
          id,
          user_id,
          organization_id,
          role_id,
          status,
          joined_at,
          invited_at,
          created_at,
          role:roles!inner(id, name, description)
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (membersError) {
        console.error('Error fetching members:', membersError);
        toast.error('Failed to load team members');
        setMembers([]);
      } else {
        // Transform the data to ensure role is a single object, not an array
        const transformedMembers: TeamMember[] = (orgMembers || []).map((m: any) => ({
          id: m.id,
          user_id: m.user_id,
          organization_id: m.organization_id,
          role_id: m.role_id,
          status: m.status,
          joined_at: m.joined_at,
          invited_at: m.invited_at,
          created_at: m.created_at,
          role: Array.isArray(m.role) ? m.role[0] : m.role,
        }));
        
        setMembers(transformedMembers);
        
        // Fetch user profiles for all members (only those with user_id)
        if (transformedMembers.length > 0) {
          // Filter out null user_ids (invited users who haven't signed up yet)
          const userIds = transformedMembers
            .map((m: TeamMember) => m.user_id)
            .filter((id: string | null) => id !== null) as string[];

          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from('user')
              .select('user_id, email, full_name')
              .in('user_id', userIds);

            if (profiles) {
              const profileMap: Record<string, UserProfile> = {};
              profiles.forEach((profile: UserProfile) => {
                profileMap[profile.user_id] = profile;
              });
              setUserProfiles(profileMap);
            }
          }
        }
      }

      // Get available roles
      const { roles } = await getAllRoles();
      setAvailableRoles(roles);
      if (roles.length > 0) {
        setInviteRole(roles[0].id);
      }

      // Fetch pending invitations (from invitation_tokens table)
      // Allow all organization members to view pending invites (not just admins)
      // Include both 'pending' and 'expired' statuses so admins can resend expired invites
      const { data: invitations, error: inviteError } = await supabase
        .from('invitation_tokens')
        .select(`
          id,
          email,
          status,
          expires_at,
          created_at,
          role:roles(id, name, description),
          organization:organizations(name)
        `)
        .eq('organization_id', orgId)
        .in('status', ['pending', 'expired'])
        .order('created_at', { ascending: false });

      if (inviteError) {
        console.error('Error fetching pending invitations:', inviteError);
        // Don't show error toast, just log it - invites are optional
      } else if (invitations) {
        // Transform invitations to ensure role is a single object
        const transformedInvitations = invitations.map((inv: any) => ({
          ...inv,
          role: Array.isArray(inv.role) ? inv.role[0] : inv.role,
        }));
        setPendingInvitations(transformedInvitations);
        console.log('Loaded pending invitations:', transformedInvitations.length);
      }

    } catch (error: any) {
      console.error("Error loading team data:", error);
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    
    if (!organizationId || !inviteEmail || !inviteRole) {
      toast.error("Please fill in all fields");
      return;
    }

    setInviteLoading(true);

    try {
      // Call invitation API which handles email sending
      const response = await fetch('/api/organizations/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          organizationId: organizationId,
          roleId: inviteRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      if (data.invitation?.email_sent) {
        toast.success("Invitation email sent successfully!");
      } else {
        toast.success("Invitation created, but email failed to send. You can resend it later.");
      }

      setShowInviteModal(false);
      setInviteEmail("");
      // Refresh data to show new invitation in pending invites section
      loadTeamData();

    } catch (error: any) {
      console.error("Error inviting user:", error);
      toast.error("Failed to invite user: " + error.message);
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleUpdateRole(newRoleId: string) {
    if (!organizationId || !selectedMember || !selectedMember.user_id) return;

    try {
      const { success } = await updateUserRole(
        organizationId,
        selectedMember.user_id,
        newRoleId
      );

      if (success) {
        toast.success("Role updated successfully!");
        setShowEditModal(false);
        setSelectedMember(null);
        loadTeamData();
      } else {
        toast.error("Failed to update role");
      }
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    }
  }

  function handleRemoveClick(member: TeamMember) {
    setMemberToRemove(member);
    setShowRemoveModal(true);
  }

  async function handleRemoveConfirm() {
    if (!organizationId || !memberToRemove || !memberToRemove.user_id) return;

    setRemoving(true);

    try {
      const { success } = await removeUserFromOrganization(
        organizationId,
        memberToRemove.user_id
      );

      if (success) {
        toast.success("Member removed successfully!");
        setShowRemoveModal(false);
        setMemberToRemove(null);
        loadTeamData();
      } else {
        toast.error("Failed to remove member");
      }
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    } finally {
      setRemoving(false);
    }
  }

  async function handleCancelInvitation(invitationId: string) {
    setCancellingInvitation(invitationId);
    setOpenInvitationMenu(null);

    try {
      const { error } = await supabase
        .from('invitation_tokens')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);
      
      if (!error) {
        toast.success('Invitation cancelled');
        loadTeamData();
      } else {
        toast.error('Failed to cancel invitation');
      }
    } catch (error: any) {
      console.error('Error cancelling invitation:', error);
      toast.error('Failed to cancel invitation');
    } finally {
      setCancellingInvitation(null);
    }
  }

  async function handleResendInvitation(invitationId: string) {
    setResendingInvitation(invitationId);
    setOpenInvitationMenu(null);

    try {
      const response = await fetch('/api/organizations/invite/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId: invitationId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend invitation');
      }

      if (data.invitation?.email_sent) {
        toast.success("Invitation email resent successfully!");
      } else {
        toast.success("Invitation updated, but email failed to send. You can try again later.");
      }

      loadTeamData();
    } catch (error: any) {
      console.error("Error resending invitation:", error);
      toast.error("Failed to resend invitation: " + error.message);
    } finally {
      setResendingInvitation(null);
    }
  }

  const getRoleConfig = (roleName: string) => {
    switch (roleName) {
      case "Admin":
        return { 
          label: "Admin", 
          icon: Crown,
          color: "text-purple-700",
          bg: "bg-purple-100"
        };
      case "Manager":
        return { 
          label: "Manager", 
          icon: Briefcase,
          color: "text-blue-700",
          bg: "bg-blue-100"
        };
      case "Editor":
        return { 
          label: "Editor", 
          icon: Edit,
          color: "text-green-700",
          bg: "bg-green-100"
        };
      case "Viewer":
        return { 
          label: "Viewer", 
          icon: User,
          color: "text-gray-700",
          bg: "bg-gray-100"
        };
      default:
        return { 
          label: roleName, 
          icon: User,
          color: "text-gray-700",
          bg: "bg-gray-100"
        };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "inactive":
        return "bg-gray-100 text-gray-700";
      case "invited":
        return "bg-yellow-100 text-yellow-700";
      case "suspended":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Separate members into two groups
  const teamMembers = members.filter(m => 
    m.status === 'active' && m.user_id !== null
  );
  
  const pendingInvites = members.filter(m => 
    m.status === 'invited' || (m.status === 'active' && m.user_id === null)
  );

  // Calculate stats
  const stats = {
    total: teamMembers.length,
    admins: teamMembers.filter(m => m.role.name === 'Admin').length,
    managers: teamMembers.filter(m => m.role.name === 'Manager').length,
    pending: pendingInvites.length + pendingInvitations.length,
  };

  const statsData = [
    { label: "Team Members", value: stats.total.toString(), icon: Users, color: "text-blue-600" },
    { label: "Admins", value: stats.admins.toString(), icon: Crown, color: "text-purple-600" },
    { label: "Managers", value: stats.managers.toString(), icon: Briefcase, color: "text-green-600" },
    { label: "Pending Invites", value: stats.pending.toString(), icon: Mail, color: "text-orange-600" },
  ];

  // Filter team members by search
  const filteredTeamMembers = teamMembers.filter(member => {
    const profile = member.user_id ? userProfiles[member.user_id] : null;
    
    if (!searchTerm.trim()) {
      return true;
    }
    
    const searchLower = searchTerm.toLowerCase();
    
    if (profile) {
      return (
        profile.full_name?.toLowerCase().includes(searchLower) ||
        profile.email?.toLowerCase().includes(searchLower) ||
        member.role.name.toLowerCase().includes(searchLower)
      );
    }
    
    return member.role.name.toLowerCase().includes(searchLower);
  });

  // Filter pending invites by search
  const filteredPendingInvites = pendingInvites.filter(member => {
    if (!searchTerm.trim()) {
      return true;
    }
    
    const searchLower = searchTerm.toLowerCase();
    const profile = member.user_id ? userProfiles[member.user_id] : null;
    
    if (profile) {
      return (
        profile.email?.toLowerCase().includes(searchLower) ||
        member.role.name.toLowerCase().includes(searchLower)
      );
    }
    
    return member.role.name.toLowerCase().includes(searchLower);
  });

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading team data...</p>
        </div>
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900 mb-1">No Organization Found</h3>
            <p className="text-yellow-800">
              You need to be part of an organization to manage team members.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Team Management</h1>
        <p className="text-gray-600">Manage your organization members and roles</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsData.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl p-6 border border-gray-200"
          >
            <stat.icon className={`w-8 h-8 ${stat.color} mb-2`} />
            <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
            <p className="text-gray-600">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search team members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
            />
          </div>
          {isAdmin && (
            <button 
              onClick={() => setShowInviteModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2 justify-center"
            >
              <Plus className="w-5 h-5" />
              Invite Member
            </button>
          )}
        </div>
      </div>

      {/* Team Members Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6" />
            Team Members
          </h2>
          <span className="text-sm text-gray-500">
            {filteredTeamMembers.length} {filteredTeamMembers.length === 1 ? 'member' : 'members'}
          </span>
        </div>

        {filteredTeamMembers.length === 0 ? (
          <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No team members found</h3>
            <p className="text-gray-600">
              {searchTerm ? "Try a different search term" : "Invite members to get started"}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeamMembers.map((member, index) => {
            const profile = member.user_id ? userProfiles[member.user_id] : null;
            const roleConfig = getRoleConfig(member.role.name);
            const RoleIcon = roleConfig.icon;

            // For team members, always show data from user table
            const displayName = profile?.full_name || 'No name';
            const displayEmail = profile?.email || 'No email';
            const initials = profile 
              ? getInitials(profile.full_name || profile.email)
              : '??';

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-accent-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {initials}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">{displayName}</h3>
                        {member.user_id === currentUserId && (
                          <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {displayEmail}
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="relative group">
                      <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-[120px]">
                        <button 
                          onClick={() => {
                            setSelectedMember(member);
                            setShowEditModal(true);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          Edit Role
                        </button>
                        <button 
                          onClick={() => handleRemoveClick(member)}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Role & Status */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${roleConfig.bg} ${roleConfig.color}`}>
                    <RoleIcon className="w-3 h-3" />
                    {roleConfig.label}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(member.status)}`}>
                    {member.status}
                  </span>
                </div>

                {/* Join/Invite Date */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600">
                    {member.joined_at ? 'Joined' : member.invited_at ? 'Invited' : 'Added'}
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {member.joined_at 
                      ? new Date(member.joined_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })
                      : member.invited_at
                      ? new Date(member.invited_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })
                      : member.created_at
                      ? new Date(member.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })
                      : 'N/A'}
                  </div>
                </div>
              </motion.div>
            );
          })}
          </div>
        )}
      </motion.div>

      {/* Pending Invites Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="w-6 h-6" />
            Pending Invites
          </h2>
          <span className="text-sm text-gray-500">
            {filteredPendingInvites.length + pendingInvitations.length} {filteredPendingInvites.length + pendingInvitations.length === 1 ? 'invite' : 'invites'}
          </span>
        </div>

        {/* Pending Invites from organization_users */}
        {filteredPendingInvites.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {filteredPendingInvites.map((member, index) => {
              const profile = member.user_id ? userProfiles[member.user_id] : null;
              const roleConfig = getRoleConfig(member.role.name);
              const RoleIcon = roleConfig.icon;

              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="bg-white rounded-xl p-6 border-2 border-yellow-200 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-700 font-bold text-lg">
                        {profile ? getInitials(profile.full_name || profile.email) : 'IN'}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">
                          {profile?.full_name || profile?.email || 'Pending User'}
                        </h3>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {profile?.email || 'Invited (pending signup)'}
                        </p>
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleRemoveClick(member)}
                        className="p-2 text-red-400 hover:text-red-600 transition-colors"
                        title="Cancel invite"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${roleConfig.bg} ${roleConfig.color}`}>
                      <RoleIcon className="w-3 h-3" />
                      {roleConfig.label}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                      Pending
                    </span>
                  </div>

                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <div className="text-xs text-gray-600">Invited</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {member.invited_at 
                        ? new Date(member.invited_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })
                        : member.created_at
                        ? new Date(member.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })
                        : 'N/A'}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pending Invitations from invitation_tokens */}
        {pendingInvitations.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingInvitations
              .filter(inv => {
                if (!searchTerm.trim()) return true;
                const searchLower = searchTerm.toLowerCase();
                return (
                  inv.email.toLowerCase().includes(searchLower) ||
                  inv.role.name.toLowerCase().includes(searchLower)
                );
              })
              .map((invitation, index) => {
                const roleConfig = getRoleConfig(invitation.role.name);
                const RoleIcon = roleConfig.icon;
                const expiresAt = new Date(invitation.expires_at);
                const isExpired = expiresAt < new Date();
                const daysUntilExpiry = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                return (
                  <motion.div
                    key={invitation.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    className="bg-white rounded-xl p-6 border-2 border-orange-200 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 font-bold text-lg">
                          {invitation.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">Email Sent</h3>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {invitation.email}
                          </p>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="relative invitation-menu-container">
                          <button 
                            onClick={() => setOpenInvitationMenu(
                              openInvitationMenu === invitation.id ? null : invitation.id
                            )}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            disabled={cancellingInvitation === invitation.id || resendingInvitation === invitation.id}
                          >
                            {cancellingInvitation === invitation.id || resendingInvitation === invitation.id ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <MoreVertical className="w-5 h-5" />
                            )}
                          </button>
                          {openInvitationMenu === invitation.id && (
                            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[160px]">
                              <button 
                                onClick={() => handleCancelInvitation(invitation.id)}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                disabled={cancellingInvitation === invitation.id || resendingInvitation === invitation.id}
                              >
                                <X className="w-4 h-4" />
                                Cancel Invitation
                              </button>
                              {isExpired && (
                                <button 
                                  onClick={() => handleResendInvitation(invitation.id)}
                                  className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                                  disabled={cancellingInvitation === invitation.id || resendingInvitation === invitation.id}
                                >
                                  <RotateCw className="w-4 h-4" />
                                  Resend Invitation
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${roleConfig.bg} ${roleConfig.color}`}>
                        <RoleIcon className="w-3 h-3" />
                        {roleConfig.label}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        isExpired 
                          ? 'bg-red-100 text-red-700' 
                          : daysUntilExpiry <= 2
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {isExpired ? 'Expired' : `${daysUntilExpiry}d left`}
                      </span>
                    </div>

                    <div className="p-3 bg-orange-50 rounded-lg">
                      <div className="text-xs text-gray-600">Invited</div>
                      <div className="text-sm font-semibold text-gray-900">
                        {new Date(invitation.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </div>
                      {!isExpired && (
                        <div className="text-xs text-gray-500 mt-1">
                          Expires: {expiresAt.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
          </div>
        )}

        {/* Empty state for pending invites */}
        {filteredPendingInvites.length === 0 && pendingInvitations.length === 0 && (
          <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
            <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No pending invites</h3>
            <p className="text-gray-600">
              {searchTerm ? "Try a different search term" : "All invitations have been accepted"}
            </p>
          </div>
        )}
      </motion.div>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-8 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Invite Team Member</h2>
                <button 
                  onClick={() => setShowInviteModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                    placeholder="user@example.com"
                  />
                  <p className="mt-1 text-sm text-gray-500">User must have an account to be invited</p>
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    id="role"
                    required
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                  >
                    {availableRoles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.name} - {role.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {inviteLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Inviting...
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        Invite
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Remove Confirmation Modal */}
      <AnimatePresence>
        {showRemoveModal && memberToRemove && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => !removing && setShowRemoveModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-8 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Remove Team Member</h2>
                </div>
                {!removing && (
                  <button 
                    onClick={() => setShowRemoveModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Are you sure you want to remove{' '}
                  <strong>
                    {memberToRemove.user_id 
                      ? userProfiles[memberToRemove.user_id]?.full_name || 
                        userProfiles[memberToRemove.user_id]?.email || 
                        'this user'
                      : 'this user'}
                  </strong>{' '}
                  from the organization?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    <strong>Warning:</strong> This action will remove their access to the organization. 
                    They will no longer be able to view or manage organization resources.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRemoveModal(false)}
                  disabled={removing}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoveConfirm}
                  disabled={removing}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {removing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-5 h-5" />
                      Remove Member
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Role Modal */}
      <AnimatePresence>
        {showEditModal && selectedMember && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-8 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Change Role</h2>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-600">
                  Changing role for: <strong>{selectedMember.user_id ? userProfiles[selectedMember.user_id]?.full_name || 'User' : 'User'}</strong>
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Current role: {selectedMember.role.name}
                </p>
              </div>

              <div className="space-y-2">
                {availableRoles.map(role => (
                  <button
                    key={role.id}
                    onClick={() => handleUpdateRole(role.id)}
                    disabled={role.id === selectedMember.role.id}
                    className={`w-full p-4 rounded-lg text-left transition-all ${
                      role.id === selectedMember.role.id
                        ? 'bg-primary-100 border-2 border-primary-500 cursor-not-allowed'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{role.name}</div>
                    <div className="text-sm text-gray-600">{role.description}</div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowEditModal(false)}
                className="w-full mt-6 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
