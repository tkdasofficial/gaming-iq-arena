CREATE TABLE public.general_sensitivity_config (
  id text PRIMARY KEY,
  game_id text NOT NULL REFERENCES public.games(id),
  target_rotation numeric NOT NULL,
  minimum_sensitivity integer NOT NULL DEFAULT 0,
  maximum_sensitivity integer NOT NULL DEFAULT 200,
  calculation_model text NOT NULL DEFAULT 'linear',
  gain_per_point numeric NOT NULL DEFAULT 0.01,
  configuration_version text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.general_sensitivity_config TO anon, authenticated;
GRANT ALL ON public.general_sensitivity_config TO service_role;
ALTER TABLE public.general_sensitivity_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read the active rotation config" ON public.general_sensitivity_config FOR SELECT USING (is_active);
CREATE POLICY "Admins can manage the rotation config" ON public.general_sensitivity_config FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_general_sensitivity_config_updated_at BEFORE UPDATE ON public.general_sensitivity_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.device_user_calibrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  device_id text NOT NULL REFERENCES public.devices(id),
  game_id text NOT NULL REFERENCES public.games(id),
  device_age_range text NOT NULL CHECK (device_age_range IN ('under-6-months','6-12-months','1-2-years','2-3-years','over-3-years')),
  zero_sensitivity_rotation numeric NOT NULL CHECK (zero_sensitivity_rotation > 0 AND zero_sensitivity_rotation <= 99.9),
  repetition_count smallint,
  measurement_method text,
  game_version text,
  confidence_level text NOT NULL DEFAULT 'user-reported',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id, game_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_user_calibrations TO authenticated;
GRANT ALL ON public.device_user_calibrations TO service_role;
ALTER TABLE public.device_user_calibrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players manage their own calibrations" ON public.device_user_calibrations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_device_user_calibrations_updated_at BEFORE UPDATE ON public.device_user_calibrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.device_rotation_measurements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id text NOT NULL REFERENCES public.devices(id),
  game_id text NOT NULL REFERENCES public.games(id),
  game_version text,
  sensitivity_value integer NOT NULL CHECK (sensitivity_value BETWEEN 0 AND 200),
  rotation_value numeric NOT NULL CHECK (rotation_value > 0),
  swipe_protocol text,
  repetition_count smallint,
  median_rotation numeric,
  measurement_source text NOT NULL,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('verified','pending','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.device_rotation_measurements TO anon, authenticated;
GRANT ALL ON public.device_rotation_measurements TO service_role;
ALTER TABLE public.device_rotation_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read verified rotation measurements" ON public.device_rotation_measurements FOR SELECT USING (verification_status = 'verified');
CREATE POLICY "Admins can manage rotation measurements" ON public.device_rotation_measurements FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.component_quality_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id text NOT NULL REFERENCES public.devices(id),
  component_id text NOT NULL,
  benchmark_value numeric,
  benchmark_unit text,
  benchmark_source text NOT NULL,
  benchmark_type text NOT NULL DEFAULT 'measured',
  data_confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (device_id, component_id, benchmark_source)
);
GRANT SELECT ON public.component_quality_profiles TO anon, authenticated;
GRANT ALL ON public.component_quality_profiles TO service_role;
ALTER TABLE public.component_quality_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read component quality profiles" ON public.component_quality_profiles FOR SELECT USING (true);
CREATE POLICY "Admins can manage component quality profiles" ON public.component_quality_profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_component_quality_profiles_updated_at BEFORE UPDATE ON public.component_quality_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.component_point_rules (
  id text PRIMARY KEY,
  component_id text NOT NULL,
  minimum_benchmark numeric NOT NULL,
  maximum_benchmark numeric NOT NULL,
  minimum_point integer NOT NULL DEFAULT 1 CHECK (minimum_point >= 1),
  maximum_point integer NOT NULL DEFAULT 200 CHECK (maximum_point <= 200),
  importance_weight numeric NOT NULL DEFAULT 1,
  normalization_method text NOT NULL DEFAULT 'linear-inverse' CHECK (normalization_method IN ('linear-inverse','linear')),
  is_enabled boolean NOT NULL DEFAULT true,
  rule_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.component_point_rules TO anon, authenticated;
GRANT ALL ON public.component_point_rules TO service_role;
ALTER TABLE public.component_point_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read component point rules" ON public.component_point_rules FOR SELECT USING (true);
CREATE POLICY "Admins can manage component point rules" ON public.component_point_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_component_point_rules_updated_at BEFORE UPDATE ON public.component_point_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.general_sensitivity_calculation_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  device_id text NOT NULL REFERENCES public.devices(id),
  game_id text NOT NULL REFERENCES public.games(id),
  calibration_id uuid REFERENCES public.device_user_calibrations(id),
  calculation_version text NOT NULL,
  zero_sensitivity_rotation numeric NOT NULL,
  target_rotation numeric NOT NULL,
  raw_recommended_sensitivity numeric NOT NULL,
  final_recommended_sensitivity integer NOT NULL,
  predicted_rotation numeric NOT NULL,
  maximum_predicted_rotation numeric NOT NULL,
  component_contribution jsonb,
  calculation_status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.general_sensitivity_calculation_logs TO authenticated;
GRANT ALL ON public.general_sensitivity_calculation_logs TO service_role;
ALTER TABLE public.general_sensitivity_calculation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players can read their own calculation logs" ON public.general_sensitivity_calculation_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);

INSERT INTO public.general_sensitivity_config (id, game_id, target_rotation, minimum_sensitivity, maximum_sensitivity, calculation_model, gain_per_point, configuration_version, is_active)
VALUES ('free-fire-rotation-v1', 'free-fire', 14, 0, 200, 'linear', 0.01, 'rotation-v1', true);

INSERT INTO public.component_point_rules (id, component_id, minimum_benchmark, maximum_benchmark, minimum_point, maximum_point, importance_weight, normalization_method, is_enabled, rule_version) VALUES
  ('points-v1.cpu-single', 'cpu_single', 300, 3000, 1, 200, 1, 'linear-inverse', true, 'points-v1'),
  ('points-v1.cpu-multi', 'cpu_multi', 1000, 10000, 1, 200, 1, 'linear-inverse', true, 'points-v1'),
  ('points-v1.gpu', 'gpu', 500, 15000, 1, 200, 1, 'linear-inverse', true, 'points-v1'),
  ('points-v1.ram', 'ram_gb', 2, 24, 1, 200, 0.5, 'linear-inverse', true, 'points-v1'),
  ('points-v1.fps', 'fps', 30, 120, 1, 200, 1.5, 'linear-inverse', true, 'points-v1'),
  ('points-v1.frame-stability', 'frame_stability', 50, 100, 1, 200, 1.5, 'linear-inverse', true, 'points-v1'),
  ('points-v1.thermal', 'thermal_stability', 40, 100, 1, 200, 1, 'linear-inverse', true, 'points-v1'),
  ('points-v1.touch-sampling', 'touch_sampling', 60, 1000, 1, 200, 1, 'linear-inverse', true, 'points-v1'),
  ('points-v1.touch-latency', 'touch_latency', 10, 150, 1, 200, 1.5, 'linear', true, 'points-v1'),
  ('points-v1.input-consistency', 'input_consistency', 1, 30, 1, 200, 1, 'linear', true, 'points-v1'),
  ('points-v1.touch-controller', 'touch_controller', 1, 10, 1, 200, 0.5, 'linear-inverse', true, 'points-v1'),
  ('points-v1.touchscreen-accuracy', 'touchscreen_accuracy', 50, 100, 1, 200, 1, 'linear-inverse', true, 'points-v1'),
  ('points-v1.refresh-rate', 'refresh_rate', 60, 185, 1, 200, 1, 'linear-inverse', true, 'points-v1'),
  ('points-v1.screen-geometry', 'screen_geometry', 5, 8, 1, 200, 0.5, 'linear-inverse', true, 'points-v1'),
  ('points-v1.swipe-consistency', 'swipe_consistency', 50, 100, 1, 200, 1, 'linear-inverse', true, 'points-v1');