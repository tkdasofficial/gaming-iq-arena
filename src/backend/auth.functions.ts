import { createServerFn } from '@tanstack/react-start';

/**
 * Tells the sign-in page whether an email already has an account so it can
 * open in "Log in" or "Sign up" mode. Returns only a boolean.
 */
export const checkEmailHasAccount = createServerFn({ method: 'POST' })
  .inputValidator((input: { email: string }) => {
    const email = String(input?.email ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
      throw new Error('Enter a valid email address.');
    }
    return { email };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: exists, error } = await supabaseAdmin.rpc('email_has_account', {
      _email: data.email,
    });
    if (error) {
      console.error('email_has_account failed', error.message);
      throw new Error('Unable to check this email right now.');
    }
    return { exists: Boolean(exists) };
  });
