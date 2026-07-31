'use client';

import { collection, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import React from 'react';

import { useAuth } from '@/lib/auth-context';
import { db, functions } from '@/lib/firebase';
import type { AdminUser, Role } from '@/lib/types';

interface UserRow extends AdminUser {
  id: string;
}

export default function UsersPage() {
  const { role } = useAuth();
  const [users, setUsers] = React.useState<UserRow[] | null>(null);
  const [email, setEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState<Role>('content_editor');
  const [inviting, setInviting] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (role !== 'admin') return;
    return onSnapshot(
      collection(db, 'adminUsers'),
      (snap) => setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as AdminUser) }))),
      () => setUsers([]),
    );
  }, [role]);

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setInviting(true);
    try {
      const inviteUser = httpsCallable(functions, 'inviteUser');
      await inviteUser({ email: email.trim(), role: inviteRole });
      setMessage(`Invited ${email.trim()} as ${inviteRole}. They'll get a "set your password" email.`);
      setEmail('');
    } catch (err) {
      setMessage(err instanceof Error ? `Invite failed: ${err.message}` : 'Invite failed.');
    } finally {
      setInviting(false);
    }
  };

  if (role !== 'admin') {
    return <p className="text-sm text-black/60">Only admins can manage users.</p>;
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-semibold">Users</h1>

      <form onSubmit={onInvite} className="flex flex-wrap items-end gap-3 rounded-xl border border-black/10 p-4">
        <label className="text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block rounded-md border border-black/15 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Role
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as Role)}
            className="mt-1 block rounded-md border border-black/15 px-3 py-2"
          >
            <option value="content_editor">content_editor</option>
            <option value="admin">admin</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={inviting}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {inviting ? 'Inviting…' : 'Invite'}
        </button>
      </form>

      {message ? <p className="rounded-md bg-black/5 p-3 text-sm">{message}</p> : null}

      <div className="divide-y divide-black/10 rounded-xl border border-black/10">
        {users === null ? (
          <div className="p-4 text-sm text-black/50">Loading…</div>
        ) : (
          users.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-4 text-sm">
              <span>{u.email}</span>
              <span className="text-black/50">{u.role}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
