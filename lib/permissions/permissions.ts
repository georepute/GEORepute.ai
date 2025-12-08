import { UserRole, hasCapability, RoleCapabilities } from './roles';

export interface NavigationItem {
  name: string;
  href?: string;
  icon: any;
  requiredCapability?: keyof RoleCapabilities;
  children?: NavigationItem[];
}

export function filterNavigationByRole(
  role: UserRole | null,
  navigation: NavigationItem[]
): NavigationItem[] {
  if (!role) return [];

  return navigation.filter((item) => {
    if (!item.requiredCapability) {
      // If item has children, filter them too
      if (item.children) {
        item.children = filterNavigationByRole(role, item.children);
      }
      return true;
    }
    const hasAccess = hasCapability(role, item.requiredCapability);
    // If item has children, filter them too
    if (hasAccess && item.children) {
      item.children = filterNavigationByRole(role, item.children);
    }
    return hasAccess;
  });
}

export function canAccessRoute(role: UserRole | null, capability: keyof RoleCapabilities): boolean {
  if (!role) return false;
  return hasCapability(role, capability);
}


