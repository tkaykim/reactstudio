'use client';

import { useState } from 'react';
import { Calendar, Tag } from 'lucide-react';

interface ProjectRecord {
  id: number;
  name: string;
  category: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
}

export default function HistoryClient({
  byYear,
  categories,
}: {
  byYear: Record<string, ProjectRecord[]>;
  categories: string[];
}) {
  const [filterCategory, setFilterCategory] = useState('전체');

  const years = Object.keys(byYear).sort((a, b) => (b === '기타' ? -1 : a === '기타' ? 1 : Number(b) - Number(a)));

  const filteredByYear: Record<string, ProjectRecord[]> = {};
  for (const year of years) {
    const filtered = filterCategory === '전체'
      ? byYear[year]
      : byYear[year].filter((p) => p.category === filterCategory);
    if (filtered.length > 0) {
      filteredByYear[year] = filtered;
    }
  }

  const totalFiltered = Object.values(filteredByYear).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div>
      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-10">
        {['전체', ...categories].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filterCategory === cat
                ? 'bg-brand text-white'
                : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {totalFiltered === 0 ? (
        <div className="text-center py-20 text-white/30">해당 카테고리의 프로젝트가 없습니다.</div>
      ) : (
        <div className="space-y-12">
          {Object.keys(filteredByYear).sort((a, b) => (b === '기타' ? -1 : a === '기타' ? 1 : Number(b) - Number(a))).map((year) => (
            <div key={year}>
              {/* Year header */}
              <div className="flex items-center gap-4 mb-6">
                <h2 className="text-3xl font-black text-brand">{year}</h2>
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-white/30 text-sm">{filteredByYear[year].length}건</span>
              </div>

              {/* Projects grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredByYear[year].map((project) => (
                  <div
                    key={project.id}
                    className="group p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-sm group-hover:text-brand transition-colors truncate">
                          {project.name}
                        </h3>
                        {project.description && (
                          <p className="text-white/30 text-xs mt-1 line-clamp-2">{project.description}</p>
                        )}
                      </div>
                      <span className="flex-shrink-0 px-2 py-0.5 rounded bg-white/5 text-white/40 text-xs flex items-center gap-1">
                        <Tag size={10} />
                        {project.category}
                      </span>
                    </div>
                    {(project.start_date || project.end_date) && (
                      <div className="flex items-center gap-1 mt-2 text-white/20 text-xs">
                        <Calendar size={10} />
                        {project.start_date && new Date(project.start_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                        {project.start_date && project.end_date && ' ~ '}
                        {project.end_date && new Date(project.end_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
