"use client";

import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function Dashboard() {
  const router = useRouter();
  const { role, loading } = usePermissions();
  const [user, setUser] = useState<any>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      // Redirect to AI Visibility page after user is loaded
      if (user && !redirecting) {
        setRedirecting(true);
        router.push("/dashboard/ai-visibility");
      }
    }
    loadUser();
  }, [router, redirecting]);

  // Show loading state while redirecting
  if (loading || redirecting) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // This should not be reached, but keep as fallback
  return null;
}
