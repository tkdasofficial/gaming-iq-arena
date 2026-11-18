import type { User } from '@supabase/supabase-js';

/** App-facing signed-in user, mapped from the Supabase auth user. */
export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

export function toAppUser(user: User): AppUser {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    (user.email ? user.email.split('@')[0] : null) ||
    null;
  const avatar =
    (typeof meta.avatar_url === 'string' && meta.avatar_url) ||
    (typeof meta.picture === 'string' && meta.picture) ||
    null;
  return {
    uid: user.id,
    email: user.email ?? null,
    displayName: name,
    photoURL: avatar,
    emailVerified: Boolean(user.email_confirmed_at),
  };
}
