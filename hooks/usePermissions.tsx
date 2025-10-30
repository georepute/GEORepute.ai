"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { UserRole, getRoleCapabilities, RoleCapabilities } from '@/lib/permissions/roles';

export function usePermissions() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [capabilities, setCapabilities] = useState<RoleCapabilities | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('user')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (profile?.role) {
          setRole(profile.role as UserRole);
          setCapabilities(getRoleCapabilities(profile.role as UserRole));
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUserRole();
  }, []);

  return {
    role,
    capabilities,
    loading,
    can: (capability: keyof RoleCapabilities) => capabilities?.[capability] ?? false,
  };
}


