'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Loader2, AlertCircle, CheckCircle, Clock,
  FileSignature, Briefcase,
} from 'lucide-react';

interface PortalData {
  inquiry: {
    name: string;
    company: string;
    services: string[];
    status: string;
    created_at: string;
  };
  contracts: Array<{
    id: number;
    title: string;
    status: string;
    total_amount: number;
    client_signed_at: string | null;
    sent_at: string | null;
  }>;
  project: {
    id: number;
    name: string;
    category: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
    description: string | null;
    total_tasks: number;
    done_tasks: number;
  } | null;
}

const inquiryStatusConfig: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  new: { label: '접수됨', icon: Clock, color: 'text-brand' },
  in_progress: { label: '진행 중', icon: Clock, color: 'text-blue-400' },
  done: { label: '완료', icon: CheckCircle, color: 'text-green-400' },
};

const projectStatusConfig: Record<string, { label: string; color: string }> = {
  '준비중': { label: '준비 중', color: 'bg-yellow-500/20 text-yellow-400' },
  '기획중': { label: '기획 중', color: 'bg-purple-500/20 text-purple-400' },
  '진행중': { label: '진행 중', color: 'bg-blue-500/20 text-blue-400' },
  '운영중': { label: '운영 중', color: 'bg-cyan-500/20 text-cyan-400' },
  '완료': { label: '완료', color: 'bg-green-500/20 text-green-400' },
  '보류': { label: '보류', color: 'bg-gray-500/20 text-gray-400' },
};

export default function ClientPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/client?token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.inquiry) setData(d);
        else setError(d.error || '정보를 찾을 수 없습니다.');
      })
      .catch(() => setError('오류가 발생했습니다.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-brand" size={32} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <p className="text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  const { inquiry, contracts, project } = data;
  const StatusIcon = inquiryStatusConfig[inquiry.status]?.icon || Clock;
  const progressPercent = project && project.total_tasks > 0
    ? Math.round((project.done_tasks / project.total_tasks) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <h1 className="text-xl font-black text-brand">REACT STUDIO</h1>
          <p className="text-white/30 text-xs mt-0.5">클라이언트 포털</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome */}
        <div>
          <h2 className="text-2xl font-black text-white">
            {inquiry.name}님{inquiry.company ? ` (${inquiry.company})` : ''}
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <StatusIcon size={14} className={inquiryStatusConfig[inquiry.status]?.color} />
            <span className={`text-sm font-medium ${inquiryStatusConfig[inquiry.status]?.color}`}>
              문의 {inquiryStatusConfig[inquiry.status]?.label}
            </span>
            <span className="text-white/20 text-xs">
              · {new Date(inquiry.created_at).toLocaleDateString('ko-KR')}
            </span>
          </div>
        </div>

        {/* Project Status (if linked) */}
        {project && (
          <section className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase size={16} className="text-brand" />
              <h3 className="text-white font-bold">프로젝트 진행 현황</h3>
            </div>

            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white font-semibold">{project.name}</p>
                <p className="text-white/30 text-xs mt-0.5">{project.category}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${projectStatusConfig[project.status]?.color || 'bg-white/10 text-white/50'}`}>
                {projectStatusConfig[project.status]?.label || project.status}
              </span>
            </div>

            {project.description && (
              <p className="text-white/40 text-sm mb-4">{project.description}</p>
            )}

            {project.total_tasks > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-white/40">작업 진행률</span>
                  <span className="text-brand font-semibold">{project.done_tasks}/{project.total_tasks} ({progressPercent}%)</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            )}

            {(project.start_date || project.end_date) && (
              <p className="text-white/20 text-xs mt-3">
                {project.start_date} ~ {project.end_date || '진행 중'}
              </p>
            )}
          </section>
        )}

        {/* Contracts (견적서) */}
        {contracts.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <FileSignature size={16} className="text-brand" />
              <h3 className="text-white font-bold">견적서</h3>
            </div>
            <div className="space-y-2">
              {contracts.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                  <div>
                    <p className="text-white text-sm font-medium">{c.title}</p>
                    <p className="text-white/30 text-xs mt-0.5">{Number(c.total_amount).toLocaleString()}원 (VAT 포함)</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    c.status === 'signed' ? 'bg-green-500/20 text-green-400'
                    : c.status === 'sent' || c.status === 'viewed' ? 'bg-blue-500/20 text-blue-400'
                    : c.status === 'completed' ? 'bg-green-700/20 text-green-300'
                    : 'bg-white/10 text-white/40'
                  }`}>
                    {c.status === 'signed' ? '서명 완료'
                    : c.status === 'viewed' ? '열람됨'
                    : c.status === 'sent' ? '서명 대기'
                    : c.status === 'completed' ? '완료'
                    : '작성 중'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Timeline */}
        <section>
          <h3 className="text-white font-bold mb-3">진행 타임라인</h3>
          <div className="relative pl-6 border-l border-white/10 space-y-4">
            <TimelineItem label="문의 접수" date={inquiry.created_at} done />
            <TimelineItem label="견적서 발송" date={contracts[0]?.sent_at} done={!!contracts[0]?.sent_at} />
            <TimelineItem
              label="견적서 서명"
              date={contracts[0]?.client_signed_at}
              done={contracts.some((c) => c.status === 'signed' || c.status === 'completed')}
            />
            <TimelineItem
              label="프로젝트 진행"
              done={!!project && project.status !== '준비중'}
            />
            <TimelineItem
              label="프로젝트 완료"
              done={project?.status === '완료'}
            />
          </div>
        </section>

        <div className="pt-6 border-t border-white/5 text-center">
          <p className="text-white/20 text-xs">React Studio | react.studio.kr@gmail.com</p>
        </div>
      </main>
    </div>
  );
}

function TimelineItem({ label, date, done }: { label: string; date?: string | null; done: boolean }) {
  return (
    <div className="relative">
      <div className={`absolute -left-[25px] w-3 h-3 rounded-full border-2 ${
        done ? 'bg-brand border-brand' : 'bg-black border-white/20'
      }`} />
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${done ? 'text-white' : 'text-white/30'}`}>{label}</span>
        {date && <span className="text-white/20 text-xs">{new Date(date).toLocaleDateString('ko-KR')}</span>}
        {done && <CheckCircle size={12} className="text-green-400" />}
      </div>
    </div>
  );
}
