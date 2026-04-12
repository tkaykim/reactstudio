'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import { useEffect } from 'react';

interface MobileNavProps {
  links: { href: string; label: string }[];
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
}

export default function MobileNav({ links, isOpen, onClose, currentPath }: MobileNavProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative ml-auto w-72 h-full bg-[#0a0a0a] border-l border-white/10 flex flex-col p-6">
        <button
          onClick={onClose}
          className="self-end text-white/60 hover:text-white mb-8"
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
              className={`px-4 py-3 rounded text-base font-medium transition-colors ${
                currentPath === link.href
                  ? 'bg-brand text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto">
          <Link
            href="/start"
            onClick={onClose}
            className="block w-full text-center px-4 py-3 bg-brand text-white font-semibold rounded hover:bg-orange-600 transition-colors"
          >
            프로젝트 시작하기
          </Link>
        </div>
      </div>
    </div>
  );
}
