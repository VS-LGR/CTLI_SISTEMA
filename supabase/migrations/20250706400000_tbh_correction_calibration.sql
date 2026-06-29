-- TBH linear correction calibration points (RE-6.4E)
ALTER TABLE public.environment_sensor_certificates
  ADD COLUMN IF NOT EXISTS tbh_correction_calibration jsonb NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.environment_sensor_certificates.tbh_correction_calibration IS
  'Pontos de calibração por grandeza: { temperature, humidity, pressure } → { points: [{ device, supplier }] }';
