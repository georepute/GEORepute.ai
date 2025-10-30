// Role definitions and capabilities

export type UserRole = 'admin' | 'agency' | 'client';

export interface RoleCapabilities {
  canViewAllClients: boolean;
  canManageTeam: boolean;
  canAccessWhiteLabel: boolean;
  canBuildQuotes: boolean;
  canViewReports: boolean;
  canManageKeywords: boolean;
  canViewAnalytics: boolean;
  canManageContent: boolean;
  canViewRankings: boolean;
  canViewAIVisibility: boolean;
  canAccessVideoReports: boolean;
  canManageSettings: boolean;
}

export const ROLE_CAPABILITIES: Record<UserRole, RoleCapabilities> = {
  admin: {
    canViewAllClients: true,
    canManageTeam: true,
    canAccessWhiteLabel: true,
    canBuildQuotes: true,
    canViewReports: true,
    canManageKeywords: true,
    canViewAnalytics: true,
    canManageContent: true,
    canViewRankings: true,
    canViewAIVisibility: true,
    canAccessVideoReports: true,
    canManageSettings: true,
  },
  agency: {
    canViewAllClients: true,
    canManageTeam: true,
    canAccessWhiteLabel: true,
    canBuildQuotes: true,
    canViewReports: true,
    canManageKeywords: true,
    canViewAnalytics: true,
    canManageContent: true,
    canViewRankings: true,
    canViewAIVisibility: true,
    canAccessVideoReports: true,
    canManageSettings: true,
  },
  client: {
    canViewAllClients: false,
    canManageTeam: false,
    canAccessWhiteLabel: false,
    canBuildQuotes: false,
    canViewReports: true,
    canManageKeywords: true,
    canViewAnalytics: true,
    canManageContent: true,
    canViewRankings: true,
    canViewAIVisibility: true,
    canAccessVideoReports: false,
    canManageSettings: true,
  },
};

export function getRoleCapabilities(role: UserRole): RoleCapabilities {
  return ROLE_CAPABILITIES[role];
}

export function hasCapability(role: UserRole, capability: keyof RoleCapabilities): boolean {
  return ROLE_CAPABILITIES[role][capability];
}


