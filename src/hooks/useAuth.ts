import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import { checkIsAdmin } from '../firebase/firestore';

export type AuthStatus = 'loading' | 'unauthenticated' | 'admin';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setStatus('unauthenticated');
        return;
      }

      const token = await u.getIdTokenResult(true);
      const isAdmin = token.claims.admin === true || (await checkIsAdmin(u.uid));
      if (!isAdmin) {
        await signOut(auth);
        setUser(null);
        setStatus('unauthenticated');
        return;
      }

      setUser(u);
      setStatus('admin');
    });
    return unsubscribe;
  }, []);

  const loginWithEmail = (email: string, password: string) =>
    signInWithEmailAndPassword(auth, email, password);

  const signUpWithEmail = (email: string, password: string) =>
    createUserWithEmailAndPassword(auth, email, password);

  const loginWithGoogle = () => signInWithPopup(auth, googleProvider);

  const logout = () => signOut(auth);

  return { user, status, loginWithEmail, signUpWithEmail, loginWithGoogle, logout };
}
