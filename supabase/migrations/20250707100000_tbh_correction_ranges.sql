-- TBH: tbh_correction_calibration passa a suportar faixas por grandeza.
-- Estrutura jsonb evoluída (sem alteração de coluna):
--   { "temperature": { "ranges": [{ "label", "min", "max", "points": [{device, supplier}] }] } }
-- Dados legados com { "points": [...] } são migrados em runtime via normalizeTbhCorrectionCalibration.

COMMENT ON COLUMN public.environment_sensor_certificates.tbh_correction_calibration IS
  'Calibração TBH por grandeza e faixa: ranges[].{label,min,max,points}. Legado points[] migrado em runtime.';
