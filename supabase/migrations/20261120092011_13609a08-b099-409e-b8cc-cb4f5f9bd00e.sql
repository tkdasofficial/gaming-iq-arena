CREATE INDEX IF NOT EXISTS calibration_sessions_device_idx ON public.calibration_sessions (device_id);
CREATE INDEX IF NOT EXISTS calibration_sessions_game_idx ON public.calibration_sessions (game_id);
CREATE INDEX IF NOT EXISTS calibration_sessions_setting_idx ON public.calibration_sessions (setting_id);
CREATE INDEX IF NOT EXISTS feedback_events_session_idx ON public.feedback_events (calibration_session_id);
CREATE INDEX IF NOT EXISTS feedback_events_device_idx ON public.feedback_events (device_id);
CREATE INDEX IF NOT EXISTS feedback_events_game_idx ON public.feedback_events (game_id);
CREATE INDEX IF NOT EXISTS feedback_events_setting_idx ON public.feedback_events (setting_id);
CREATE INDEX IF NOT EXISTS player_profiles_game_idx ON public.player_profiles (game_id);
CREATE INDEX IF NOT EXISTS recommendations_device_idx ON public.recommendations (device_id);
CREATE INDEX IF NOT EXISTS recommendations_game_idx ON public.recommendations (game_id);
CREATE INDEX IF NOT EXISTS recommendations_model_version_idx ON public.recommendations (model_version_id);
CREATE INDEX IF NOT EXISTS recommendations_setting_idx ON public.recommendations (setting_id);
CREATE INDEX IF NOT EXISTS runtime_profiles_game_idx ON public.runtime_profiles (game_id);

DROP POLICY IF EXISTS "Admins manage model versions" ON public.model_versions;
CREATE POLICY "Admins add model versions" ON public.model_versions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins edit model versions" ON public.model_versions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete model versions" ON public.model_versions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage component benchmarks" ON public.component_benchmarks;
CREATE POLICY "Admins add component benchmarks" ON public.component_benchmarks FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins edit component benchmarks" ON public.component_benchmarks FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete component benchmarks" ON public.component_benchmarks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage touch profiles" ON public.touch_profiles;
CREATE POLICY "Admins add touch profiles" ON public.touch_profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins edit touch profiles" ON public.touch_profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete touch profiles" ON public.touch_profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage runtime profiles" ON public.runtime_profiles;
CREATE POLICY "Admins add runtime profiles" ON public.runtime_profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins edit runtime profiles" ON public.runtime_profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete runtime profiles" ON public.runtime_profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));