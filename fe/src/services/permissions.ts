// services/permissions.ts - Updated with company.change permission
import { getCurrentUser } from './service';

export interface UserPermissions {
  permissions: string[];
  role: string;
}

let cachedPermissions: UserPermissions | null = null;

export const getUserPermissions = async (): Promise<UserPermissions> => {
  try {
    if (cachedPermissions) {
      return cachedPermissions;
    }

    const user = await getCurrentUser();

    const permissions = user?.permissions || [];
    const role = user?.roles?.[0]?.name || user?.role?.name || 'User';

    cachedPermissions = { permissions, role };
    return cachedPermissions;
  } catch (error) {
    console.error('Failed to fetch user permissions:', error);
    return { permissions: [], role: 'User' };
  }
};

export const clearPermissionsCache = () => {
  cachedPermissions = null;
};

export const hasPermission = async (permission: string): Promise<boolean> => {
  try {
    const { permissions } = await getUserPermissions();
    return permissions.includes(permission);
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
};

export const hasAnyPermission = async (permissionList: string[]): Promise<boolean> => {
  try {
    const { permissions } = await getUserPermissions();
    return permissionList.some(p => permissions.includes(p));
  } catch (error) {
    console.error('Error checking permissions:', error);
    return false;
  }
};

export const hasAllPermissions = async (permissionList: string[]): Promise<boolean> => {
  try {
    const { permissions } = await getUserPermissions();
    return permissionList.every(p => permissions.includes(p));
  } catch (error) {
    console.error('Error checking permissions:', error);
    return false;
  }
};

// Permission constants - Updated with company.change
export const PERMISSIONS = {
  USER: {
    VIEW: 'user.view',
    CREATE: 'user.create',
    EDIT: 'user.edit',
    DELETE: 'user.delete',
  },
  ROLE: {
    VIEW: 'role.view',
    CREATE: 'role.create',
    EDIT: 'role.edit',
    DELETE: 'role.delete',
  },
  PERMISSION: {
    VIEW: 'permission.view',
    CREATE: 'permission.create',
    EDIT: 'permission.edit',
    DELETE: 'permission.delete',
  },
  DASHBOARD: {
    VIEW: 'dashboard.view',
  },
  CUSTOM: {
    VIEW: 'custom.view',
    CREATE: 'custom.create',
    EDIT: 'custom.edit',
    DELETE: 'custom.delete',
    UPLOAD_CSV: 'custom.upload-csv',
  },
  INVOICE: {
    VIEW: 'invoice.view',
    CREATE: 'invoice.create',
    EDIT: 'invoice.edit',
    DELETE: 'invoice.delete',
    MANAGE: 'invoice.manage',
    MAIL: 'invoice.mail',
  },
  INVOICE_CLIENT: {
    VIEW: 'invoice-client.view',
    CREATE: 'invoice-client.create',
    EDIT: 'invoice-client.edit',
    DELETE: 'invoice-client.delete',
  },
  RECEIPT: {
    VIEW: 'receipt.view',
    CREATE: 'receipt.create',
    EDIT: 'receipt.edit',
    DELETE: 'receipt.delete',
    MAIL: 'receipt.mail',
  },
  COMPANY: {
    CHANGE: 'company.change',
  },
  REFERRAL: {
    VIEW: 'referral.view',
  },
} as const;

// Helper to get all permission values as an array
export const getAllPermissions = (): string[] => {
  const permissions: string[] = [];

  const extractPermissions = (obj: Record<string, unknown>) => {
    Object.values(obj).forEach(value => {
      if (typeof value === 'string') {
        permissions.push(value);
      } else if (typeof value === 'object' && value !== null) {
        extractPermissions(value as Record<string, unknown>);
      }
    });
  };

  extractPermissions(PERMISSIONS as Record<string, unknown>);
  return permissions;
};

// Helper to check if user has company change permission
export const canChangeCompanyDetails = async (): Promise<boolean> => {
  return hasPermission(PERMISSIONS.COMPANY.CHANGE);
};