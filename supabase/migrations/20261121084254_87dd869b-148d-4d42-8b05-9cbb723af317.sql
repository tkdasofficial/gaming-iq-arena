ALTER TABLE public.device_user_calibrations
  ALTER COLUMN zero_sensitivity_rotation DROP NOT NULL,
  ADD COLUMN general_200_rotation numeric CHECK (general_200_rotation > 0 AND general_200_rotation <= 99.9);

ALTER TABLE public.general_sensitivity_calculation_logs
  ALTER COLUMN zero_sensitivity_rotation DROP NOT NULL,
  ALTER COLUMN predicted_rotation DROP NOT NULL,
  ALTER COLUMN maximum_predicted_rotation DROP NOT NULL,
  ADD COLUMN general_200_rotation numeric CHECK (general_200_rotation > 0),
  ADD COLUMN scope_factor numeric,
  ADD COLUMN raw_values jsonb,
  ADD COLUMN final_values jsonb;

UPDATE public.general_sensitivity_config SET is_active = false WHERE id = 'free-fire-rotation-v1';