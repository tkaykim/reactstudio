import type { Metadata } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { CURRENT_BU_CODE } from '@/types';
import HistoryClient from './HistoryClient';

export const metadata: Metadata = {
  title: '프로젝트 이력',
  description: 'React Studio의 영상 제작 이력을 확인하세요.',
};

export const revalidate = 3600;

interface ProjectRecord {
  id: number;
  name: string;
  category: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
}

async function getCompletedProjects(): Promise<ProjectRecord[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('projects')
      .select('id, name, category, status, start_date, end_date, description')
      .eq('bu_code', CURRENT_BU_CODE)
      .eq('status', '완료')
      .order('end_date', { ascending: false, nullsFirst: false });
    return (data ?? []) as ProjectRecord[];
  } catch {
    return [];
  }
}

export default async function HistoryPage() {
  const projects = await getCompletedProjects();

  const byYear: Record<string, ProjectRecord[]> = {};
  for (const p of projects) {
    const year = p.end_date ? new Date(p.end_date).getFullYear().toString() : '기타';
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(p);
  }

  const categories = [...new Set(projects.map((p) => p.category))].sort();

  return (
    <div className="min-h-screen bg-black pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <span className="text-brand text-sm font-semibold uppercase tracking-widest">Track Record</span>
          <h1 className="text-4xl sm:text-5xl font-black text-white mt-3 mb-4">프로젝트 이력</h1>
          <p className="text-white/50 max-w-xl">
            React Studio가 완료한 프로젝트 목록입니다. 총 {projects.length}건의 프로젝트를 성공적으로 완료했습니다.
          </p>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-32 text-white/30">
            <p className="text-xl">프로젝트 이력을 준비 중입니다.</p>
          </div>
        ) : (
          <HistoryClient byYear={byYear} categories={categories} />
        )}
      </div>
    </div>
  );
}
