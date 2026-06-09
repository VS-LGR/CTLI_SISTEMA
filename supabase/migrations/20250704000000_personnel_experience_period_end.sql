-- RE-6.2B — Data final do período de experiência (admissão + 3 meses)

ALTER TABLE public.personnel_experience_evaluations
  ADD COLUMN IF NOT EXISTS period_end_date date;

UPDATE public.personnel_experience_evaluations
SET period_end_date = (admission_date + interval '3 months')::date
WHERE admission_date IS NOT NULL
  AND period_end_date IS NULL;
