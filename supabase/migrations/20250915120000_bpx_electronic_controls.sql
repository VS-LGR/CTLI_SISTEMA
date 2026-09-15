-- P0 controlos eletrónicos BPx (REQ-F-ER): papéis no servidor, lock de emitido,
-- audit trail old/new, contas lógicas, lockout, aceite legal reforçado, retenção backup.

-- ---------------------------------------------------------------------------
-- 1. Perfil: desativação, senha provisória, lockout, privacidade
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_disabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS failed_login_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until timestamptz NULL,
  ADD COLUMN IF NOT EXISTS privacy_accepted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS privacy_accepted_version text NULL;

COMMENT ON COLUMN public.profiles.is_disabled IS
  'Desativação lógica (REQ-F-ER). Conta não é apagada; UUID não é reutilizado.';
COMMENT ON COLUMN public.profiles.must_change_password IS
  'Obrigatório trocar senha provisória no primeiro acesso.';
COMMENT ON COLUMN public.profiles.failed_login_count IS
  'Falhas consecutivas de login; bloqueio após 3.';
COMMENT ON COLUMN public.profiles.locked_until IS
  'Fim do bloqueio por tentativas falhadas.';
COMMENT ON COLUMN public.profiles.privacy_accepted_at IS
  'Aceite da política de privacidade (LGPD).';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_acl jsonb;
  meta_coleta boolean;
  meta_cert boolean;
BEGIN
  meta_acl := COALESCE(NEW.raw_user_meta_data->'access_acl', '{}'::jsonb);
  IF jsonb_typeof(meta_acl) <> 'object' THEN
    meta_acl := '{}'::jsonb;
  END IF;
  meta_coleta := COALESCE((NEW.raw_user_meta_data->>'access_coleta')::boolean, false);
  meta_cert := COALESCE((NEW.raw_user_meta_data->>'access_certificados')::boolean, false);

  INSERT INTO public.profiles (
    id, email, full_name, role, tenant_id,
    access_coleta, access_certificados, access_acl, must_change_password
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'gerente_qualidade'),
    (NULLIF(NEW.raw_user_meta_data->>'tenant_id', ''))::uuid,
    meta_coleta,
    meta_cert,
    meta_acl,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    tenant_id = EXCLUDED.tenant_id,
    access_coleta = EXCLUDED.access_coleta,
    access_certificados = EXCLUDED.access_certificados,
    access_acl = CASE
      WHEN (EXCLUDED.access_acl ? 'version') THEN EXCLUDED.access_acl
      ELSE public.profiles.access_acl
    END,
    updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Helpers de papel / ACL / sessão
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bpx_allow_locked_update()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(nullif(current_setting('bpx.allow_locked_update', true), ''), '0') = '1';
$$;

CREATE OR REPLACE FUNCTION public.profile_is_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND COALESCE(p.is_disabled, false) = false
      AND (p.locked_until IS NULL OR p.locked_until < now())
  );
$$;

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role FROM public.profiles p WHERE p.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.has_active_acl()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.access_acl IS NOT NULL
      AND jsonb_typeof(p.access_acl) = 'object'
      AND COALESCE((p.access_acl->>'version')::int, 0) = 1
  );
$$;

CREATE OR REPLACE FUNCTION public.acl_allows_module(p_mod text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.access_acl IS NOT NULL
      AND COALESCE((p.access_acl->>'version')::int, 0) = 1
      AND COALESCE(p.access_acl->'modules', '[]'::jsonb) ? p_mod
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_coleta()
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
    RETURN public.acl_allows_module('coleta');
  END IF;
  IF u.role IN ('admin', 'client', 'gerente_geral', 'tecnico_campo') THEN RETURN true; END IF;
  IF u.role IN ('signatario', 'diretor', 'administrativo_compras') THEN RETURN false; END IF;
  IF u.role IN ('gerente_qualidade', 'gerente_tecnico', 'administrativo_vendas') THEN
    RETURN COALESCE(u.access_coleta, false);
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_edit_coleta()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_access_coleta()
    AND COALESCE(public.current_profile_role(), '') NOT IN ('signatario', 'diretor');
$$;

CREATE OR REPLACE FUNCTION public.can_access_certificates()
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
    RETURN public.acl_allows_module('certificados');
  END IF;
  IF u.role IN ('tecnico_campo', 'diretor', 'administrativo_compras') THEN RETURN false; END IF;
  IF u.role IN ('admin', 'client', 'gerente_geral', 'signatario') THEN RETURN true; END IF;
  IF u.role IN ('gerente_qualidade', 'gerente_tecnico', 'administrativo_vendas') THEN
    RETURN COALESCE(u.access_certificados, false);
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_edit_certificates()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r text;
BEGIN
  IF NOT public.can_access_certificates() THEN RETURN false; END IF;
  r := public.current_profile_role();
  IF r IN ('signatario', 'tecnico_campo', 'diretor') THEN RETURN false; END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_approve_certificates()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.profile_is_enabled()
    AND public.current_profile_role() IN ('admin', 'client', 'gerente_geral', 'signatario');
$$;

CREATE OR REPLACE FUNCTION public.can_emit_certificates()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_edit_certificates();
$$;

CREATE OR REPLACE FUNCTION public.can_manage_master_documents()
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
    RETURN public.acl_allows_module('lista_mestra');
  END IF;
  RETURN u.role IN ('admin', 'client', 'gerente_geral', 'gerente_qualidade');
END;
$$;

CREATE OR REPLACE FUNCTION public.certificate_status_is_locked(p_status text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_status IN ('aprovado', 'emitido', 'enviado', 'substituido', 'cancelado', 'obsoleto');
$$;

CREATE OR REPLACE FUNCTION public.legal_acceptance_ok()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.legal_accepted_at IS NOT NULL
      AND p.privacy_accepted_at IS NOT NULL
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. Audit trail imutável
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.record_audit_trail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants (id) ON DELETE RESTRICT,
  table_name text NOT NULL,
  record_id uuid,
  operation text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  field_name text NOT NULL DEFAULT '',
  old_value text,
  new_value text,
  actor_id uuid,
  actor_role text NOT NULL DEFAULT '',
  origin text NOT NULL DEFAULT '',
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_record_audit_trail_tenant_time
  ON public.record_audit_trail (tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_record_audit_trail_record
  ON public.record_audit_trail (table_name, record_id);

ALTER TABLE public.record_audit_trail ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS record_audit_trail_select ON public.record_audit_trail;
CREATE POLICY record_audit_trail_select ON public.record_audit_trail
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (public.cadastro_tenant_access(tenant_id) AND public.can_manage_master_documents())
  );

DROP POLICY IF EXISTS record_audit_trail_no_mod ON public.record_audit_trail;
CREATE POLICY record_audit_trail_no_insert ON public.record_audit_trail
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY record_audit_trail_no_update ON public.record_audit_trail
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY record_audit_trail_no_delete ON public.record_audit_trail
  FOR DELETE TO authenticated USING (false);

CREATE OR REPLACE FUNCTION public.bpx_audit_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  oldj jsonb := '{}'::jsonb;
  newj jsonb := '{}'::jsonb;
  k text;
  tid uuid;
  rid uuid;
  skip text[] := ARRAY['updated_at', 'updated_by', 'created_at'];
  origin text;
BEGIN
  origin := COALESCE(current_setting('request.headers', true), '');
  IF TG_OP = 'DELETE' THEN
    oldj := to_jsonb(OLD);
    tid := CASE WHEN oldj ? 'tenant_id' THEN (oldj->>'tenant_id')::uuid ELSE NULL END;
    rid := CASE WHEN oldj ? 'id' THEN (oldj->>'id')::uuid ELSE NULL END;
  ELSIF TG_OP = 'INSERT' THEN
    newj := to_jsonb(NEW);
    tid := CASE WHEN newj ? 'tenant_id' THEN (newj->>'tenant_id')::uuid ELSE NULL END;
    rid := CASE WHEN newj ? 'id' THEN (newj->>'id')::uuid ELSE NULL END;
  ELSE
    oldj := to_jsonb(OLD);
    newj := to_jsonb(NEW);
    tid := CASE WHEN newj ? 'tenant_id' THEN (newj->>'tenant_id')::uuid ELSE NULL END;
    rid := CASE WHEN newj ? 'id' THEN (newj->>'id')::uuid ELSE NULL END;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.record_audit_trail (
      tenant_id, table_name, record_id, operation, field_name, old_value, new_value,
      actor_id, actor_role, origin
    ) VALUES (
      tid, TG_TABLE_NAME, rid, TG_OP, '*', NULL, left(newj::text, 4000),
      auth.uid(), COALESCE(public.current_profile_role(), ''), left(origin, 500)
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.record_audit_trail (
      tenant_id, table_name, record_id, operation, field_name, old_value, new_value,
      actor_id, actor_role, origin
    ) VALUES (
      tid, TG_TABLE_NAME, rid, TG_OP, '*', left(oldj::text, 4000), NULL,
      auth.uid(), COALESCE(public.current_profile_role(), ''), left(origin, 500)
    );
    RETURN OLD;
  END IF;

  FOR k IN SELECT jsonb_object_keys(oldj || newj)
  LOOP
    IF k = ANY (skip) THEN CONTINUE; END IF;
    IF (oldj -> k) IS DISTINCT FROM (newj -> k) THEN
      INSERT INTO public.record_audit_trail (
        tenant_id, table_name, record_id, operation, field_name, old_value, new_value,
        actor_id, actor_role, origin
      ) VALUES (
        tid, TG_TABLE_NAME, rid, 'UPDATE', k,
        left(COALESCE(oldj ->> k, (oldj -> k)::text), 2000),
        left(COALESCE(newj ->> k, (newj -> k)::text), 2000),
        auth.uid(), COALESCE(public.current_profile_role(), ''), left(origin, 500)
      );
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_calibration_certificates ON public.calibration_certificates;
CREATE TRIGGER trg_audit_calibration_certificates
  AFTER INSERT OR UPDATE OR DELETE ON public.calibration_certificates
  FOR EACH ROW EXECUTE FUNCTION public.bpx_audit_row_change();

DROP TRIGGER IF EXISTS trg_audit_weight_certificates ON public.weight_calibration_certificates;
CREATE TRIGGER trg_audit_weight_certificates
  AFTER INSERT OR UPDATE OR DELETE ON public.weight_calibration_certificates
  FOR EACH ROW EXECUTE FUNCTION public.bpx_audit_row_change();

DROP TRIGGER IF EXISTS trg_audit_scale_collections ON public.scale_calibration_collections;
CREATE TRIGGER trg_audit_scale_collections
  AFTER INSERT OR UPDATE OR DELETE ON public.scale_calibration_collections
  FOR EACH ROW EXECUTE FUNCTION public.bpx_audit_row_change();

DROP TRIGGER IF EXISTS trg_audit_weight_collections ON public.weight_calibration_collections;
CREATE TRIGGER trg_audit_weight_collections
  AFTER INSERT OR UPDATE OR DELETE ON public.weight_calibration_collections
  FOR EACH ROW EXECUTE FUNCTION public.bpx_audit_row_change();

DROP TRIGGER IF EXISTS trg_audit_tenant_documents ON public.tenant_documents;
CREATE TRIGGER trg_audit_tenant_documents
  AFTER INSERT OR UPDATE OR DELETE ON public.tenant_documents
  FOR EACH ROW EXECUTE FUNCTION public.bpx_audit_row_change();

-- ---------------------------------------------------------------------------
-- 4. Lock de certificado / coleta no banco
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bpx_prevent_locked_certificate_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.bpx_allow_locked_update() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF public.certificate_status_is_locked(OLD.status) OR COALESCE(OLD.status, '') <> 'obsoleto' THEN
      RAISE EXCEPTION 'Exclusão física de certificado bloqueada (REQ-F-ER-006). Use estado obsoleto.';
    END IF;
    RETURN OLD;
  END IF;
  IF public.certificate_status_is_locked(OLD.status) THEN
    RAISE EXCEPTION 'Certificado em estado % é imutável no servidor.', OLD.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_calibration_certificates ON public.calibration_certificates;
CREATE TRIGGER trg_lock_calibration_certificates
  BEFORE UPDATE OR DELETE ON public.calibration_certificates
  FOR EACH ROW EXECUTE FUNCTION public.bpx_prevent_locked_certificate_update();

DROP TRIGGER IF EXISTS trg_lock_weight_certificates ON public.weight_calibration_certificates;
CREATE TRIGGER trg_lock_weight_certificates
  BEFORE UPDATE OR DELETE ON public.weight_calibration_certificates
  FOR EACH ROW EXECUTE FUNCTION public.bpx_prevent_locked_certificate_update();

CREATE OR REPLACE FUNCTION public.bpx_prevent_locked_cert_child()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  st text;
  cid uuid;
BEGIN
  IF public.bpx_allow_locked_update() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  cid := COALESCE(NEW.certificate_id, OLD.certificate_id);
  IF TG_TABLE_NAME LIKE 'weight_%' THEN
    SELECT status INTO st FROM public.weight_calibration_certificates WHERE id = cid;
  ELSE
    SELECT status INTO st FROM public.calibration_certificates WHERE id = cid;
  END IF;
  IF public.certificate_status_is_locked(st) THEN
    RAISE EXCEPTION 'Filhos de certificado % não podem ser alterados.', st;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_cal_cert_points ON public.calibration_certificate_points;
CREATE TRIGGER trg_lock_cal_cert_points
  BEFORE INSERT OR UPDATE OR DELETE ON public.calibration_certificate_points
  FOR EACH ROW EXECUTE FUNCTION public.bpx_prevent_locked_cert_child();

DROP TRIGGER IF EXISTS trg_lock_cal_cert_standards ON public.calibration_certificate_standards;
CREATE TRIGGER trg_lock_cal_cert_standards
  BEFORE INSERT OR UPDATE OR DELETE ON public.calibration_certificate_standards
  FOR EACH ROW EXECUTE FUNCTION public.bpx_prevent_locked_cert_child();

DROP TRIGGER IF EXISTS trg_lock_cal_cert_env ON public.calibration_certificate_environmental;
CREATE TRIGGER trg_lock_cal_cert_env
  BEFORE INSERT OR UPDATE OR DELETE ON public.calibration_certificate_environmental
  FOR EACH ROW EXECUTE FUNCTION public.bpx_prevent_locked_cert_child();

DROP TRIGGER IF EXISTS trg_lock_cal_cert_conf ON public.calibration_certificate_conformity;
CREATE TRIGGER trg_lock_cal_cert_conf
  BEFORE INSERT OR UPDATE OR DELETE ON public.calibration_certificate_conformity
  FOR EACH ROW EXECUTE FUNCTION public.bpx_prevent_locked_cert_child();

DROP TRIGGER IF EXISTS trg_lock_weight_cert_items ON public.weight_calibration_certificate_items;
CREATE TRIGGER trg_lock_weight_cert_items
  BEFORE INSERT OR UPDATE OR DELETE ON public.weight_calibration_certificate_items
  FOR EACH ROW EXECUTE FUNCTION public.bpx_prevent_locked_cert_child();

DROP TRIGGER IF EXISTS trg_lock_weight_cert_std ON public.weight_calibration_certificate_standards;
CREATE TRIGGER trg_lock_weight_cert_std
  BEFORE INSERT OR UPDATE OR DELETE ON public.weight_calibration_certificate_standards
  FOR EACH ROW EXECUTE FUNCTION public.bpx_prevent_locked_cert_child();

DROP TRIGGER IF EXISTS trg_lock_weight_cert_env ON public.weight_calibration_certificate_environmental;
CREATE TRIGGER trg_lock_weight_cert_env
  BEFORE INSERT OR UPDATE OR DELETE ON public.weight_calibration_certificate_environmental
  FOR EACH ROW EXECUTE FUNCTION public.bpx_prevent_locked_cert_child();

CREATE OR REPLACE FUNCTION public.bpx_prevent_locked_coleta()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.certificate_id IS NOT NULL OR COALESCE(OLD.workflow_status, '') IN (
      'conferida', 'aprovada_certificado', 'certificado_gerado'
    ) THEN
      RAISE EXCEPTION 'Coleta vinculada ou conferida não pode ser excluída fisicamente.';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.certificate_id IS NOT NULL OR COALESCE(OLD.workflow_status, '') IN (
    'aprovada_certificado', 'certificado_gerado'
  ) THEN
    IF public.bpx_allow_locked_update() THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Coleta com certificado gerado é imutável.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_scale_collections ON public.scale_calibration_collections;
CREATE TRIGGER trg_lock_scale_collections
  BEFORE UPDATE OR DELETE ON public.scale_calibration_collections
  FOR EACH ROW EXECUTE FUNCTION public.bpx_prevent_locked_coleta();

DROP TRIGGER IF EXISTS trg_lock_weight_collections ON public.weight_calibration_collections;
CREATE TRIGGER trg_lock_weight_collections
  BEFORE UPDATE OR DELETE ON public.weight_calibration_collections
  FOR EACH ROW EXECUTE FUNCTION public.bpx_prevent_locked_coleta();

CREATE OR REPLACE FUNCTION public.bpx_protect_vigente_document()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'vigente' THEN
      RAISE EXCEPTION 'Documento vigente não pode ser excluído. Obsoletar primeiro.';
    END IF;
    IF NOT public.can_manage_master_documents() THEN
      RAISE EXCEPTION 'Sem permissão para excluir documento QMS.';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status = 'vigente' AND NEW.status = 'vigente' THEN
    IF (OLD.content_html IS DISTINCT FROM NEW.content_html)
      OR (OLD.storage_path IS DISTINCT FROM NEW.storage_path)
      OR (OLD.has_file IS DISTINCT FROM NEW.has_file)
    THEN
      RAISE EXCEPTION 'Conteúdo de documento vigente é imutável. Crie nova revisão / obsoletar.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_vigente_docs ON public.tenant_documents;
CREATE TRIGGER trg_protect_vigente_docs
  BEFORE UPDATE OR DELETE ON public.tenant_documents
  FOR EACH ROW EXECUTE FUNCTION public.bpx_protect_vigente_document();

-- ---------------------------------------------------------------------------
-- 5. RLS por papel (além do tenant)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "cal_cert_select" ON public.calibration_certificates;
CREATE POLICY "cal_cert_select" ON public.calibration_certificates FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_access_certificates());

DROP POLICY IF EXISTS "cal_cert_insert" ON public.calibration_certificates;
CREATE POLICY "cal_cert_insert" ON public.calibration_certificates FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id) AND public.can_edit_certificates());

DROP POLICY IF EXISTS "cal_cert_update" ON public.calibration_certificates;
CREATE POLICY "cal_cert_update" ON public.calibration_certificates FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_edit_certificates())
  WITH CHECK (public.cadastro_tenant_access(tenant_id) AND public.can_edit_certificates());

DROP POLICY IF EXISTS "cal_cert_delete" ON public.calibration_certificates;
CREATE POLICY "cal_cert_delete" ON public.calibration_certificates FOR DELETE
  USING (false);

DROP POLICY IF EXISTS "weight_cert_select" ON public.weight_calibration_certificates;
CREATE POLICY "weight_cert_select" ON public.weight_calibration_certificates FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_access_certificates());

DROP POLICY IF EXISTS "weight_cert_insert" ON public.weight_calibration_certificates;
CREATE POLICY "weight_cert_insert" ON public.weight_calibration_certificates FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id) AND public.can_edit_certificates());

DROP POLICY IF EXISTS "weight_cert_update" ON public.weight_calibration_certificates;
CREATE POLICY "weight_cert_update" ON public.weight_calibration_certificates FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_edit_certificates())
  WITH CHECK (public.cadastro_tenant_access(tenant_id) AND public.can_edit_certificates());

DROP POLICY IF EXISTS "weight_cert_delete" ON public.weight_calibration_certificates;
CREATE POLICY "weight_cert_delete" ON public.weight_calibration_certificates FOR DELETE
  USING (false);

DROP POLICY IF EXISTS "scale_cal_coll_select" ON public.scale_calibration_collections;
CREATE POLICY "scale_cal_coll_select" ON public.scale_calibration_collections FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_access_coleta());

DROP POLICY IF EXISTS "scale_cal_coll_insert" ON public.scale_calibration_collections;
CREATE POLICY "scale_cal_coll_insert" ON public.scale_calibration_collections FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id) AND public.can_edit_coleta());

DROP POLICY IF EXISTS "scale_cal_coll_update" ON public.scale_calibration_collections;
CREATE POLICY "scale_cal_coll_update" ON public.scale_calibration_collections FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_edit_coleta())
  WITH CHECK (public.cadastro_tenant_access(tenant_id) AND public.can_edit_coleta());

DROP POLICY IF EXISTS "scale_cal_coll_delete" ON public.scale_calibration_collections;
CREATE POLICY "scale_cal_coll_delete" ON public.scale_calibration_collections FOR DELETE
  USING (
    public.cadastro_tenant_access(tenant_id)
    AND public.can_edit_coleta()
    AND certificate_id IS NULL
  );

DROP POLICY IF EXISTS "weight_cal_coll_select" ON public.weight_calibration_collections;
CREATE POLICY "weight_cal_coll_select" ON public.weight_calibration_collections FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_access_coleta());

DROP POLICY IF EXISTS "weight_cal_coll_insert" ON public.weight_calibration_collections;
CREATE POLICY "weight_cal_coll_insert" ON public.weight_calibration_collections FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id) AND public.can_edit_coleta());

DROP POLICY IF EXISTS "weight_cal_coll_update" ON public.weight_calibration_collections;
CREATE POLICY "weight_cal_coll_update" ON public.weight_calibration_collections FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_edit_coleta())
  WITH CHECK (public.cadastro_tenant_access(tenant_id) AND public.can_edit_coleta());

DROP POLICY IF EXISTS "weight_cal_coll_delete" ON public.weight_calibration_collections;
CREATE POLICY "weight_cal_coll_delete" ON public.weight_calibration_collections FOR DELETE
  USING (
    public.cadastro_tenant_access(tenant_id)
    AND public.can_edit_coleta()
    AND certificate_id IS NULL
  );

DROP POLICY IF EXISTS "tenant_documents_update" ON public.tenant_documents;
CREATE POLICY "tenant_documents_update" ON public.tenant_documents FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_manage_master_documents())
  WITH CHECK (public.cadastro_tenant_access(tenant_id) AND public.can_manage_master_documents());

DROP POLICY IF EXISTS "tenant_documents_delete" ON public.tenant_documents;
CREATE POLICY "tenant_documents_delete" ON public.tenant_documents FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id) AND public.can_manage_master_documents());

DROP POLICY IF EXISTS "cal_cert_reviews_update" ON public.calibration_certificate_reviews;
CREATE POLICY "cal_cert_reviews_update" ON public.calibration_certificate_reviews FOR UPDATE
  USING (false);
DROP POLICY IF EXISTS "cal_cert_reviews_delete" ON public.calibration_certificate_reviews;
CREATE POLICY "cal_cert_reviews_delete" ON public.calibration_certificate_reviews FOR DELETE
  USING (false);

DROP POLICY IF EXISTS "weight_cert_reviews_update" ON public.weight_calibration_certificate_reviews;
CREATE POLICY "weight_cert_reviews_update" ON public.weight_calibration_certificate_reviews FOR UPDATE
  USING (false);
DROP POLICY IF EXISTS "weight_cert_reviews_delete" ON public.weight_calibration_certificate_reviews;
CREATE POLICY "weight_cert_reviews_delete" ON public.weight_calibration_certificate_reviews FOR DELETE
  USING (false);

-- Permitir evento de emissão na trilha de reviews
ALTER TABLE public.calibration_certificate_reviews
  DROP CONSTRAINT IF EXISTS calibration_certificate_reviews_review_type_check;
ALTER TABLE public.calibration_certificate_reviews
  ADD CONSTRAINT calibration_certificate_reviews_review_type_check
  CHECK (review_type IN ('analise_critica', 'aprovacao', 'reprovacao', 'substituicao', 'cancelamento', 'emissao', 'obsolescencia'));

ALTER TABLE public.weight_calibration_certificate_reviews
  DROP CONSTRAINT IF EXISTS weight_calibration_certificate_reviews_review_type_check;
ALTER TABLE public.weight_calibration_certificate_reviews
  ADD CONSTRAINT weight_calibration_certificate_reviews_review_type_check
  CHECK (review_type IN ('analise_critica', 'aprovacao', 'reprovacao', 'substituicao', 'cancelamento', 'emissao', 'obsolescencia'));

-- ---------------------------------------------------------------------------
-- 6. RPCs de aprovação / emissão (ator = auth.uid())
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.approve_calibration_certificates(
  p_certificate_ids uuid[],
  p_user_id uuid DEFAULT NULL,
  p_notes text DEFAULT ''
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_cert record;
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT public.can_approve_certificates() THEN
    RAISE EXCEPTION 'Sem permissão para aprovar certificados';
  END IF;
  IF NOT public.legal_acceptance_ok() THEN
    RAISE EXCEPTION 'Aceite legal/privacidade em falta';
  END IF;

  PERFORM set_config('bpx.allow_locked_update', '1', true);

  FOR v_cert IN
    SELECT c.id, c.tenant_id, c.signatory_id
    FROM public.calibration_certificates c
    WHERE c.id = ANY (p_certificate_ids)
      AND c.status = 'aguardando_aprovacao'
      AND public.cadastro_tenant_access(c.tenant_id)
  LOOP
    UPDATE public.calibration_certificates
    SET
      status = 'aprovado',
      approval_date = COALESCE(approval_date, CURRENT_DATE),
      approval_notes = COALESCE(NULLIF(TRIM(p_notes), ''), approval_notes),
      updated_by = v_actor,
      updated_at = now()
    WHERE id = v_cert.id;

    INSERT INTO public.calibration_certificate_reviews (
      certificate_id, review_type, notes, reviewed_by, employee_id
    ) VALUES (
      v_cert.id, 'aprovacao', COALESCE(p_notes, ''), v_actor, v_cert.signatory_id
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_weight_calibration_certificates(
  p_certificate_ids uuid[],
  p_user_id uuid DEFAULT NULL,
  p_notes text DEFAULT ''
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_cert record;
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT public.can_approve_certificates() THEN
    RAISE EXCEPTION 'Sem permissão para aprovar certificados';
  END IF;
  IF NOT public.legal_acceptance_ok() THEN
    RAISE EXCEPTION 'Aceite legal/privacidade em falta';
  END IF;

  PERFORM set_config('bpx.allow_locked_update', '1', true);

  FOR v_cert IN
    SELECT c.id, c.tenant_id, c.signatory_id
    FROM public.weight_calibration_certificates c
    WHERE c.id = ANY (p_certificate_ids)
      AND c.status = 'aguardando_aprovacao'
      AND public.cadastro_tenant_access(c.tenant_id)
  LOOP
    UPDATE public.weight_calibration_certificates
    SET
      status = 'aprovado',
      approval_date = COALESCE(approval_date, CURRENT_DATE),
      approval_notes = COALESCE(NULLIF(TRIM(p_notes), ''), approval_notes),
      updated_by = v_actor,
      updated_at = now()
    WHERE id = v_cert.id;

    INSERT INTO public.weight_calibration_certificate_reviews (
      certificate_id, review_type, notes, reviewed_by, employee_id
    ) VALUES (
      v_cert.id, 'aprovacao', COALESCE(p_notes, ''), v_actor, v_cert.signatory_id
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.emit_calibration_certificate(p_id uuid, p_fields jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_status text;
  v_tenant uuid;
  v_coll uuid;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT public.can_emit_certificates() THEN
    RAISE EXCEPTION 'Sem permissão para emitir certificados';
  END IF;
  IF NOT public.legal_acceptance_ok() THEN
    RAISE EXCEPTION 'Aceite legal/privacidade em falta';
  END IF;

  SELECT status, tenant_id, collection_id INTO v_status, v_tenant, v_coll
  FROM public.calibration_certificates WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Certificado não encontrado'; END IF;
  IF NOT public.cadastro_tenant_access(v_tenant) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF v_status <> 'aprovado' THEN
    RAISE EXCEPTION 'Só é possível emitir certificado aprovado (estado atual: %)', v_status;
  END IF;

  PERFORM set_config('bpx.allow_locked_update', '1', true);

  UPDATE public.calibration_certificates SET
    status = 'emitido',
    issue_date = COALESCE((p_fields->>'issue_date')::date, CURRENT_DATE),
    validity_date = COALESCE((p_fields->>'validity_date')::date, validity_date),
    emitted_by = v_actor,
    is_preview_only = false,
    signatory_name = COALESCE(p_fields->>'signatory_name', signatory_name),
    executor_name = COALESCE(p_fields->>'executor_name', executor_name),
    technical_snapshot = COALESCE(p_fields->'technical_snapshot', technical_snapshot),
    document_snapshot = COALESCE(p_fields->'document_snapshot', document_snapshot),
    updated_by = v_actor,
    updated_at = now()
  WHERE id = p_id;

  INSERT INTO public.calibration_certificate_reviews (
    certificate_id, review_type, notes, reviewed_by
  ) VALUES (
    p_id, 'emissao', 'Emissão oficial com e-signature', v_actor
  );

  IF v_coll IS NOT NULL THEN
    UPDATE public.scale_calibration_collections
    SET workflow_status = 'certificado_gerado', certificate_id = p_id
    WHERE id = v_coll;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.emit_weight_calibration_certificate(p_id uuid, p_fields jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_status text;
  v_tenant uuid;
  v_coll uuid;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT public.can_emit_certificates() THEN
    RAISE EXCEPTION 'Sem permissão para emitir certificados';
  END IF;
  IF NOT public.legal_acceptance_ok() THEN
    RAISE EXCEPTION 'Aceite legal/privacidade em falta';
  END IF;

  SELECT status, tenant_id, collection_id INTO v_status, v_tenant, v_coll
  FROM public.weight_calibration_certificates WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Certificado não encontrado'; END IF;
  IF NOT public.cadastro_tenant_access(v_tenant) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF v_status <> 'aprovado' THEN
    RAISE EXCEPTION 'Só é possível emitir certificado aprovado (estado atual: %)', v_status;
  END IF;

  PERFORM set_config('bpx.allow_locked_update', '1', true);

  UPDATE public.weight_calibration_certificates SET
    status = 'emitido',
    issue_date = COALESCE((p_fields->>'issue_date')::date, CURRENT_DATE),
    validity_date = COALESCE((p_fields->>'validity_date')::date, validity_date),
    emitted_by = v_actor,
    is_preview_only = false,
    signatory_name = COALESCE(p_fields->>'signatory_name', signatory_name),
    executor_name = COALESCE(p_fields->>'executor_name', executor_name),
    technical_snapshot = COALESCE(p_fields->'technical_snapshot', technical_snapshot),
    document_snapshot = COALESCE(p_fields->'document_snapshot', document_snapshot),
    updated_by = v_actor,
    updated_at = now()
  WHERE id = p_id;

  INSERT INTO public.weight_calibration_certificate_reviews (
    certificate_id, review_type, notes, reviewed_by
  ) VALUES (
    p_id, 'emissao', 'Emissão oficial com e-signature', v_actor
  );

  IF v_coll IS NOT NULL THEN
    UPDATE public.weight_calibration_collections
    SET workflow_status = 'certificado_gerado', certificate_id = p_id
    WHERE id = v_coll;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_calibration_certificates(uuid[], uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_weight_calibration_certificates(uuid[], uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.emit_calibration_certificate(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.emit_weight_calibration_certificate(uuid, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Login: lockout + log de tentativas
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.auth_access_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL DEFAULT '',
  profile_id uuid,
  success boolean NOT NULL,
  origin text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_access_events_created
  ON public.auth_access_events (created_at DESC);

ALTER TABLE public.auth_access_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_access_events_select ON public.auth_access_events
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY auth_access_events_no_ins ON public.auth_access_events
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY auth_access_events_no_upd ON public.auth_access_events
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY auth_access_events_no_del ON public.auth_access_events
  FOR DELETE TO authenticated USING (false);

CREATE OR REPLACE FUNCTION public.login_is_blocked(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO u FROM public.profiles
  WHERE lower(email) = lower(btrim(p_email))
  LIMIT 1;
  IF NOT FOUND THEN RETURN false; END IF;
  IF COALESCE(u.is_disabled, false) THEN RETURN true; END IF;
  IF u.locked_until IS NOT NULL AND u.locked_until > now() THEN RETURN true; END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_login_attempt(
  p_email text,
  p_success boolean,
  p_origin text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO u FROM public.profiles
  WHERE lower(email) = lower(btrim(p_email))
  LIMIT 1;

  INSERT INTO public.auth_access_events (email, profile_id, success, origin)
  VALUES (lower(btrim(p_email)), u.id, p_success, left(COALESCE(p_origin, ''), 500));

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF p_success THEN
    UPDATE public.profiles
    SET failed_login_count = 0, locked_until = NULL, updated_at = now()
    WHERE id = u.id;
  ELSE
    UPDATE public.profiles
    SET
      failed_login_count = COALESCE(failed_login_count, 0) + 1,
      locked_until = CASE
        WHEN COALESCE(failed_login_count, 0) + 1 >= 3 THEN now() + interval '15 minutes'
        ELSE locked_until
      END,
      updated_at = now()
    WHERE id = u.id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.login_is_blocked(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_login_attempt(text, boolean, text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. Aceite legal + privacidade (versões no servidor)
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.accept_legal_terms(text);

CREATE OR REPLACE FUNCTION public.accept_legal_terms(
  p_version text,
  p_privacy_version text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_version IS NULL OR btrim(p_version) = '' THEN
    RAISE EXCEPTION 'p_version required';
  END IF;

  UPDATE public.profiles SET
    legal_accepted_at = now(),
    legal_accepted_version = btrim(p_version),
    privacy_accepted_at = CASE
      WHEN p_privacy_version IS NULL OR btrim(p_privacy_version) = '' THEN privacy_accepted_at
      ELSE now()
    END,
    privacy_accepted_version = CASE
      WHEN p_privacy_version IS NULL OR btrim(p_privacy_version) = '' THEN privacy_accepted_version
      ELSE btrim(p_privacy_version)
    END,
    updated_at = now()
  WHERE id = auth.uid();

  IF NOT FOUND THEN RAISE EXCEPTION 'profile not found'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_must_change_password()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  UPDATE public.profiles
  SET must_change_password = false, updated_at = now()
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_legal_terms(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_must_change_password() TO authenticated;

-- Compatibilidade: overload antigo accept_legal_terms(text) já redefinido acima com default.

-- ---------------------------------------------------------------------------
-- 9. Backup: retenção BPx (6 anos) + trilha sem CASCADE
-- ---------------------------------------------------------------------------

ALTER TABLE public.tenants
  ALTER COLUMN backup_retention_days SET DEFAULT 2190;

UPDATE public.tenants
SET backup_retention_days = 2190
WHERE backup_retention_days < 2190;

COMMENT ON COLUMN public.tenants.backup_retention_days IS
  'Dias de retenção dos ZIPs (default 2190 ≈ 6 anos após criação; REQ-F-ER-007). Offsite continua obrigatório.';

-- Impedir apagar tenant com trilha de backup (retenção)
DO $$
DECLARE
  conname text;
BEGIN
  SELECT c.conname INTO conname
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'tenant_backup_events'
    AND c.contype = 'f'
    AND pg_get_constraintdef(c.oid) ILIKE '%tenant_id%';
  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.tenant_backup_events DROP CONSTRAINT %I', conname);
  END IF;
  ALTER TABLE public.tenant_backup_events
    ADD CONSTRAINT tenant_backup_events_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE RESTRICT;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Log de ações admin cross-tenant (dual control documental)
CREATE TABLE IF NOT EXISTS public.admin_sensitive_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_tenant_id uuid,
  target_user_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_sensitive_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_sensitive_select ON public.admin_sensitive_actions
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY admin_sensitive_insert ON public.admin_sensitive_actions
  FOR INSERT TO authenticated WITH CHECK (public.is_admin() AND actor_id = auth.uid());
CREATE POLICY admin_sensitive_no_upd ON public.admin_sensitive_actions
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY admin_sensitive_no_del ON public.admin_sensitive_actions
  FOR DELETE TO authenticated USING (false);

NOTIFY pgrst, 'reload schema';
