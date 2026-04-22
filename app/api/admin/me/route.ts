import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}
