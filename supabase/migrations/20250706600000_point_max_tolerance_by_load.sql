-- Atualiza documentação: tolerâncias por valor de pesagem (V.R.), não por P1–P10
COMMENT ON COLUMN public.scale_registrations.point_max_tolerances IS
  'Tolerância máxima |E+U| por pesagem: [{ nominal_value, unit, max_tolerance }, ...]. Legado: { point, value }.';
