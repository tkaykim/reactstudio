'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

interface MobileNavProps {
  links: { href: string; label: string }[];
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
}

export default function MobileNav({ links, isOpen, onClose, currentPath }: MobileNavProps) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative ml-auto flex h-full w-72 flex-col border-l border-white/10 bg-[#0a0a0a] p-6">
        <button
          onClick={onClose}
          className="mb-8 self-end text-white/60 hover:text-white"
          aria-label="메뉴 닫기"
        >
          <X size={24} />
        </button>

        <nav className="flex flex-col gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={`rounded px-4 py-3 text-base font-medium transition-colors ${
                currentPath === link.href
                  ? 'bg-brand text-white'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-2">
          <Link
            href="/staff/apply"
            onClick={onClose}
            className="block w-full rounded border border-white/10 px-4 py-3 text-center font-semibold text-white/75 transition-colors hover:border-brand/50 hover:text-white"
          >
            제작 파트너 지원
          </Link>
          <Link
            href="/start"
            onClick={onClose}
            className="block w-full rounded bg-brand px-4 py-3 text-center font-semibold text-white transition-colors hover:bg-orange-600"
          >
            프로젝트 시작하기
          </Link>
        </div>
      </div>
    </div>
  );
}
