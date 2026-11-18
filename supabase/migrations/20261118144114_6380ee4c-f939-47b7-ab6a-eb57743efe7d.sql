CREATE TABLE public.sensitivity_schemas (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  name text NOT NULL,
  unit text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sensitivity_schemas TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sensitivity_schemas TO authenticated;
GRANT ALL ON public.sensitivity_schemas TO service_role;
ALTER TABLE public.sensitivity_schemas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view sensitivity schemas" ON public.sensitivity_schemas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage sensitivity schemas" ON public.sensitivity_schemas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_sensitivity_schemas_updated_at BEFORE UPDATE ON public.sensitivity_schemas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sensitivity_categories (
  id text PRIMARY KEY,
  schema_id text NOT NULL REFERENCES public.sensitivity_schemas(id) ON DELETE CASCADE,
  label text NOT NULL,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  requires_gyro boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schema_id, id)
);
CREATE INDEX sensitivity_categories_schema_idx ON public.sensitivity_categories (schema_id, display_order);
GRANT SELECT ON public.sensitivity_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sensitivity_categories TO authenticated;
GRANT ALL ON public.sensitivity_categories TO service_role;
ALTER TABLE public.sensitivity_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view sensitivity categories" ON public.sensitivity_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage sensitivity categories" ON public.sensitivity_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_sensitivity_categories_updated_at BEFORE UPDATE ON public.sensitivity_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sensitivity_settings (
  id text PRIMARY KEY,
  schema_id text NOT NULL,
  category_id text NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  description text,
  min_value numeric NOT NULL,
  max_value numeric NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  input_kind text NOT NULL DEFAULT 'touch' CHECK (input_kind IN ('touch', 'gyro')),
  core_slot text CHECK (core_slot IS NULL OR core_slot IN ('general', 'redDot', 'scope2x', 'scope4x', 'sniper', 'freeLook')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (min_value < max_value),
  FOREIGN KEY (schema_id, category_id) REFERENCES public.sensitivity_categories (schema_id, id) ON DELETE CASCADE,
  UNIQUE (schema_id, id),
  UNIQUE (category_id, key)
);
CREATE UNIQUE INDEX sensitivity_settings_core_slot_idx ON public.sensitivity_settings (schema_id, core_slot) WHERE core_slot IS NOT NULL;
CREATE INDEX sensitivity_settings_category_idx ON public.sensitivity_settings (category_id, display_order);
GRANT SELECT ON public.sensitivity_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sensitivity_settings TO authenticated;
GRANT ALL ON public.sensitivity_settings TO service_role;
ALTER TABLE public.sensitivity_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view sensitivity settings" ON public.sensitivity_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage sensitivity settings" ON public.sensitivity_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_sensitivity_settings_updated_at BEFORE UPDATE ON public.sensitivity_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.games ADD COLUMN sensitivity_schema_id text REFERENCES public.sensitivity_schemas(id);
ALTER TABLE public.games ADD CONSTRAINT games_id_schema_key UNIQUE (id, sensitivity_schema_id);

CREATE TABLE public.game_sensitivity_profiles (
  game_id text NOT NULL,
  schema_id text NOT NULL,
  setting_id text NOT NULL,
  recommended_value numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, setting_id),
  FOREIGN KEY (game_id, schema_id) REFERENCES public.games (id, sensitivity_schema_id) ON DELETE CASCADE,
  FOREIGN KEY (schema_id, setting_id) REFERENCES public.sensitivity_settings (schema_id, id) ON DELETE CASCADE
);
GRANT SELECT ON public.game_sensitivity_profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.game_sensitivity_profiles TO authenticated;
GRANT ALL ON public.game_sensitivity_profiles TO service_role;
ALTER TABLE public.game_sensitivity_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view game sensitivity profiles" ON public.game_sensitivity_profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage game sensitivity profiles" ON public.game_sensitivity_profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_game_sensitivity_profiles_updated_at BEFORE UPDATE ON public.game_sensitivity_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.check_sensitivity_profile_range()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE s record;
BEGIN
  SELECT min_value, max_value, label INTO s FROM public.sensitivity_settings WHERE id = NEW.setting_id;
  IF NEW.recommended_value < s.min_value OR NEW.recommended_value > s.max_value THEN
    RAISE EXCEPTION 'Value % for "%" is outside the slider range % to %', NEW.recommended_value, s.label, s.min_value, s.max_value;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER check_game_sensitivity_profile_range BEFORE INSERT OR UPDATE ON public.game_sensitivity_profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_sensitivity_profile_range();

INSERT INTO public.sensitivity_schemas (id,name,unit) VALUES
('free-fire','Free Fire sensitivity',''),
('pubg-family','PUBG Mobile / BGMI sensitivity','%');

INSERT INTO public.sensitivity_categories (id,schema_id,label,description,display_order,requires_gyro) VALUES
('free-fire.sensitivity','free-fire','Sensitivity','In game: Settings → Sensitivity. Every slider runs from 0 to 200 — higher turns the camera faster for the same swipe.',1,false),
('pubg-family.camera','pubg-family','Camera','In game: Settings → Sensitivity → Camera Sensitivity. Swipe speed when you are NOT firing — turning, checking corners and lining up a shot.',1,false),
('pubg-family.ads','pubg-family','ADS','In game: Settings → Sensitivity → ADS Sensitivity. Swipe speed WHILE firing. This is what you pull down against recoil, so it matters most for sprays.',2,false),
('pubg-family.gyro','pubg-family','Gyroscope','In game: Settings → Sensitivity → Gyroscope Sensitivity. How far the view moves when you tilt the phone. Works only with Gyroscope set to Scope On or Always On.',3,true),
('pubg-family.ads-gyro','pubg-family','ADS Gyroscope','In game: Settings → Sensitivity → ADS Gyroscope Sensitivity. Tilt speed WHILE firing — gyro players tilt the phone down to control recoil.',4,true),
('pubg-family.free-look','pubg-family','Free Look','In game: Settings → Sensitivity → Camera Sensitivity (Free Look). Moves only the camera while you hold the eye button — your aim stays put. Tune it for comfortable looking around.',5,false);

INSERT INTO public.sensitivity_settings (id,schema_id,category_id,key,label,description,min_value,max_value,display_order,input_kind,core_slot) VALUES
('free-fire.sensitivity.general','free-fire','free-fire.sensitivity','general','General','Camera and aim speed when you’re not scoped in — turning, looking around and close-range drag shots.',0,200,1,'touch','general'),
('free-fire.sensitivity.red-dot','free-fire','free-fire.sensitivity','red-dot','Red Dot','Aim speed with a red dot sight. Higher helps fast close-range tracking; too high overshoots the target.',0,200,2,'touch','redDot'),
('free-fire.sensitivity.scope-2x','free-fire','free-fire.sensitivity','scope-2x','2X Scope','Aim speed through a 2x scope, for steady tracking at medium range.',0,200,3,'touch','scope2x'),
('free-fire.sensitivity.scope-4x','free-fire','free-fire.sensitivity','scope-4x','4X Scope','Aim speed through a 4x scope. Lower values make small corrections easier at long range.',0,200,4,'touch','scope4x'),
('free-fire.sensitivity.sniper','free-fire','free-fire.sensitivity','sniper','Sniper Scope','Aim speed in sniper scopes. Kept lower so you can line up precise long-range shots.',0,200,5,'touch','sniper'),
('free-fire.sensitivity.free-look','free-fire','free-fire.sensitivity','free-look','Free Look','Camera speed while you hold the eye button to look around without moving your aim.',0,200,6,'touch','freeLook'),
('pubg-family.camera.tpp-no-scope','pubg-family','pubg-family.camera','tpp-no-scope','TPP No Scope','Turning speed in third person without a scope — your main look-around speed.',1,300,1,'touch','general'),
('pubg-family.camera.fpp-no-scope','pubg-family','pubg-family.camera','fpp-no-scope','FPP No Scope','Turning speed in first-person mode without a scope.',1,300,2,'touch',NULL),
('pubg-family.camera.tpp-aim','pubg-family','pubg-family.camera','tpp-aim','TPP Aim','Swipe speed while aiming without a scope in third person, before you fire.',1,300,3,'touch',NULL),
('pubg-family.camera.fpp-aim','pubg-family','pubg-family.camera','fpp-aim','FPP Aim','Swipe speed while aiming without a scope in first person, before you fire.',1,300,4,'touch',NULL),
('pubg-family.camera.red-dot','pubg-family','pubg-family.camera','red-dot','Red Dot, Holographic, Aim Assist','Aim speed with close-range sights (red dot, holographic) and iron sights, before you fire.',1,300,5,'touch','redDot'),
('pubg-family.camera.scope-2x','pubg-family','pubg-family.camera','scope-2x','2X Scope','Aim speed with a 2x scope before you start firing.',1,300,6,'touch','scope2x'),
('pubg-family.camera.scope-3x','pubg-family','pubg-family.camera','scope-3x','3X Scope, Win94','Aim speed with a 3x scope and the Win94’s built-in scope.',1,300,7,'touch',NULL),
('pubg-family.camera.scope-4x','pubg-family','pubg-family.camera','scope-4x','4X Scope, VSS','Aim speed with a 4x scope and the VSS’s built-in scope.',1,300,8,'touch','scope4x'),
('pubg-family.camera.scope-6x','pubg-family','pubg-family.camera','scope-6x','6X Scope','Aim speed with a 6x scope. Lower values keep long-range aim steady.',1,300,9,'touch',NULL),
('pubg-family.camera.scope-8x','pubg-family','pubg-family.camera','scope-8x','8X Scope','Aim speed with an 8x scope for sniping. Kept low for precise shots.',1,300,10,'touch','sniper'),
('pubg-family.ads.tpp-no-scope','pubg-family','pubg-family.ads','tpp-no-scope','TPP No Scope','Aim speed while hip-firing in third person.',1,300,1,'touch',NULL),
('pubg-family.ads.fpp-no-scope','pubg-family','pubg-family.ads','fpp-no-scope','FPP No Scope','Aim speed while hip-firing in first person.',1,300,2,'touch',NULL),
('pubg-family.ads.tpp-aim','pubg-family','pubg-family.ads','tpp-aim','TPP Aim','Swipe speed while firing when aiming without a scope in third person.',1,300,3,'touch',NULL),
('pubg-family.ads.fpp-aim','pubg-family','pubg-family.ads','fpp-aim','FPP Aim','Swipe speed while firing when aiming without a scope in first person.',1,300,4,'touch',NULL),
('pubg-family.ads.red-dot','pubg-family','pubg-family.ads','red-dot','Red Dot, Holographic, Aim Assist','Recoil control while firing with a red dot, holographic or iron sight.',1,300,5,'touch',NULL),
('pubg-family.ads.scope-2x','pubg-family','pubg-family.ads','scope-2x','2X Scope','Recoil control while firing with a 2x scope.',1,300,6,'touch',NULL),
('pubg-family.ads.scope-3x','pubg-family','pubg-family.ads','scope-3x','3X Scope, Win94','Recoil control while firing with a 3x scope or Win94.',1,300,7,'touch',NULL),
('pubg-family.ads.scope-4x','pubg-family','pubg-family.ads','scope-4x','4X Scope, VSS','Recoil control while firing with a 4x scope or VSS. Lower makes sprays easier to hold.',1,300,8,'touch',NULL),
('pubg-family.ads.scope-6x','pubg-family','pubg-family.ads','scope-6x','6X Scope','Recoil control while firing with a 6x scope.',1,300,9,'touch',NULL),
('pubg-family.ads.scope-8x','pubg-family','pubg-family.ads','scope-8x','8X Scope','Recoil control while firing with an 8x scope.',1,300,10,'touch',NULL),
('pubg-family.gyro.tpp-no-scope','pubg-family','pubg-family.gyro','tpp-no-scope','TPP No Scope','Tilt-aim speed in third person without a scope (used with Always On).',1,400,1,'gyro',NULL),
('pubg-family.gyro.fpp-no-scope','pubg-family','pubg-family.gyro','fpp-no-scope','FPP No Scope','Tilt-aim speed in first person without a scope (used with Always On).',1,400,2,'gyro',NULL),
('pubg-family.gyro.tpp-aim','pubg-family','pubg-family.gyro','tpp-aim','TPP Aim','Tilt speed while aiming without a scope in third person, before you fire.',1,400,3,'gyro',NULL),
('pubg-family.gyro.fpp-aim','pubg-family','pubg-family.gyro','fpp-aim','FPP Aim','Tilt speed while aiming without a scope in first person, before you fire.',1,400,4,'gyro',NULL),
('pubg-family.gyro.red-dot','pubg-family','pubg-family.gyro','red-dot','Red Dot, Holographic, Aim Assist','Tilt-aim speed with a red dot, holographic or iron sight.',1,400,5,'gyro',NULL),
('pubg-family.gyro.scope-2x','pubg-family','pubg-family.gyro','scope-2x','2X Scope','Tilt-aim speed with a 2x scope.',1,400,6,'gyro',NULL),
('pubg-family.gyro.scope-3x','pubg-family','pubg-family.gyro','scope-3x','3X Scope, Win94','Tilt-aim speed with a 3x scope or Win94.',1,400,7,'gyro',NULL),
('pubg-family.gyro.scope-4x','pubg-family','pubg-family.gyro','scope-4x','4X Scope, VSS','Tilt-aim speed with a 4x scope or VSS.',1,400,8,'gyro',NULL),
('pubg-family.gyro.scope-6x','pubg-family','pubg-family.gyro','scope-6x','6X Scope','Tilt-aim speed with a 6x scope.',1,400,9,'gyro',NULL),
('pubg-family.gyro.scope-8x','pubg-family','pubg-family.gyro','scope-8x','8X Scope','Tilt-aim speed with an 8x scope.',1,400,10,'gyro',NULL),
('pubg-family.ads-gyro.tpp-no-scope','pubg-family','pubg-family.ads-gyro','tpp-no-scope','TPP No Scope','Tilt recoil control while hip-firing in third person.',1,400,1,'gyro',NULL),
('pubg-family.ads-gyro.fpp-no-scope','pubg-family','pubg-family.ads-gyro','fpp-no-scope','FPP No Scope','Tilt recoil control while hip-firing in first person.',1,400,2,'gyro',NULL),
('pubg-family.ads-gyro.tpp-aim','pubg-family','pubg-family.ads-gyro','tpp-aim','TPP Aim','Tilt speed while firing when aiming without a scope in third person.',1,400,3,'gyro',NULL),
('pubg-family.ads-gyro.fpp-aim','pubg-family','pubg-family.ads-gyro','fpp-aim','FPP Aim','Tilt speed while firing when aiming without a scope in first person.',1,400,4,'gyro',NULL),
('pubg-family.ads-gyro.red-dot','pubg-family','pubg-family.ads-gyro','red-dot','Red Dot, Holographic, Aim Assist','Tilt recoil control while firing with a red dot, holographic or iron sight.',1,400,5,'gyro',NULL),
('pubg-family.ads-gyro.scope-2x','pubg-family','pubg-family.ads-gyro','scope-2x','2X Scope','Tilt recoil control while firing with a 2x scope.',1,400,6,'gyro',NULL),
('pubg-family.ads-gyro.scope-3x','pubg-family','pubg-family.ads-gyro','scope-3x','3X Scope, Win94','Tilt recoil control while firing with a 3x scope or Win94.',1,400,7,'gyro',NULL),
('pubg-family.ads-gyro.scope-4x','pubg-family','pubg-family.ads-gyro','scope-4x','4X Scope, VSS','Tilt recoil control while firing with a 4x scope or VSS.',1,400,8,'gyro',NULL),
('pubg-family.ads-gyro.scope-6x','pubg-family','pubg-family.ads-gyro','scope-6x','6X Scope','Tilt recoil control while firing with a 6x scope.',1,400,9,'gyro',NULL),
('pubg-family.ads-gyro.scope-8x','pubg-family','pubg-family.ads-gyro','scope-8x','8X Scope','Tilt recoil control while firing with an 8x scope.',1,400,10,'gyro',NULL),
('pubg-family.free-look.tpp','pubg-family','pubg-family.free-look','tpp','TPP Camera (Character, Vehicle)','Eye-button camera speed in third person, on foot or in a vehicle.',1,300,1,'touch','freeLook'),
('pubg-family.free-look.fpp','pubg-family','pubg-family.free-look','fpp','FPP Camera (Character)','Eye-button camera speed in first-person mode.',1,300,2,'touch',NULL),
('pubg-family.free-look.parachuting','pubg-family','pubg-family.free-look','parachuting','Camera (Parachuting)','Camera speed while skydiving and parachuting, to scan for landing spots and enemies.',1,300,3,'touch',NULL);

UPDATE public.games SET sensitivity_schema_id = 'free-fire', config = '{"extras": ["fireButton"]}'::jsonb WHERE id = 'free-fire';
UPDATE public.games SET sensitivity_schema_id = 'pubg-family', config = '{"extras": ["gyroMode"]}'::jsonb WHERE id = 'bgmi';
UPDATE public.games SET sensitivity_schema_id = 'pubg-family', config = '{"extras": ["gyroMode"]}'::jsonb WHERE id = 'pubg-mobile';

INSERT INTO public.game_sensitivity_profiles (game_id,schema_id,setting_id,recommended_value) VALUES
('free-fire','free-fire','free-fire.sensitivity.general',178),
('free-fire','free-fire','free-fire.sensitivity.red-dot',182),
('free-fire','free-fire','free-fire.sensitivity.scope-2x',164),
('free-fire','free-fire','free-fire.sensitivity.scope-4x',146),
('free-fire','free-fire','free-fire.sensitivity.sniper',102),
('free-fire','free-fire','free-fire.sensitivity.free-look',96),
('bgmi','pubg-family','pubg-family.camera.tpp-no-scope',118),
('pubg-mobile','pubg-family','pubg-family.camera.tpp-no-scope',124),
('bgmi','pubg-family','pubg-family.camera.fpp-no-scope',106),
('pubg-mobile','pubg-family','pubg-family.camera.fpp-no-scope',110),
('bgmi','pubg-family','pubg-family.camera.tpp-aim',109),
('pubg-mobile','pubg-family','pubg-family.camera.tpp-aim',114),
('bgmi','pubg-family','pubg-family.camera.fpp-aim',94),
('pubg-mobile','pubg-family','pubg-family.camera.fpp-aim',98),
('bgmi','pubg-family','pubg-family.camera.red-dot',55),
('pubg-mobile','pubg-family','pubg-family.camera.red-dot',58),
('bgmi','pubg-family','pubg-family.camera.scope-2x',36),
('pubg-mobile','pubg-family','pubg-family.camera.scope-2x',38),
('bgmi','pubg-family','pubg-family.camera.scope-3x',28),
('pubg-mobile','pubg-family','pubg-family.camera.scope-3x',28),
('bgmi','pubg-family','pubg-family.camera.scope-4x',17),
('pubg-mobile','pubg-family','pubg-family.camera.scope-4x',18),
('bgmi','pubg-family','pubg-family.camera.scope-6x',13),
('pubg-mobile','pubg-family','pubg-family.camera.scope-6x',14),
('bgmi','pubg-family','pubg-family.camera.scope-8x',10),
('pubg-mobile','pubg-family','pubg-family.camera.scope-8x',11),
('bgmi','pubg-family','pubg-family.ads.tpp-no-scope',118),
('pubg-mobile','pubg-family','pubg-family.ads.tpp-no-scope',122),
('bgmi','pubg-family','pubg-family.ads.fpp-no-scope',106),
('pubg-mobile','pubg-family','pubg-family.ads.fpp-no-scope',108),
('bgmi','pubg-family','pubg-family.ads.tpp-aim',109),
('pubg-mobile','pubg-family','pubg-family.ads.tpp-aim',112),
('bgmi','pubg-family','pubg-family.ads.fpp-aim',94),
('pubg-mobile','pubg-family','pubg-family.ads.fpp-aim',96),
('bgmi','pubg-family','pubg-family.ads.red-dot',58),
('pubg-mobile','pubg-family','pubg-family.ads.red-dot',58),
('bgmi','pubg-family','pubg-family.ads.scope-2x',36),
('pubg-mobile','pubg-family','pubg-family.ads.scope-2x',39),
('bgmi','pubg-family','pubg-family.ads.scope-3x',28),
('pubg-mobile','pubg-family','pubg-family.ads.scope-3x',29),
('bgmi','pubg-family','pubg-family.ads.scope-4x',17),
('pubg-mobile','pubg-family','pubg-family.ads.scope-4x',19),
('bgmi','pubg-family','pubg-family.ads.scope-6x',13),
('pubg-mobile','pubg-family','pubg-family.ads.scope-6x',14),
('bgmi','pubg-family','pubg-family.ads.scope-8x',10),
('pubg-mobile','pubg-family','pubg-family.ads.scope-8x',11),
('bgmi','pubg-family','pubg-family.gyro.tpp-no-scope',250),
('pubg-mobile','pubg-family','pubg-family.gyro.tpp-no-scope',250),
('bgmi','pubg-family','pubg-family.gyro.fpp-no-scope',235),
('pubg-mobile','pubg-family','pubg-family.gyro.fpp-no-scope',235),
('bgmi','pubg-family','pubg-family.gyro.tpp-aim',230),
('pubg-mobile','pubg-family','pubg-family.gyro.tpp-aim',230),
('bgmi','pubg-family','pubg-family.gyro.fpp-aim',209),
('pubg-mobile','pubg-family','pubg-family.gyro.fpp-aim',209),
('bgmi','pubg-family','pubg-family.gyro.red-dot',248),
('pubg-mobile','pubg-family','pubg-family.gyro.red-dot',248),
('bgmi','pubg-family','pubg-family.gyro.scope-2x',212),
('pubg-mobile','pubg-family','pubg-family.gyro.scope-2x',212),
('bgmi','pubg-family','pubg-family.gyro.scope-3x',178),
('pubg-mobile','pubg-family','pubg-family.gyro.scope-3x',178),
('bgmi','pubg-family','pubg-family.gyro.scope-4x',152),
('pubg-mobile','pubg-family','pubg-family.gyro.scope-4x',152),
('bgmi','pubg-family','pubg-family.gyro.scope-6x',88),
('pubg-mobile','pubg-family','pubg-family.gyro.scope-6x',88),
('bgmi','pubg-family','pubg-family.gyro.scope-8x',62),
('pubg-mobile','pubg-family','pubg-family.gyro.scope-8x',62),
('bgmi','pubg-family','pubg-family.ads-gyro.tpp-no-scope',250),
('pubg-mobile','pubg-family','pubg-family.ads-gyro.tpp-no-scope',250),
('bgmi','pubg-family','pubg-family.ads-gyro.fpp-no-scope',235),
('pubg-mobile','pubg-family','pubg-family.ads-gyro.fpp-no-scope',235),
('bgmi','pubg-family','pubg-family.ads-gyro.tpp-aim',230),
('pubg-mobile','pubg-family','pubg-family.ads-gyro.tpp-aim',230),
('bgmi','pubg-family','pubg-family.ads-gyro.fpp-aim',209),
('pubg-mobile','pubg-family','pubg-family.ads-gyro.fpp-aim',209),
('bgmi','pubg-family','pubg-family.ads-gyro.red-dot',248),
('pubg-mobile','pubg-family','pubg-family.ads-gyro.red-dot',248),
('bgmi','pubg-family','pubg-family.ads-gyro.scope-2x',212),
('pubg-mobile','pubg-family','pubg-family.ads-gyro.scope-2x',212),
('bgmi','pubg-family','pubg-family.ads-gyro.scope-3x',178),
('pubg-mobile','pubg-family','pubg-family.ads-gyro.scope-3x',178),
('bgmi','pubg-family','pubg-family.ads-gyro.scope-4x',152),
('pubg-mobile','pubg-family','pubg-family.ads-gyro.scope-4x',152),
('bgmi','pubg-family','pubg-family.ads-gyro.scope-6x',88),
('pubg-mobile','pubg-family','pubg-family.ads-gyro.scope-6x',88),
('bgmi','pubg-family','pubg-family.ads-gyro.scope-8x',62),
('pubg-mobile','pubg-family','pubg-family.ads-gyro.scope-8x',62),
('bgmi','pubg-family','pubg-family.free-look.tpp',122),
('pubg-mobile','pubg-family','pubg-family.free-look.tpp',125),
('bgmi','pubg-family','pubg-family.free-look.fpp',84),
('pubg-mobile','pubg-family','pubg-family.free-look.fpp',88),
('bgmi','pubg-family','pubg-family.free-look.parachuting',122),
('pubg-mobile','pubg-family','pubg-family.free-look.parachuting',120);