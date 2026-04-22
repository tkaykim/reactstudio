import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export interface MeUser {
  id: string;
  name: string;
  email: string;
  role: string;
  bu_code: string | null;
  status: string;
  partner_id: number | null;
}

export async function getMeUser(): Promise<MeUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: appUser } = await supabase
    .from('app_users')
    .select('id, name, email, role, bu_code, status, partner_id')
    .eq('id', user.id)
    .single();

  if (!appUser) return null;
  if (appUser.status !== 'active') return null;
  return appUser as MeUser;
}

export async function requireMe(redirectTo?: string): Promise<MeUser> {
  const user = await getMeUser();
  if (!user) {
    const q = redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : '';
    redirect(`/admin/login${q}`);
  }
  return user;
}

export async function apiRequireMe() {
  const { NextResponse } = await import('next/server');
  const user = await getMeUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  return { user };
}
