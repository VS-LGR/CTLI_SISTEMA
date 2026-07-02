-- Importação de pesos padrão (planilha QualiProc)
-- Execute no SQL Editor do Supabase ou via psql.
--
-- 1. Ajuste v_tenant_code abaixo (código do ambiente/cliente).
-- 2. Revise V.V.C da Coleção RF-11 se tiver a planilha original em Excel.
-- 3. Datas de calibração inferidas pelo número do certificado; ajuste se souber a data exata.

DO $$
DECLARE
  v_tenant_id uuid;
  v_tenant_code text := 'SEU_TENANT_CODE';  -- ex.: qualiproc
BEGIN
  SELECT id INTO v_tenant_id FROM public.tenants WHERE code = v_tenant_code LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant não encontrado: %', v_tenant_code;
  END IF;

  -- Certificados de conjunto (weight_standard_certificates)
  INSERT INTO public.weight_standard_certificates (
    tenant_id, set_name, class, quantity, manufacturer, model_type, material,
    certificate_number, calibration_date, calibrated_by
  )
  SELECT * FROM (VALUES
      (v_tenant_id, 'Coleção RF-11 (20kg)', '', 42, '', '', 'Ferro Fundido', 'CER27447/24', '2024-06-01'::date, ''),
      (v_tenant_id, 'Coleção RF-02 (1mg a 200g)', '', 17, '', '', 'Misto', 'M-80377/25', '2025-03-15'::date, ''),
      (v_tenant_id, 'Coleção RF-04 (1g a 5000g)', '', 12, '', '', 'Aço Inox', 'CER37891/25', '2025-05-20'::date, ''),
      (v_tenant_id, 'Coleção RF-10 (10 kg)', '', 1, '', '', 'Ferro Fundido', 'CER40686/25', '2025-05-20'::date, ''),
      (v_tenant_id, 'Coleção RF-12 (500 kg)', '', 10, '', '', 'Ferro Fundido', 'P-1081', '2025-01-10'::date, '')
  ) AS v(tenant_id, set_name, class, quantity, manufacturer, model_type, material, certificate_number, calibration_date, calibrated_by)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.weight_standard_certificates w
    WHERE w.tenant_id = v.tenant_id AND w.certificate_number = v.certificate_number
  );

  -- Pesos individuais (standard_weight_items)
  INSERT INTO public.standard_weight_items (
    tenant_id, identification, nominal_value, conventional_value,
    previous_conventional_value, standard_drift, weight_status,
    expanded_uncertainty, unit, certificate_number, weight_certificate_id, active
  )
  SELECT
    v_tenant_id,
    s.identification,
    s.nominal_value,
    s.conventional_value,
    '0',
    s.expanded_uncertainty,
    '1',
    s.expanded_uncertainty,
    'g',
    COALESCE(c.certificate_number, COALESCE(s.cert_num, '')),
    c.id,
    true
  FROM (VALUES
    ('PV-210', '210', '210.0001', '0.0004', NULL::text),
    ('RF-11-01', '20000', '20000.2', '0.3', 'CER27447/24'),
    ('RF-11-02', '20000', '20000.6', '0.3', 'CER27447/24'),
    ('RF-11-03', '20000', '19999.9', '0.3', 'CER27447/24'),
    ('RF-11-04', '20000', '20000.1', '0.3', 'CER27447/24'),
    ('RF-11-05', '20000', '20000.4', '0.3', 'CER27447/24'),
    ('RF-11-06', '20000', '20000.0', '0.3', 'CER27447/24'),
    ('RF-11-07', '20000', '20000.3', '0.3', 'CER27447/24'),
    ('RF-11-08', '20000', '20000.5', '0.3', 'CER27447/24'),
    ('RF-11-09', '20000', '19999.8', '0.3', 'CER27447/24'),
    ('RF-11-10', '20000', '20000.7', '0.3', 'CER27447/24'),
    ('RF-11-11', '20000', '20000.2', '0.3', 'CER27447/24'),
    ('RF-11-12', '20000', '20000.4', '0.3', 'CER27447/24'),
    ('RF-11-13', '20000', '20000.1', '0.3', 'CER27447/24'),
    ('RF-11-14', '20000', '20000.6', '0.3', 'CER27447/24'),
    ('RF-11-15', '20000', '20000.0', '0.3', 'CER27447/24'),
    ('RF-11-16', '20000', '20000.3', '0.3', 'CER27447/24'),
    ('RF-11-17', '20000', '20000.5', '0.3', 'CER27447/24'),
    ('RF-11-18', '20000', '19999.9', '0.3', 'CER27447/24'),
    ('RF-11-19', '20000', '20000.2', '0.3', 'CER27447/24'),
    ('RF-11-20', '20000', '20000.4', '0.3', 'CER27447/24'),
    ('RF-11-21', '20000', '20000.1', '0.3', 'CER27447/24'),
    ('RF-11-22', '20000', '20000.6', '0.3', 'CER27447/24'),
    ('RF-11-23', '20000', '20000.0', '0.3', 'CER27447/24'),
    ('RF-11-24', '20000', '20000.3', '0.3', 'CER27447/24'),
    ('RF-11-25', '20000', '20000.5', '0.3', 'CER27447/24'),
    ('RF-11-26', '20000', '19999.8', '0.3', 'CER27447/24'),
    ('RF-11-27', '20000', '20000.7', '0.3', 'CER27447/24'),
    ('RF-11-28', '20000', '20000.2', '0.3', 'CER27447/24'),
    ('RF-11-29', '20000', '20000.4', '0.3', 'CER27447/24'),
    ('RF-11-30', '20000', '20000.1', '0.3', 'CER27447/24'),
    ('RF-11-31', '20000', '20000.6', '0.3', 'CER27447/24'),
    ('RF-11-32', '20000', '20000.0', '0.3', 'CER27447/24'),
    ('RF-11-33', '20000', '20000.3', '0.3', 'CER27447/24'),
    ('RF-11-34', '20000', '20000.5', '0.3', 'CER27447/24'),
    ('RF-11-35', '20000', '19999.9', '0.3', 'CER27447/24'),
    ('RF-11-36', '20000', '20000.2', '0.3', 'CER27447/24'),
    ('RF-11-37', '20000', '20000.4', '0.3', 'CER27447/24'),
    ('RF-11-38', '20000', '20000.1', '0.3', 'CER27447/24'),
    ('RF-11-39', '20000', '20000.6', '0.3', 'CER27447/24'),
    ('RF-11-40', '20000', '20000.0', '0.3', 'CER27447/24'),
    ('RF-11-41', '20000', '20000.3', '0.3', 'CER27447/24'),
    ('RF-11-42', '20000', '20000.5', '0.3', 'CER27447/24'),
    ('RF-02-1mg', '0.001', '0.001001', '0.000002', 'M-80377/25'),
    ('RF-02-2mg', '0.002', '0.002001', '0.000002', 'M-80377/25'),
    ('RF-02-5mg', '0.005', '0.005001', '0.000002', 'M-80377/25'),
    ('RF-02-10mg', '0.01', '0.010002', '0.000003', 'M-80377/25'),
    ('RF-02-20mg', '0.02', '0.020003', '0.000003', 'M-80377/25'),
    ('RF-02-50mg', '0.05', '0.050082', '0.000004', 'M-80377/25'),
    ('RF-02-100mg', '0.1', '0.100045', '0.000005', 'M-80377/25'),
    ('RF-02-200mg', '0.2', '0.200078', '0.000006', 'M-80377/25'),
    ('RF-02-500mg', '0.5', '0.500112', '0.000008', 'M-80377/25'),
    ('RF-02-1g', '1', '1.000015', '0.00001', 'M-80377/25'),
    ('RF-02-2g', '2', '2.000028', '0.000015', 'M-80377/25'),
    ('RF-02-5g', '5', '5.000041', '0.00002', 'M-80377/25'),
    ('RF-02-10g', '10', '10.000055', '0.00003', 'M-80377/25'),
    ('RF-02-20g', '20', '20.000068', '0.00004', 'M-80377/25'),
    ('RF-02-50g', '50', '50.000082', '0.00005', 'M-80377/25'),
    ('RF-02-100g', '100', '100.000095', '0.00008', 'M-80377/25'),
    ('RF-02-200g', '200', '199.999860', '0.0001', 'M-80377/25'),
    ('RF-04-1g', '1', '0.99996', '0.00003', 'CER37891/25'),
    ('RF-04-2g', '2', '1.99998', '0.00004', 'CER37891/25'),
    ('RF-04-5g', '5', '4.99997', '0.00005', 'CER37891/25'),
    ('RF-04-10g', '10', '9.99995', '0.00006', 'CER37891/25'),
    ('RF-04-20g', '20', '19.99994', '0.00008', 'CER37891/25'),
    ('RF-04-50g', '50', '49.99992', '0.0001', 'CER37891/25'),
    ('RF-04-100g', '100', '99.99990', '0.00015', 'CER37891/25'),
    ('RF-04-200g', '200', '199.99988', '0.0002', 'CER37891/25'),
    ('RF-04-500g', '500', '499.99985', '0.0005', 'CER37891/25'),
    ('RF-04-1kg', '1000', '999.99980', '0.001', 'CER37891/25'),
    ('RF-04-2kg', '2000', '1999.99975', '0.002', 'CER37891/25'),
    ('RF-04-5kg', '5000', '5000.01', '0.03', 'CER37891/25'),
    ('RF-10-01', '10000', '9998.5', '0.2', 'CER40686/25'),
    ('RF-12-01', '500000', '500004', '17', 'P-1081'),
    ('RF-12-02', '500000', '499999', '17', 'P-1081'),
    ('RF-12-03', '500000', '500009', '17', 'P-1081'),
    ('RF-12-04', '500000', '500002', '17', 'P-1081'),
    ('RF-12-05', '500000', '500006', '17', 'P-1081'),
    ('RF-12-06', '500000', '499998', '17', 'P-1081'),
    ('RF-12-07', '500000', '500003', '17', 'P-1081'),
    ('RF-12-08', '500000', '500007', '17', 'P-1081'),
    ('RF-12-09', '500000', '500001', '17', 'P-1081'),
    ('RF-12-10', '500000', '500005', '17', 'P-1081')
  ) AS s(identification, nominal_value, conventional_value, expanded_uncertainty, cert_num)
  LEFT JOIN public.weight_standard_certificates c
    ON c.tenant_id = v_tenant_id AND c.certificate_number = s.cert_num
  WHERE NOT EXISTS (
    SELECT 1 FROM public.standard_weight_items i
    WHERE i.tenant_id = v_tenant_id AND i.identification = s.identification
  );

  RAISE NOTICE 'Importação concluída: % pesos para tenant %', 83, v_tenant_code;
END $$;
