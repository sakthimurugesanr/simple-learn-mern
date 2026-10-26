'use client';
import { can } from '@aurel/shared';
import { useAppSelector } from '@/lib/store';
export function usePermission(permission: string) {
  const user = useAppSelector((s) => s.auth.user);
  return user ? can(user.role, user.overrides ?? [], permission) : false;
}
export function Can({ permission, children }: { permission: string; children: React.ReactNode }) {
  return usePermission(permission) ? children : null;
}
