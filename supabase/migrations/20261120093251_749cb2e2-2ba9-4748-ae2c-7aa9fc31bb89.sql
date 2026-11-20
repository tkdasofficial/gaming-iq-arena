REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.recommendations FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.feedback_events FROM anon, authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON public.calibration_runs FROM anon, authenticated;
REVOKE UPDATE, TRUNCATE ON public.calibration_sessions FROM anon, authenticated;
REVOKE ALL ON public.player_profiles, public.calibration_sessions, public.calibration_runs, public.recommendations, public.feedback_events FROM anon;