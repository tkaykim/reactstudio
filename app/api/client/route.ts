import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: '토큰이 필요합니다.' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    const { data: inquiry, error: inqErr } = await supabase
      .from('inquiries')
      .select('*')
      .eq('client_token', token)
      .single();

    if (inqErr || !inquiry) {
      return NextResponse.json({ error: '정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    const { data: contracts } = await supabase
      .from('contracts')
      .select('id, title, status, total_amount, client_signed_at, sent_at, created_at')
      .eq('inquiry_id', inquiry.id)
      .order('created_at', { ascending: false });

    let project = null;
    if (inquiry.project_id) {
      const { data: proj } = await supabase
        .from('projects')
        .select('id, name, category, status, start_date, end_date, description')
        .eq('id', inquiry.project_id)
        .single();
      if (proj) {
        const { count: totalTasks } = await supabase
          .from('project_tasks')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', proj.id);
        const { count: doneTasks } = await supabase
          .from('project_tasks')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', proj.id)
          .eq('status', 'done');
        project = { ...proj, total_tasks: totalTasks ?? 0, done_tasks: doneTasks ?? 0 };
      }
    }

    return NextResponse.json({
      inquiry: {
        name: inquiry.name,
        company: inquiry.company,
        services: inquiry.services,
        status: inquiry.status,
        created_at: inquiry.created_at,
      },
      contracts: contracts ?? [],
      project,
    });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
