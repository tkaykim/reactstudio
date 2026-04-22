'use client';

import { useEffect, useState } from 'react';
import type { AdminUser } from '@/lib/admin-auth';

export function useAdminUser() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch('/api/admin/me')
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => {
        if (alive) setUser(d.user ?? null);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const canViewAll = user ? user.role === 'admin' || user.bu_code === 'HEAD' : false;
  return { user, loading, canViewAll };
}
