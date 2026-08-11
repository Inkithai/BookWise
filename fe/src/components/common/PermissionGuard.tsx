'use client';

import { usePermissions } from '@/utils/permissions';
import AccessDenied from './AccessDenied';

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
}

export default function PermissionGuard({ permission, children }: PermissionGuardProps) {
  const { can, isSubUser, isHydrating } = usePermissions();
  if (isHydrating) return null;
  if (isSubUser && !can(permission)) {
    return <AccessDenied />;
  }
  return <>{children}</>;
}
