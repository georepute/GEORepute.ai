"use client";

import { motion } from "framer-motion";
import { useState } from "react";
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
  User
} from "lucide-react";

export default function Team() {
  const [searchTerm, setSearchTerm] = useState("");

  const teamMembers = [
    {
      id: 1,
      name: "John Doe",
      email: "john@company.com",
      role: "admin",
      status: "active",
      avatar: "JD",
      lastActive: "2 hours ago",
      joinedDate: "2024-01-15",
      projects: 12
    },
    {
      id: 2,
      name: "Sarah Johnson",
      email: "sarah@company.com",
      role: "agency",
      status: "active",
      avatar: "SJ",
      lastActive: "5 minutes ago",
      joinedDate: "2024-03-20",
      projects: 8
    },
    {
      id: 3,
      name: "Mike Chen",
      email: "mike@client.com",
      role: "client",
      status: "active",
      avatar: "MC",
      lastActive: "1 day ago",
      joinedDate: "2024-06-10",
      projects: 3
    },
    {
      id: 4,
      name: "Emily Davis",
      email: "emily@agency.com",
      role: "agency",
      status: "active",
      avatar: "ED",
      lastActive: "30 minutes ago",
      joinedDate: "2024-02-28",
      projects: 15
    },
    {
      id: 5,
      name: "Alex Rivera",
      email: "alex@client.com",
      role: "client",
      status: "inactive",
      avatar: "AR",
      lastActive: "2 weeks ago",
      joinedDate: "2024-05-05",
      projects: 2
    },
    {
      id: 6,
      name: "Lisa Thompson",
      email: "lisa@company.com",
      role: "admin",
      status: "active",
      avatar: "LT",
      lastActive: "1 hour ago",
      joinedDate: "2024-01-20",
      projects: 10
    },
  ];

  const stats = [
    { label: "Total Members", value: "24", icon: Users, color: "text-blue-600" },
    { label: "Admins", value: "3", icon: Crown, color: "text-purple-600" },
    { label: "Agencies", value: "8", icon: Briefcase, color: "text-green-600" },
    { label: "Clients", value: "13", icon: User, color: "text-orange-600" },
  ];

  const getRoleConfig = (role: string) => {
    switch (role) {
      case "admin":
        return { 
          label: "Admin", 
          icon: Crown,
          color: "text-purple-700",
          bg: "bg-purple-100"
        };
      case "agency":
        return { 
          label: "Agency", 
          icon: Briefcase,
          color: "text-blue-700",
          bg: "bg-blue-100"
        };
      case "client":
        return { 
          label: "Client", 
          icon: User,
          color: "text-green-700",
          bg: "bg-green-100"
        };
      default:
        return { 
          label: "User", 
          icon: User,
          color: "text-gray-700",
          bg: "bg-gray-100"
        };
    }
  };

  const getStatusColor = (status: string) => {
    return status === "active" 
      ? "bg-green-100 text-green-700" 
      : "bg-gray-100 text-gray-700";
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Team Management</h1>
        <p className="text-gray-600">Manage users, roles, and permissions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
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
          <button className="px-6 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2 justify-center">
            <Plus className="w-5 h-5" />
            Invite Member
          </button>
        </div>
      </div>

      {/* Team Members Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teamMembers.map((member, index) => {
          const roleConfig = getRoleConfig(member.role);
          const RoleIcon = roleConfig.icon;

          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-accent-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {member.avatar}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{member.name}</h3>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {member.email}
                    </p>
                  </div>
                </div>
                <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
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

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-lg font-bold text-gray-900">{member.projects}</div>
                  <div className="text-xs text-gray-600">Projects</div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-gray-600">Last active</div>
                  <div className="text-sm font-semibold text-gray-900">{member.lastActive}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm">
                  <Mail className="w-4 h-4" />
                  Message
                </button>
                <button className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm">
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Role Permissions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="mt-8 bg-white rounded-xl p-6 border border-gray-200"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-6">Role Permissions</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Permission</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
                  <div className="flex items-center justify-center gap-1">
                    <Crown className="w-4 h-4 text-purple-600" />
                    Admin
                  </div>
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
                  <div className="flex items-center justify-center gap-1">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    Agency
                  </div>
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
                  <div className="flex items-center justify-center gap-1">
                    <User className="w-4 h-4 text-green-600" />
                    Client
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                "View Dashboard",
                "Manage Content",
                "Generate Reports",
                "Invite Users",
                "Configure White-Label",
                "Access Analytics",
                "Manage Billing",
                "Delete Data",
              ].map((permission) => (
                <tr key={permission} className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-900">{permission}</td>
                  <td className="py-3 px-4 text-center">
                    <UserCheck className="w-5 h-5 text-green-600 mx-auto" />
                  </td>
                  <td className="py-3 px-4 text-center">
                    {["View Dashboard", "Manage Content", "Generate Reports", "Invite Users", "Access Analytics"].includes(permission) ? (
                      <UserCheck className="w-5 h-5 text-green-600 mx-auto" />
                    ) : (
                      <UserX className="w-5 h-5 text-gray-300 mx-auto" />
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {["View Dashboard", "Generate Reports"].includes(permission) ? (
                      <UserCheck className="w-5 h-5 text-green-600 mx-auto" />
                    ) : (
                      <UserX className="w-5 h-5 text-gray-300 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

