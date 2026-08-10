export type UserRole = 'super_admin' | 'admin' | 'editor' | 'user';

export interface RolePermission {
  canManageContent: boolean;
  canManageMedia: boolean;
  canManageUsers: boolean;
  canManageAISettings: boolean;
  canViewAnalytics: boolean;
  canAccessAdmin: boolean;
}

export const rolePermissions: Record<UserRole, RolePermission> = {
  super_admin: {
    canManageContent: true,
    canManageMedia: true,
    canManageUsers: true,
    canManageAISettings: true,
    canViewAnalytics: true,
    canAccessAdmin: true,
  },
  admin: {
    canManageContent: true,
    canManageMedia: true,
    canManageUsers: true,
    canManageAISettings: true,
    canViewAnalytics: true,
    canAccessAdmin: true,
  },
  editor: {
    canManageContent: true,
    canManageMedia: true,
    canManageUsers: false,
    canManageAISettings: false,
    canViewAnalytics: true,
    canAccessAdmin: true,
  },
  user: {
    canManageContent: false,
    canManageMedia: false,
    canManageUsers: false,
    canManageAISettings: false,
    canViewAnalytics: false,
    canAccessAdmin: false,
  },
};


export const adminRoutes = [
  '/admin',
  '/admin/dashboard',
  '/admin/profile',
  '/admin/tools',
  '/admin/projects',
  '/admin/knowledge',
  '/admin/roadmaps',
  '/admin/resources',
  '/admin/journey',
  '/admin/decisions',
  '/admin/media',
  '/admin/ai-settings',
  '/admin/users',
  '/admin/analytics',
  '/admin/settings',
] as const;
