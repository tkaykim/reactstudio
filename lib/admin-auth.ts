import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { BuCode } from '@/types';

export type AdminRole = 'admin' | 'leader' | 'manager' | 'viewer';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  bu_code: BuCode;
  status: string;
}

export const ADMIN_ALLOWED_BU_CODES: BuCode[] = ['REACT', 'HEAD'];
/** 이 웹의 관리자는 REACT BU 데이터만 다룬다. 모든 /admin 쿼리는 이 BU로 고정 필터. */
export const ADMIN_BU: BuCode = 'REACT';
export const ADMIN_ALLOWED_ROLES: AdminRole[] = ['admin', 'leader', 'manager'];

function isAllowed(u: { role: string | null; bu_code: string | null; status: string | null }) {
  if (!u) return false;
  if (u.status !== 'active') return false;
  if (!u.bu_code || !ADMIN_ALLOWED_BU_CODES.includes(u.bu_code as BuCode)) return false;
  if (!u.role || !ADMIN_ALLOWED_ROLES.includes(u.role as AdminRole)) return false;
  return true;
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: appUser } = await supabase
    .from('app_users')
    .select('id, name, email, role, bu_code, status')
    .eq('id', user.id)
    .single();

  if (!appUser || !isAllowed(appUser)) return null;
  return appUser as AdminUser;
}

/**
 * For API routes: returns { user } or a 403 NextResponse.
 * Usage:
 *   const guard = await apiRequireAdmin();
 *   if (guard instanceof NextResponse) return guard;
 *   const { user } = guard;
 */
export async function apiRequireAdmin(): Promise<
  { user: AdminUser } | import('next/server').NextResponse
> {
  const { NextResponse } = await import('next/server');
  const user = await getAdminUser();
  if (!user) {
    return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });
  }
  return { user };
}

export async function requireAdmin(): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    redirect('/admin/login?error=unauthorized');
  }
  return user;
}

export function canViewAll(user: AdminUser): boolean {
  return user.role === 'admin' || user.bu_code === 'HEAD';
}

export function canEditBu(user: AdminUser, bu: BuCode): boolean {
  if (canViewAll(user)) return true;
  return user.bu_code === bu;
}

export function canManagePayments(user: AdminUser): boolean {
  return user.role === 'admin' || user.role === 'leader';
}

export function canApprovePayments(user: AdminUser): boolean {
  return user.role === 'admin';
}

export function canManageSignups(user: AdminUser): boolean {
  return user.bu_code === 'HEAD';
}
