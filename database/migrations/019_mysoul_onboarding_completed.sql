ALTER TABLE public.mysouls
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;