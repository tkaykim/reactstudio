import Link from 'next/link';
import Image from 'next/image';
import { Instagram, Youtube, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/5 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          <div>
            <Image src="/logo.svg" alt="React Studio" width={140} height={28} className="mb-4" />
            <p className="text-white/30 text-sm leading-relaxed max-w-xs">
              Music Videos, Dance Films, Live Clips,
              <br />Web Content Production
            </p>
            <div className="flex items-center gap-4 mt-6">
              <a href="#" className="text-white/30 hover:text-brand transition-colors" aria-label="Instagram">
                <Instagram size={18} />
              </a>
              <a href="#" className="text-white/30 hover:text-brand transition-colors" aria-label="YouTube">
                <Youtube size={18} />
              </a>
              <a href="mailto:react.studio.kr@gmail.com" className="text-white/30 hover:text-brand transition-colors" aria-label="Email">
                <Mail size={18} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-white/50 text-xs font-medium uppercase tracking-widest mb-5">
              Navigation
            </h3>
            <ul className="space-y-3">
              {[
                { href: '/portfolio', label: 'Works' },
                { href: '/services', label: 'Services' },
                { href: '/about', label: 'About' },
                { href: '/contact', label: 'Contact' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/30 hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white/50 text-xs font-medium uppercase tracking-widest mb-5">
              Contact
            </h3>
            <ul className="space-y-3 text-white/30 text-sm">
              <li>react.studio.kr@gmail.com</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/20 text-xs">
            © {new Date().getFullYear()} React Studio. All rights reserved.
          </p>
          <Link
            href="/admin"
            className="text-white/10 hover:text-white/30 text-xs transition-colors"
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
