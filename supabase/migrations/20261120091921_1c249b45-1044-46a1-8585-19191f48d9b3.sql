CREATE TYPE public.data_status AS ENUM ('verified','manufacturer_reported','user_reported','estimated','pending','not_verified','not_applicable');

ALTER TABLE public.games ADD COLUMN IF NOT EXISTS current_version text;

CREATE TABLE public.model_versions (
  id text PRIMARY KEY,
  model_name text NOT NULL,
  version text NOT NULL,
  game_id text NOT NULL REFERENCES public.games(id),
  configuration jsonb NOT NULL,
  weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  release_date date NOT NULL DEFAULT current_date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (model_name, version)
);
GRANT SELECT ON public.model_versions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.model_versions TO authenticated;
GRANT ALL ON public.model_versions TO service_role;
ALTER TABLE public.model_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view model versions" ON public.model_versions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage model versions" ON public.model_versions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE UNIQUE INDEX model_versions_one_active_per_game ON public.model_versions (game_id) WHERE is_active;
CREATE TRIGGER update_model_versions_updated_at BEFORE UPDATE ON public.model_versions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.component_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text REFERENCES public.devices(id) ON DELETE CASCADE,
  chipset_id text REFERENCES public.chipsets(id) ON DELETE CASCADE,
  benchmark_name text NOT NULL,
  benchmark_version text,
  single_core_score numeric CHECK (single_core_score >= 0),
  multi_core_score numeric CHECK (multi_core_score >= 0),
  gpu_score numeric CHECK (gpu_score >= 0),
  test_date date,
  source text NOT NULL,
  sample_count integer CHECK (sample_count > 0),
  confidence numeric CHECK (confidence >= 0 AND confidence <= 1),
  data_status public.data_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(device_id, chipset_id) = 1)
);
GRANT SELECT ON public.component_benchmarks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.component_benchmarks TO authenticated;
GRANT ALL ON public.component_benchmarks TO service_role;
ALTER TABLE public.component_benchmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view component benchmarks" ON public.component_benchmarks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage component benchmarks" ON public.component_benchmarks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX component_benchmarks_device_idx ON public.component_benchmarks (device_id);
CREATE INDEX component_benchmarks_chipset_idx ON public.component_benchmarks (chipset_id);
CREATE TRIGGER update_component_benchmarks_updated_at BEFORE UPDATE ON public.component_benchmarks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.touch_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  touch_latency_ms numeric CHECK (touch_latency_ms > 0),
  touch_sampling_rate_hz numeric CHECK (touch_sampling_rate_hz > 0),
  input_consistency_ms numeric CHECK (input_consistency_ms >= 0),
  controller_quality numeric CHECK (controller_quality >= 0 AND controller_quality <= 10),
  measurement_method text,
  firmware text,
  sample_count integer CHECK (sample_count > 0),
  source text NOT NULL,
  confidence numeric CHECK (confidence >= 0 AND confidence <= 1),
  data_status public.data_status NOT NULL DEFAULT 'pending',
  measured_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.touch_profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.touch_profiles TO authenticated;
GRANT ALL ON public.touch_profiles TO service_role;
ALTER TABLE public.touch_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view touch profiles" ON public.touch_profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage touch profiles" ON public.touch_profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX touch_profiles_device_idx ON public.touch_profiles (device_id);
CREATE TRIGGER update_touch_profiles_updated_at BEFORE UPDATE ON public.touch_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.runtime_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  game_id text NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  game_version text,
  graphics_setting text,
  fps_cap integer CHECK (fps_cap > 0 AND fps_cap <= 240),
  average_fps numeric CHECK (average_fps > 0),
  one_percent_low numeric CHECK (one_percent_low > 0),
  frame_stability numeric CHECK (frame_stability >= 0 AND frame_stability <= 10),
  thermal_state text CHECK (thermal_state IN ('none','light','moderate','heavy','severe')),
  session_minutes integer CHECK (session_minutes > 0),
  source text NOT NULL,
  data_status public.data_status NOT NULL DEFAULT 'pending',
  measurement_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (one_percent_low IS NULL OR average_fps IS NULL OR one_percent_low <= average_fps),
  CHECK (average_fps IS NULL OR fps_cap IS NULL OR average_fps <= fps_cap * 1.05)
);
GRANT SELECT ON public.runtime_profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.runtime_profiles TO authenticated;
GRANT ALL ON public.runtime_profiles TO service_role;
ALTER TABLE public.runtime_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view runtime profiles" ON public.runtime_profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage runtime profiles" ON public.runtime_profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX runtime_profiles_device_game_idx ON public.runtime_profiles (device_id, game_id);
CREATE TRIGGER update_runtime_profiles_updated_at BEFORE UPDATE ON public.runtime_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.player_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game_id text NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  finger_count smallint CHECK (finger_count BETWEEN 2 AND 6),
  hud_layout text CHECK (hud_layout IN ('default','custom')),
  fire_button_size smallint CHECK (fire_button_size BETWEEN 10 AND 200),
  fire_button_position text CHECK (fire_button_position IN ('left','right','both')),
  swipe_length text CHECK (swipe_length IN ('short','medium','long')),
  swipe_speed text CHECK (swipe_speed IN ('slow','medium','fast')),
  play_style text CHECK (play_style IN ('close-range-aggressive','balanced','long-range','precision')),
  weapon_preference text CHECK (weapon_preference IN ('smg-shotgun','assault-rifle','sniper','mixed')),
  drag_technique text CHECK (drag_technique IN ('drag-shot','tap-fire','mixed')),
  gyro_status text CHECK (gyro_status IN ('on','off','not-available')),
  comfort_preference text CHECK (comfort_preference IN ('fast','balanced','controlled')),
  uses_free_look boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_profiles TO authenticated;
GRANT ALL ON public.player_profiles TO service_role;
ALTER TABLE public.player_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players view their own player profile" ON public.player_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Players create their own player profile" ON public.player_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Players update their own player profile" ON public.player_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Players delete their own player profile" ON public.player_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_player_profiles_updated_at BEFORE UPDATE ON public.player_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.calibration_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_id text NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  game_id text NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  game_version text,
  setting_id text NOT NULL REFERENCES public.sensitivity_settings(id) ON DELETE CASCADE,
  swipe_distance_mm numeric CHECK (swipe_distance_mm > 0 AND swipe_distance_mm <= 200),
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.calibration_sessions TO authenticated;
GRANT ALL ON public.calibration_sessions TO service_role;
ALTER TABLE public.calibration_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players view their own calibration sessions" ON public.calibration_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Players record their own calibration sessions" ON public.calibration_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Players delete their own calibration sessions" ON public.calibration_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX calibration_sessions_lookup_idx ON public.calibration_sessions (user_id, device_id, game_id, setting_id);

CREATE TABLE public.calibration_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.calibration_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  slider_value numeric NOT NULL,
  repetition_number smallint NOT NULL CHECK (repetition_number BETWEEN 1 AND 50),
  swipe_direction text CHECK (swipe_direction IN ('left','right','up','down')),
  target_movement numeric NOT NULL CHECK (target_movement > 0),
  measured_movement numeric NOT NULL CHECK (measured_movement >= 0),
  overshoot numeric CHECK (overshoot >= 0),
  undershoot numeric CHECK (undershoot >= 0),
  instability numeric CHECK (instability >= 0),
  time_to_target_ms numeric CHECK (time_to_target_ms >= 0),
  device_temperature_c numeric CHECK (device_temperature_c BETWEEN -20 AND 80),
  battery_percent numeric CHECK (battery_percent BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, slider_value, repetition_number, swipe_direction)
);
GRANT SELECT, INSERT ON public.calibration_runs TO authenticated;
GRANT ALL ON public.calibration_runs TO service_role;
ALTER TABLE public.calibration_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players view their own calibration runs" ON public.calibration_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Players record their own calibration runs" ON public.calibration_runs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX calibration_runs_session_idx ON public.calibration_runs (session_id);

CREATE OR REPLACE FUNCTION public.check_calibration_session()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.sensitivity_settings s JOIN public.games g ON g.sensitivity_schema_id = s.schema_id
    WHERE s.id = NEW.setting_id AND g.id = NEW.game_id
  ) THEN
    RAISE EXCEPTION 'Setting % is not part of game %', NEW.setting_id, NEW.game_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER check_calibration_session BEFORE INSERT ON public.calibration_sessions FOR EACH ROW EXECUTE FUNCTION public.check_calibration_session();

CREATE OR REPLACE FUNCTION public.check_calibration_run()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE s record;
BEGIN
  SELECT cs.user_id, st.min_value, st.max_value INTO s
  FROM public.calibration_sessions cs JOIN public.sensitivity_settings st ON st.id = cs.setting_id
  WHERE cs.id = NEW.session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown calibration session'; END IF;
  IF s.user_id <> NEW.user_id THEN RAISE EXCEPTION 'Calibration run does not belong to this session owner'; END IF;
  IF NEW.slider_value < s.min_value OR NEW.slider_value > s.max_value THEN
    RAISE EXCEPTION 'Slider value % is outside % to %', NEW.slider_value, s.min_value, s.max_value;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER check_calibration_run BEFORE INSERT ON public.calibration_runs FOR EACH ROW EXECUTE FUNCTION public.check_calibration_run();

CREATE OR REPLACE FUNCTION public.record_calibration_session(
  _device_id text, _game_id text, _setting_id text, _game_version text,
  _swipe_distance_mm numeric, _conditions jsonb, _runs jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _session uuid; r jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF jsonb_typeof(_runs) <> 'array' OR jsonb_array_length(_runs) = 0 OR jsonb_array_length(_runs) > 200 THEN
    RAISE EXCEPTION 'A session needs between 1 and 200 test results';
  END IF;
  INSERT INTO public.calibration_sessions (user_id, device_id, game_id, game_version, setting_id, swipe_distance_mm, conditions)
  VALUES (_uid, _device_id, _game_id, _game_version, _setting_id, _swipe_distance_mm, coalesce(_conditions, '{}'::jsonb))
  RETURNING id INTO _session;
  FOR r IN SELECT value FROM jsonb_array_elements(_runs) LOOP
    INSERT INTO public.calibration_runs (session_id, user_id, slider_value, repetition_number, swipe_direction, target_movement,
      measured_movement, overshoot, undershoot, instability, time_to_target_ms, device_temperature_c, battery_percent)
    VALUES (_session, _uid, (r->>'slider_value')::numeric, (r->>'repetition_number')::smallint, r->>'swipe_direction',
      (r->>'target_movement')::numeric, (r->>'measured_movement')::numeric, (r->>'overshoot')::numeric, (r->>'undershoot')::numeric,
      (r->>'instability')::numeric, (r->>'time_to_target_ms')::numeric, (r->>'device_temperature_c')::numeric, (r->>'battery_percent')::numeric);
  END LOOP;
  RETURN _session;
END $$;
REVOKE ALL ON FUNCTION public.record_calibration_session(text, text, text, text, numeric, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_calibration_session(text, text, text, text, numeric, jsonb, jsonb) TO authenticated;

CREATE TABLE public.recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid NOT NULL,
  user_id uuid NOT NULL,
  device_id text NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  game_id text NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  game_version text,
  setting_id text NOT NULL REFERENCES public.sensitivity_settings(id) ON DELETE CASCADE,
  recommended_min numeric NOT NULL,
  recommended_max numeric NOT NULL,
  suggested_value numeric NOT NULL,
  confidence text NOT NULL CHECK (confidence IN ('high','medium','low')),
  confidence_score numeric NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  data_completeness numeric NOT NULL CHECK (data_completeness >= 0 AND data_completeness <= 1),
  calibration_status text NOT NULL CHECK (calibration_status IN ('calibrated','stale','insufficient_data','not_calibrated')),
  value_source text NOT NULL CHECK (value_source IN ('calibration','feedback','preliminary')),
  pi_score numeric CHECK (pi_score >= 0 AND pi_score <= 10),
  tdi_score numeric CHECK (tdi_score >= 0 AND tdi_score <= 10),
  factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  model_version_id text NOT NULL REFERENCES public.model_versions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (recommended_min <= suggested_value AND suggested_value <= recommended_max)
);
GRANT SELECT ON public.recommendations TO authenticated;
GRANT ALL ON public.recommendations TO service_role;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players view their own recommendations" ON public.recommendations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX recommendations_user_device_idx ON public.recommendations (user_id, device_id, game_id, setting_id, created_at DESC);
CREATE INDEX recommendations_generation_idx ON public.recommendations (generation_id);

CREATE OR REPLACE FUNCTION public.check_recommendation_row()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE s record;
BEGIN
  SELECT st.min_value, st.max_value INTO s FROM public.sensitivity_settings st JOIN public.games g ON g.sensitivity_schema_id = st.schema_id
  WHERE st.id = NEW.setting_id AND g.id = NEW.game_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Setting % is not part of game %', NEW.setting_id, NEW.game_id; END IF;
  IF NEW.recommended_min < s.min_value OR NEW.recommended_max > s.max_value THEN
    RAISE EXCEPTION 'Recommended range is outside the slider range % to %', s.min_value, s.max_value;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER check_recommendation_row BEFORE INSERT OR UPDATE ON public.recommendations FOR EACH ROW EXECUTE FUNCTION public.check_recommendation_row();

CREATE OR REPLACE FUNCTION public.protect_used_model_version()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (NEW.configuration IS DISTINCT FROM OLD.configuration OR NEW.weights IS DISTINCT FROM OLD.weights
      OR NEW.version IS DISTINCT FROM OLD.version OR NEW.model_name IS DISTINCT FROM OLD.model_name)
     AND EXISTS (SELECT 1 FROM public.recommendations r WHERE r.model_version_id = OLD.id) THEN
    RAISE EXCEPTION 'Model version % already produced recommendations; create a new version instead', OLD.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_used_model_version BEFORE UPDATE ON public.model_versions FOR EACH ROW EXECUTE FUNCTION public.protect_used_model_version();

CREATE TABLE public.feedback_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recommendation_id uuid NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  device_id text NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  game_id text NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  game_version text,
  setting_id text NOT NULL REFERENCES public.sensitivity_settings(id) ON DELETE CASCADE,
  previous_value numeric NOT NULL,
  new_value numeric NOT NULL,
  feedback_type text NOT NULL CHECK (feedback_type IN ('overshooting','undershooting','unstable','too_fast','too_slow','comfortable','accurate')),
  outcome text,
  calibration_session_id uuid REFERENCES public.calibration_sessions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feedback_events TO authenticated;
GRANT ALL ON public.feedback_events TO service_role;
ALTER TABLE public.feedback_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players view their own feedback" ON public.feedback_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX feedback_events_lookup_idx ON public.feedback_events (user_id, device_id, game_id, setting_id, created_at DESC);
CREATE INDEX feedback_events_recommendation_idx ON public.feedback_events (recommendation_id);

CREATE OR REPLACE FUNCTION public.check_feedback_event()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE r record; s record;
BEGIN
  SELECT user_id, setting_id, device_id, game_id INTO r FROM public.recommendations WHERE id = NEW.recommendation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown recommendation'; END IF;
  IF r.user_id <> NEW.user_id OR r.setting_id <> NEW.setting_id OR r.device_id <> NEW.device_id OR r.game_id <> NEW.game_id THEN
    RAISE EXCEPTION 'Feedback does not match its recommendation';
  END IF;
  SELECT min_value, max_value INTO s FROM public.sensitivity_settings WHERE id = NEW.setting_id;
  IF NEW.previous_value < s.min_value OR NEW.previous_value > s.max_value OR NEW.new_value < s.min_value OR NEW.new_value > s.max_value THEN
    RAISE EXCEPTION 'Feedback values must be within % to %', s.min_value, s.max_value;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER check_feedback_event BEFORE INSERT ON public.feedback_events FOR EACH ROW EXECUTE FUNCTION public.check_feedback_event();