CREATE INDEX IF NOT EXISTS game_sensitivity_profiles_game_schema_idx ON public.game_sensitivity_profiles (game_id, schema_id);
CREATE INDEX IF NOT EXISTS game_sensitivity_profiles_schema_setting_idx ON public.game_sensitivity_profiles (schema_id, setting_id);
CREATE INDEX IF NOT EXISTS games_sensitivity_schema_idx ON public.games (sensitivity_schema_id);
CREATE INDEX IF NOT EXISTS sensitivity_settings_schema_category_idx ON public.sensitivity_settings (schema_id, category_id);