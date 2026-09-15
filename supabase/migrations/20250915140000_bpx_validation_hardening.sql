-- CC-011 — Endurecimento para ensaio de validação (CTLI).
-- RBAC servidor em proposta/pessoal; REVOKE de emit/approve a anon/PUBLIC;
-- trilha em proposta/cargo; registo de migrações P0 já materializadas.

-- ---------------------------------------------------------------------------
-- 1. Helpers alinhados a src/lib/roles.js
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_access_proposals()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u public.profiles%ROWTYPE;
BEGIN
  IF NOT public.profile_is_enabled() THEN RETURN false; END IF;
  SELECT * INTO u FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RETURN false; END IF;
  IF public.has_active_acl() THEN
    RETURN public.acl_allows_module('propostas');
  END IF;
  RETURN u.role IN ('admin', 'client', 'gerente_geral', 'gerente_tecnico', 'administrativo_vendas');
END;
$$;

CREATE OR REPLACE FUNCTION public.can_edit_proposals()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_access_proposals();
$$;

CREATE OR REPLACE FUNCTION public.can_access_personnel()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u public.profiles%ROWTYPE;
BEGIN
  IF NOT public.profile_is_enabled() THEN RETURN false; END IF;
  SELECT * INTO u FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RETURN false; END IF;
  IF public.has_active_acl() THEN
    RETURN public.acl_allows_module('pessoal');
  END IF;
  RETURN u.role IN ('admin', 'client', 'gerente_geral', 'gerente_qualidade', 'gerente_tecnico');
END;
$$;

CREATE OR REPLACE FUNCTION public.can_edit_personnel()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_access_personnel();
$$;

GRANT EXECUTE ON FUNCTION public.can_access_proposals() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_proposals() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_personnel() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_personnel() TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. RLS propostas
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "cp_select" ON public.commercial_proposals;
CREATE POLICY "cp_select" ON public.commercial_proposals FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_access_proposals());
DROP POLICY IF EXISTS "cp_insert" ON public.commercial_proposals;
CREATE POLICY "cp_insert" ON public.commercial_proposals FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id) AND public.can_edit_proposals());
DROP POLICY IF EXISTS "cp_update" ON public.commercial_proposals;
CREATE POLICY "cp_update" ON public.commercial_proposals FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_edit_proposals())
  WITH CHECK (public.cadastro_tenant_access(tenant_id) AND public.can_edit_proposals());
DROP POLICY IF EXISTS "cp_delete" ON public.commercial_proposals;
CREATE POLICY "cp_delete" ON public.commercial_proposals FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_edit_proposals());

DROP POLICY IF EXISTS "cps_select" ON public.commercial_proposal_scales;
CREATE POLICY "cps_select" ON public.commercial_proposal_scales FOR SELECT
  USING (public.cadastro_tenant_access(public.commercial_proposal_tenant_from_child(proposal_id)) AND public.can_access_proposals());
DROP POLICY IF EXISTS "cps_insert" ON public.commercial_proposal_scales;
CREATE POLICY "cps_insert" ON public.commercial_proposal_scales FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(public.commercial_proposal_tenant_from_child(proposal_id)) AND public.can_edit_proposals());
DROP POLICY IF EXISTS "cps_update" ON public.commercial_proposal_scales;
CREATE POLICY "cps_update" ON public.commercial_proposal_scales FOR UPDATE
  USING (public.cadastro_tenant_access(public.commercial_proposal_tenant_from_child(proposal_id)) AND public.can_edit_proposals())
  WITH CHECK (public.cadastro_tenant_access(public.commercial_proposal_tenant_from_child(proposal_id)) AND public.can_edit_proposals());
DROP POLICY IF EXISTS "cps_delete" ON public.commercial_proposal_scales;
CREATE POLICY "cps_delete" ON public.commercial_proposal_scales FOR DELETE
  USING (public.cadastro_tenant_access(public.commercial_proposal_tenant_from_child(proposal_id)) AND public.can_edit_proposals());

DROP POLICY IF EXISTS "cpcp_select" ON public.commercial_proposal_calibration_points;
CREATE POLICY "cpcp_select" ON public.commercial_proposal_calibration_points FOR SELECT
  USING (public.cadastro_tenant_access(public.commercial_proposal_scale_tenant_from_child(scale_id)) AND public.can_access_proposals());
DROP POLICY IF EXISTS "cpcp_insert" ON public.commercial_proposal_calibration_points;
CREATE POLICY "cpcp_insert" ON public.commercial_proposal_calibration_points FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(public.commercial_proposal_scale_tenant_from_child(scale_id)) AND public.can_edit_proposals());
DROP POLICY IF EXISTS "cpcp_update" ON public.commercial_proposal_calibration_points;
CREATE POLICY "cpcp_update" ON public.commercial_proposal_calibration_points FOR UPDATE
  USING (public.cadastro_tenant_access(public.commercial_proposal_scale_tenant_from_child(scale_id)) AND public.can_edit_proposals())
  WITH CHECK (public.cadastro_tenant_access(public.commercial_proposal_scale_tenant_from_child(scale_id)) AND public.can_edit_proposals());
DROP POLICY IF EXISTS "cpcp_delete" ON public.commercial_proposal_calibration_points;
CREATE POLICY "cpcp_delete" ON public.commercial_proposal_calibration_points FOR DELETE
  USING (public.cadastro_tenant_access(public.commercial_proposal_scale_tenant_from_child(scale_id)) AND public.can_edit_proposals());

DROP POLICY IF EXISTS "cpwi_select" ON public.commercial_proposal_weight_items;
CREATE POLICY "cpwi_select" ON public.commercial_proposal_weight_items FOR SELECT
  USING (public.cadastro_tenant_access(public.commercial_proposal_tenant_from_child(proposal_id)) AND public.can_access_proposals());
DROP POLICY IF EXISTS "cpwi_insert" ON public.commercial_proposal_weight_items;
CREATE POLICY "cpwi_insert" ON public.commercial_proposal_weight_items FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(public.commercial_proposal_tenant_from_child(proposal_id)) AND public.can_edit_proposals());
DROP POLICY IF EXISTS "cpwi_update" ON public.commercial_proposal_weight_items;
CREATE POLICY "cpwi_update" ON public.commercial_proposal_weight_items FOR UPDATE
  USING (public.cadastro_tenant_access(public.commercial_proposal_tenant_from_child(proposal_id)) AND public.can_edit_proposals())
  WITH CHECK (public.cadastro_tenant_access(public.commercial_proposal_tenant_from_child(proposal_id)) AND public.can_edit_proposals());
DROP POLICY IF EXISTS "cpwi_delete" ON public.commercial_proposal_weight_items;
CREATE POLICY "cpwi_delete" ON public.commercial_proposal_weight_items FOR DELETE
  USING (public.cadastro_tenant_access(public.commercial_proposal_tenant_from_child(proposal_id)) AND public.can_edit_proposals());

-- ---------------------------------------------------------------------------
-- 3. RLS pessoal
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "pso_select" ON public.personnel_standard_options;
CREATE POLICY "pso_select" ON public.personnel_standard_options FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_access_personnel());
DROP POLICY IF EXISTS "pso_insert" ON public.personnel_standard_options;
CREATE POLICY "pso_insert" ON public.personnel_standard_options FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id) AND public.can_edit_personnel());
DROP POLICY IF EXISTS "pso_update" ON public.personnel_standard_options;
CREATE POLICY "pso_update" ON public.personnel_standard_options FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_edit_personnel())
  WITH CHECK (public.cadastro_tenant_access(tenant_id) AND public.can_edit_personnel());
DROP POLICY IF EXISTS "pso_delete" ON public.personnel_standard_options;
CREATE POLICY "pso_delete" ON public.personnel_standard_options FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_edit_personnel());

DROP POLICY IF EXISTS "pp_select" ON public.personnel_positions;
CREATE POLICY "pp_select" ON public.personnel_positions FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_access_personnel());
DROP POLICY IF EXISTS "pp_insert" ON public.personnel_positions;
CREATE POLICY "pp_insert" ON public.personnel_positions FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id) AND public.can_edit_personnel());
DROP POLICY IF EXISTS "pp_update" ON public.personnel_positions;
CREATE POLICY "pp_update" ON public.personnel_positions FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_edit_personnel())
  WITH CHECK (public.cadastro_tenant_access(tenant_id) AND public.can_edit_personnel());
DROP POLICY IF EXISTS "pp_delete" ON public.personnel_positions;
CREATE POLICY "pp_delete" ON public.personnel_positions FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_edit_personnel());

DROP POLICY IF EXISTS "pca_select" ON public.personnel_competency_adequacies;
CREATE POLICY "pca_select" ON public.personnel_competency_adequacies FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_access_personnel());
DROP POLICY IF EXISTS "pca_insert" ON public.personnel_competency_adequacies;
CREATE POLICY "pca_insert" ON public.personnel_competency_adequacies FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id) AND public.can_edit_personnel());
DROP POLICY IF EXISTS "pca_update" ON public.personnel_competency_adequacies;
CREATE POLICY "pca_update" ON public.personnel_competency_adequacies FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_edit_personnel())
  WITH CHECK (public.cadastro_tenant_access(tenant_id) AND public.can_edit_personnel());
DROP POLICY IF EXISTS "pca_delete" ON public.personnel_competency_adequacies;
CREATE POLICY "pca_delete" ON public.personnel_competency_adequacies FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_edit_personnel());

DROP POLICY IF EXISTS "pm_select" ON public.personnel_monitorings;
CREATE POLICY "pm_select" ON public.personnel_monitorings FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_access_personnel());
DROP POLICY IF EXISTS "pm_insert" ON public.personnel_monitorings;
CREATE POLICY "pm_insert" ON public.personnel_monitorings FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id) AND public.can_edit_personnel());
DROP POLICY IF EXISTS "pm_update" ON public.personnel_monitorings;
CREATE POLICY "pm_update" ON public.personnel_monitorings FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_edit_personnel())
  WITH CHECK (public.cadastro_tenant_access(tenant_id) AND public.can_edit_personnel());
DROP POLICY IF EXISTS "pm_delete" ON public.personnel_monitorings;
CREATE POLICY "pm_delete" ON public.personnel_monitorings FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_edit_personnel());

DROP POLICY IF EXISTS "pee_select" ON public.personnel_experience_evaluations;
CREATE POLICY "pee_select" ON public.personnel_experience_evaluations FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_access_personnel());
DROP POLICY IF EXISTS "pee_insert" ON public.personnel_experience_evaluations;
CREATE POLICY "pee_insert" ON public.personnel_experience_evaluations FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id) AND public.can_edit_personnel());
DROP POLICY IF EXISTS "pee_update" ON public.personnel_experience_evaluations;
CREATE POLICY "pee_update" ON public.personnel_experience_evaluations FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_edit_personnel())
  WITH CHECK (public.cadastro_tenant_access(tenant_id) AND public.can_edit_personnel());
DROP POLICY IF EXISTS "pee_delete" ON public.personnel_experience_evaluations;
CREATE POLICY "pee_delete" ON public.personnel_experience_evaluations FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_edit_personnel());

DROP POLICY IF EXISTS "peei_select" ON public.personnel_experience_evaluation_items;
CREATE POLICY "peei_select" ON public.personnel_experience_evaluation_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.personnel_experience_evaluations e
    WHERE e.id = evaluation_id AND public.cadastro_tenant_access(e.tenant_id)
  ) AND public.can_access_personnel());
DROP POLICY IF EXISTS "peei_insert" ON public.personnel_experience_evaluation_items;
CREATE POLICY "peei_insert" ON public.personnel_experience_evaluation_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.personnel_experience_evaluations e
    WHERE e.id = evaluation_id AND public.cadastro_tenant_access(e.tenant_id)
  ) AND public.can_edit_personnel());
DROP POLICY IF EXISTS "peei_update" ON public.personnel_experience_evaluation_items;
CREATE POLICY "peei_update" ON public.personnel_experience_evaluation_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.personnel_experience_evaluations e
    WHERE e.id = evaluation_id AND public.cadastro_tenant_access(e.tenant_id)
  ) AND public.can_edit_personnel())
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.personnel_experience_evaluations e
    WHERE e.id = evaluation_id AND public.cadastro_tenant_access(e.tenant_id)
  ) AND public.can_edit_personnel());
DROP POLICY IF EXISTS "peei_delete" ON public.personnel_experience_evaluation_items;
CREATE POLICY "peei_delete" ON public.personnel_experience_evaluation_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.personnel_experience_evaluations e
    WHERE e.id = evaluation_id AND public.cadastro_tenant_access(e.tenant_id)
  ) AND public.can_edit_personnel());

DROP POLICY IF EXISTS "ps_select" ON public.personnel_selections;
CREATE POLICY "ps_select" ON public.personnel_selections FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_access_personnel());
DROP POLICY IF EXISTS "ps_insert" ON public.personnel_selections;
CREATE POLICY "ps_insert" ON public.personnel_selections FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id) AND public.can_edit_personnel());
DROP POLICY IF EXISTS "ps_update" ON public.personnel_selections;
CREATE POLICY "ps_update" ON public.personnel_selections FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_edit_personnel())
  WITH CHECK (public.cadastro_tenant_access(tenant_id) AND public.can_edit_personnel());
DROP POLICY IF EXISTS "ps_delete" ON public.personnel_selections;
CREATE POLICY "ps_delete" ON public.personnel_selections FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_edit_personnel());

DROP POLICY IF EXISTS "pal_select" ON public.personnel_attendance_lists;
CREATE POLICY "pal_select" ON public.personnel_attendance_lists FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_access_personnel());
DROP POLICY IF EXISTS "pal_insert" ON public.personnel_attendance_lists;
CREATE POLICY "pal_insert" ON public.personnel_attendance_lists FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id) AND public.can_edit_personnel());
DROP POLICY IF EXISTS "pal_update" ON public.personnel_attendance_lists;
CREATE POLICY "pal_update" ON public.personnel_attendance_lists FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_edit_personnel())
  WITH CHECK (public.cadastro_tenant_access(tenant_id) AND public.can_edit_personnel());
DROP POLICY IF EXISTS "pal_delete" ON public.personnel_attendance_lists;
CREATE POLICY "pal_delete" ON public.personnel_attendance_lists FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_edit_personnel());

DROP POLICY IF EXISTS "pap_select" ON public.personnel_attendance_participants;
CREATE POLICY "pap_select" ON public.personnel_attendance_participants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.personnel_attendance_lists l
    WHERE l.id = attendance_list_id AND public.cadastro_tenant_access(l.tenant_id)
  ) AND public.can_access_personnel());
DROP POLICY IF EXISTS "pap_insert" ON public.personnel_attendance_participants;
CREATE POLICY "pap_insert" ON public.personnel_attendance_participants FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.personnel_attendance_lists l
    WHERE l.id = attendance_list_id AND public.cadastro_tenant_access(l.tenant_id)
  ) AND public.can_edit_personnel());
DROP POLICY IF EXISTS "pap_update" ON public.personnel_attendance_participants;
CREATE POLICY "pap_update" ON public.personnel_attendance_participants FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.personnel_attendance_lists l
    WHERE l.id = attendance_list_id AND public.cadastro_tenant_access(l.tenant_id)
  ) AND public.can_edit_personnel())
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.personnel_attendance_lists l
    WHERE l.id = attendance_list_id AND public.cadastro_tenant_access(l.tenant_id)
  ) AND public.can_edit_personnel());
DROP POLICY IF EXISTS "pap_delete" ON public.personnel_attendance_participants;
CREATE POLICY "pap_delete" ON public.personnel_attendance_participants FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.personnel_attendance_lists l
    WHERE l.id = attendance_list_id AND public.cadastro_tenant_access(l.tenant_id)
  ) AND public.can_edit_personnel());

-- ---------------------------------------------------------------------------
-- 4. Trilha em proposta e cargo (evidência QO)
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_audit_commercial_proposals ON public.commercial_proposals;
CREATE TRIGGER trg_audit_commercial_proposals
  AFTER INSERT OR DELETE OR UPDATE ON public.commercial_proposals
  FOR EACH ROW EXECUTE FUNCTION public.bpx_audit_row_change();

DROP TRIGGER IF EXISTS trg_audit_personnel_positions ON public.personnel_positions;
CREATE TRIGGER trg_audit_personnel_positions
  AFTER INSERT OR DELETE OR UPDATE ON public.personnel_positions
  FOR EACH ROW EXECUTE FUNCTION public.bpx_audit_row_change();

-- ---------------------------------------------------------------------------
-- 5. Superfície das RPCs críticas (authenticated only)
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.emit_calibration_certificate(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.emit_weight_calibration_certificate(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_calibration_certificates(uuid[], uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_weight_calibration_certificates(uuid[], uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.emit_calibration_certificate(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.emit_weight_calibration_certificate(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_calibration_certificates(uuid[], uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_weight_calibration_certificates(uuid[], uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Inventário: registar P0 já aplicada fora do histórico CLI
-- ---------------------------------------------------------------------------

INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
SELECT '20250915120000', 'bpx_electronic_controls', ARRAY[]::text[]
WHERE NOT EXISTS (
  SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20250915120000'
);
