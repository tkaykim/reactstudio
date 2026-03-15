import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { CURRENT_BU_CODE } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();
    const status = req.nextUrl.searchParams.get('status');
    const limit = Number(req.nextUrl.searchParams.get('limit')) || 100;

    let query = supabase
      .from('projects')
      .select('id, name, category, status, start_date, end_date, description')
      .eq('bu_code', CURRENT_BU_CODE);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query
      .order('end_date', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ projects: data });
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
