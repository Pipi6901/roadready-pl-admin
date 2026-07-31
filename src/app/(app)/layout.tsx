'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { useAuth } from '@/lib/auth-context';

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/topics', label: 'Topics' },
  { href: '/import', label: 'CSV Import' },
  { href: '/users', label: 'Users' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { ready, user, role, signOut } = useAuth();

  React.useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  if (!ready) {
    return <div className="flex flex-1 items-center justify-center text-sm text-black/50">Loading…</div>;
  }

  if (!user) {
    // Redirect effect above will fire; render nothing in the meantime.
    return null;
  }

  if (!role) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-3">
          <h1 className="text-lg font-semibold">No access yet</h1>
          <p className="text-sm text-black/60">
            {user.email} is signed in but has no role in RoadReady Admin. Ask an admin to invite you.
          </p>
          <button onClick={() => void signOut()} className="text-sm underline">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1">
      <aside className="w-56 shrink-0 border-r border-black/10 p-4">
        <div className="mb-6">
          <div className="text-sm font-semibold">RoadReady Admin</div>
          <div className="text-xs text-black/50">
            {user.email} · {role}
          </div>
        </div>
        <nav className="space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm hover:bg-black/5"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button onClick={() => void signOut()} className="mt-6 text-sm text-black/50 underline">
          Sign out
        </button>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
