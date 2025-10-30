import { UserRole, hasCapability, RoleCapabilities } from './roles';

export interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  requiredCapability?: keyof RoleCapabilities;
}

export function filterNavigationByRole(
  role: UserRole | null,
  navigation: NavigationItem[]
): NavigationItem[] {
  if (!role) return [];

  return navigation.filter((item) => {
    if (!item.requiredCapability) return true;
    return hasCapability(role, item.requiredCapability);
  });
}

export function canAccessRoute(role: UserRole | null, capability: keyof RoleCapabilities): boolean {
  if (!role) return false;
  return hasCapability(role, capability);
}


