import { createMiddleware } from '@tanstack/react-start';

/**
 * Adds the signed-in player's access token to every server function call, so functions
 * protected by requireSupabaseAuth know who is calling. The server re-validates the token.
 */
export const attachSupabaseAuth = createMiddleware({ type: 'function' }).client(async ({ next }) => {
  const { supabase } = await import('@/integrations/supabase/client');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? next({ headers: { Authorization: `Bearer ${token}` } }) : next();
});
