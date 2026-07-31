'use client';

import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import React from 'react';

import { useAuth } from '@/lib/auth-context';
import { auth } from '@/lib/firebase';

export default function LoginPage() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (ready && user) router.replace('/');
  }, [ready, user, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/');
    } catch {
      setError('Wrong email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-xl border border-black/10 p-6">
        <div>
          <h1 className="text-lg font-semibold">RoadReady Admin</h1>
          <p className="text-sm text-black/60">Invite-only. Ask an admin for access.</p>
        </div>

        <label className="block text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-black/15 px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-black/15 px-3 py-2"
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-xs text-black/50">
          Invited but no password yet? Use the &quot;Forgot password&quot; link Firebase sent you, or ask an admin
          to re-invite you.
        </p>
      </form>
    </div>
  );
}
