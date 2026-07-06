import Link from 'next/link';
import Image from 'next/image';
import { Instagram, Mail, Youtube } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black pb-8 pt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-3">
          <div>
            <Image
              src="/brand/react-logo-black.png"
              alt="REACT Studio"
              width={106}
              height={21}
              className="mb-4 h-auto w-[5.4rem] invert"
            />
            <p className="max-w-xs text-sm leading-relaxed text-white/30">
              Music videos, dance films, live clips,
              <br />
              web content production.
            </p>
            <div className="mt-6 flex items-center gap-4">
              <a href="#" className="text-white/30 transition-colors hover:text-brand" aria-label="Instagram">
                <Instagram size={18} />
              </a>
              <a href="#" className="text-white/30 transition-colors hover:text-brand" aria-label="YouTube">
                <Youtube size={18} />
              </a>
              <a href="mailto:react.studio.kr@gmail.com" className="text-white/30 transition-colors hover:text-brand" aria-label="Email">
                <Mail size={18} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-5 text-xs font-medium uppercase tracking-widest text-white/50">
              Navigation
            </h3>
            <ul className="space-y-3">
              {[
                { href: '/portfolio', label: 'Works' },
                { href: '/services', label: 'Services' },
                { href: '/about', label: 'About' },
                { href: '/staff/apply', label: 'Staff Pool' },
                { href: '/contact', label: 'Contact' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/30 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-5 text-xs font-medium uppercase tracking-widest text-white/50">
              Contact
            </h3>
            <ul className="space-y-3 text-sm text-white/30">
              <li>react.studio.kr@gmail.com</li>
              <li>Seoul, Korea</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 sm:flex-row">
          <p className="text-xs text-white/20">
            © {new Date().getFullYear()} REACT Studio.
            All rights reserved.
          </p>
          <Link
            href="/admin"
            className="text-xs text-white/10 transition-colors hover:text-white/30"
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
