'use client';

import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';

import { auth, db } from './firebase';
import type { Role } from './types';

interface AuthState {
  ready: boolean;
  user: User | null;
  /** null while the adminUsers doc hasn't loaded (or doesn't exist — not invited). */
  role: Role | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({ ready: false, user: null, role: null, signOut: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setRole(null);
        setReady(true);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    // Not `ready` until the role doc resolves — the UI must never render as
    // if a role were granted before we've actually checked.
    const unsub = onSnapshot(
      doc(db, 'adminUsers', user.uid),
      (snap) => {
        setRole(snap.exists() ? ((snap.data().role as Role) ?? null) : null);
        setReady(true);
      },
      () => {
        setRole(null);
        setReady(true);
      },
    );
    return unsub;
  }, [user]);

  const value: AuthState = {
    ready,
    user,
    role,
    signOut: () => firebaseSignOut(auth),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
