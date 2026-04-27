import { TASK_CATEGORY_COLOR, isTaskCategory } from '@/lib/project-categories';

export default function CategoryBadge({ tag }: { tag: string | null | undefined }) {
  if (!tag) return null;
  const className = isTaskCategory(tag)
    ? TASK_CATEGORY_COLOR[tag]
    : 'bg-white/10 text-white/50';
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider ${className}`}>
      {tag}
    </span>
  );
}
