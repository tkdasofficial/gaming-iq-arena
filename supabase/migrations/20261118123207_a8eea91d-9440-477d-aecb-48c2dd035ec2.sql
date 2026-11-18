-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Shared updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Player',
  email text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- New user: create profile; bootstrap admin for the owner's verified email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email, avatar_url)
  VALUES (
    NEW.id,
    left(coalesce(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(coalesce(NEW.email, ''), '@', 1),
      'Player'
    ), 80),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  IF lower(NEW.email) = 'tusharkantidasofficial@gmail.com' AND NEW.email_confirmed_at IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Email-first sign-in helper
CREATE OR REPLACE FUNCTION public.email_has_account(_email text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth
AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(trim(_email)))
$$;
REVOKE ALL ON FUNCTION public.email_has_account(text) FROM public;
GRANT EXECUTE ON FUNCTION public.email_has_account(text) TO anon, authenticated;

-- Saved setups
CREATE TABLE public.saved_setups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  game text NOT NULL,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  sliders jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX saved_setups_owner_idx ON public.saved_setups(owner_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_setups TO authenticated;
GRANT ALL ON public.saved_setups TO service_role;
ALTER TABLE public.saved_setups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their saved setups" ON public.saved_setups
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER update_saved_setups_updated_at BEFORE UPDATE ON public.saved_setups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Custom devices
CREATE TABLE public.custom_devices (
  owner_id uuid NOT NULL,
  id text NOT NULL,
  device jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_devices TO authenticated;
GRANT ALL ON public.custom_devices TO service_role;
ALTER TABLE public.custom_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their custom devices" ON public.custom_devices
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER update_custom_devices_updated_at BEFORE UPDATE ON public.custom_devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Aim lab runs
CREATE TABLE public.aim_lab_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  game text NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  misses integer NOT NULL DEFAULT 0,
  accuracy integer NOT NULL DEFAULT 0,
  avg_reaction_ms integer,
  best_streak integer NOT NULL DEFAULT 0,
  scalar numeric(4,2) NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX aim_lab_runs_owner_idx ON public.aim_lab_runs(owner_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.aim_lab_runs TO authenticated;
GRANT ALL ON public.aim_lab_runs TO service_role;
ALTER TABLE public.aim_lab_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their aim lab runs" ON public.aim_lab_runs
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Community presets
CREATE TABLE public.presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  author_name text NOT NULL DEFAULT 'Player',
  visibility text NOT NULL DEFAULT 'public',
  name text NOT NULL,
  player_archetype text NOT NULL DEFAULT 'Custom Loadout',
  game text NOT NULL,
  claw text NOT NULL,
  playstyle text NOT NULL,
  gyro text NOT NULL,
  device jsonb NOT NULL DEFAULT '{}'::jsonb,
  headline_metric text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  sliders jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX presets_visibility_idx ON public.presets(visibility, created_at DESC);
GRANT SELECT ON public.presets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presets TO authenticated;
GRANT ALL ON public.presets TO service_role;
ALTER TABLE public.presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view public presets" ON public.presets
  FOR SELECT TO anon, authenticated USING (visibility = 'public');
CREATE POLICY "Authors can view their own presets" ON public.presets
  FOR SELECT TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Players publish their own presets" ON public.presets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors update their own presets" ON public.presets
  FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors or admins delete presets" ON public.presets
  FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_presets_updated_at BEFORE UPDATE ON public.presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Phone catalog (public read, admin write)
CREATE TABLE public.brands (
  id text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.chipsets (
  id text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.devices (
  id text PRIMARY KEY,
  brand_id text NOT NULL DEFAULT '',
  release_date text NOT NULL DEFAULT '',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX devices_brand_idx ON public.devices(brand_id);
CREATE TABLE public.game_compatibility (
  id text PRIMARY KEY,
  device_id text NOT NULL DEFAULT '',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX game_compat_device_idx ON public.game_compatibility(device_id);

GRANT SELECT ON public.brands, public.chipsets, public.devices, public.game_compatibility TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands, public.chipsets, public.devices, public.game_compatibility TO authenticated;
GRANT ALL ON public.brands, public.chipsets, public.devices, public.game_compatibility TO service_role;

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chipsets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_compatibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view brands" ON public.brands FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage brands" ON public.brands FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view chipsets" ON public.chipsets FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage chipsets" ON public.chipsets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view devices" ON public.devices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage devices" ON public.devices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view game compatibility" ON public.game_compatibility FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage game compatibility" ON public.game_compatibility FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chipsets_updated_at BEFORE UPDATE ON public.chipsets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON public.devices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_game_compat_updated_at BEFORE UPDATE ON public.game_compatibility FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();