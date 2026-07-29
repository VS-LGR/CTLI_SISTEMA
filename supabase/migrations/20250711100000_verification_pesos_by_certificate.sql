-- Remapeia linked_asset_ids de verificação de pesos:
-- de standard_weight_items → weight_standard_certificates (conjuntos).

DO $$
DECLARE
  rec record;
  old_ids uuid[];
  new_ids uuid[];
  mapped uuid;
BEGIN
  FOR rec IN
    SELECT id, tenant_id, linked_asset_ids
    FROM public.equipment_verifications
    WHERE equipment_kind = 'pesos'
      AND cardinality(linked_asset_ids) > 0
  LOOP
    old_ids := rec.linked_asset_ids;
    new_ids := ARRAY[]::uuid[];

    SELECT COALESCE(array_agg(DISTINCT c.id), ARRAY[]::uuid[])
    INTO new_ids
    FROM unnest(old_ids) AS oid(id)
    LEFT JOIN public.standard_weight_items wi
      ON wi.id = oid.id AND wi.tenant_id = rec.tenant_id
    LEFT JOIN public.weight_standard_certificates c
      ON c.id = COALESCE(wi.weight_certificate_id, oid.id)
     AND c.tenant_id = rec.tenant_id
    WHERE c.id IS NOT NULL;

    -- Se já eram IDs de certificado, mantém os que existirem
    IF cardinality(new_ids) = 0 THEN
      SELECT COALESCE(array_agg(c.id), ARRAY[]::uuid[])
      INTO new_ids
      FROM unnest(old_ids) AS oid(id)
      INNER JOIN public.weight_standard_certificates c
        ON c.id = oid.id AND c.tenant_id = rec.tenant_id;
    END IF;

    UPDATE public.equipment_verifications
    SET linked_asset_ids = COALESCE(new_ids, ARRAY[]::uuid[]),
        updated_at = now()
    WHERE id = rec.id;
  END LOOP;
END $$;
