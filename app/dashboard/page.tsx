"use client";

import { usePermissions } from "@/hooks/usePermissions";
import { SkeletonCard, SkeletonChart } from "@/components/Skeleton";
import ClientDashboard from "./_components/ClientDashboard";
import AgencyDashboard from "./_components/AgencyDashboard";
import AdminDashboard from "./_components/AdminDashboard";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function Dashboard() {
  const { role, loading } = usePermissions();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    loadUser();
  }, []);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <SkeletonChart key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Render role-specific dashboard
  if (role === 'admin') {
    return <AdminDashboard user={user} />;
  }

  if (role === 'agency') {
    return <AgencyDashboard user={user} />;
  }

  // Default to client dashboard
  return <ClientDashboard user={user} />;
}
