import { useSyncExternalStore } from 'react';

export type SessionUser = {
  id: string;
  authUserId: string;
  displayName: string;
  roles: string[];
};

export type Session = {
  token: string;
  refreshToken: string;
  expiresAt: number;
  user: SessionUser;
};

const STORAGE_KEY = 'manatown.session';

// Web keeps the session across reloads; native apps hold it in memory for now.
function storage() {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function load(): Session | null {
  const raw = storage()?.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Session;
    return typeof parsed.token === 'string' &&
      typeof parsed.refreshToken === 'string' &&
      typeof parsed.expiresAt === 'number' &&
      typeof parsed.user?.authUserId === 'string'
      ? parsed
      : null;
  } catch {
    return null;
  }
}

let current: Session | null = load();
const listeners = new Set<() => void>();

function publish(next: Session | null) {
  current = next;
  const store = storage();
  if (next) store?.setItem(STORAGE_KEY, JSON.stringify(next));
  else store?.removeItem(STORAGE_KEY);
  listeners.forEach((listener) => listener());
}

export function getSession() {
  return current;
}

export function setSession(session: Session) {
  publish(session);
}

export function clearSession() {
  if (current) publish(null);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSession() {
  return useSyncExternalStore(subscribe, getSession, getSession);
}

export function hasRole(session: Session | null, role: string) {
  return session?.user.roles.includes(role) ?? false;
}
