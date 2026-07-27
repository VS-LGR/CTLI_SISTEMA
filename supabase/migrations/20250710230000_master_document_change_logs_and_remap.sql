-- Auditoria de alterações da Lista Mestra + remapeamento de família de códigos

-- Usuário destinatário na distribuição (além da área)
ALTER TABLE public.document_distributions
  ADD COLUMN IF NOT EXISTS recipient_name text NOT NULL DEFAULT '';

-- Identidade estável da pasta (não muda no remapeamento de códigos)
ALTER TABLE public.master_documents
  ADD COLUMN IF NOT EXISTS system_folder_key text NOT NULL DEFAULT '';

UPDATE public.master_documents
SET system_folder_key = 'pr-' || lower(regexp_replace(regexp_replace(code, '^(PR|RE|MQ)-', ''), '\.', '-', 'g'))
WHERE system_folder_key = ''
  AND code ~ '^(PR)-'
  AND type IN ('procedimento', 'manual', 'politica', 'lista');

-- Registros / lista: pasta do PR de referência
UPDATE public.master_documents md
SET system_folder_key = 'pr-' || lower(regexp_replace(regexp_replace(md.reference, '^(PR|RE|MQ)-', ''), '\.', '-', 'g'))
WHERE md.system_folder_key = ''
  AND md.reference ~ '^(PR)-'
  AND md.type IN ('registro', 'lista', 'planilha_software', 'template_exportacao');

-- Garantir template_key estável da própria Lista Mestra
UPDATE public.master_documents
SET template_key = 're-83a-lista-mestra-pdf'
WHERE (code = 'RE-8.3A' OR title ILIKE '%lista mestra%')
  AND (template_key = '' OR template_key IS NULL OR template_key = 're-83a-lista-mestra');

CREATE INDEX IF NOT EXISTS idx_master_documents_system_folder
  ON public.master_documents (tenant_id, system_folder_key)
  WHERE system_folder_key <> '';

CREATE TABLE IF NOT EXISTS public.master_document_change_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  master_document_id uuid REFERENCES public.master_documents (id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  user_email text NOT NULL DEFAULT '',
  user_full_name text NOT NULL DEFAULT '',
  user_role text NOT NULL DEFAULT '',
  user_function text NOT NULL DEFAULT '',
  action text NOT NULL DEFAULT 'update'
    CHECK (action IN (
      'create', 'update', 'remap', 'obsolete', 'revision',
      'distribution', 'critical_analysis', 'delete', 'approve_revision'
    )),
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_master_document_change_logs_tenant
  ON public.master_document_change_logs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_master_document_change_logs_doc
  ON public.master_document_change_logs (master_document_id, created_at DESC);

ALTER TABLE public.master_document_change_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS master_document_change_logs_select ON public.master_document_change_logs;
CREATE POLICY master_document_change_logs_select ON public.master_document_change_logs
  FOR SELECT USING (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS master_document_change_logs_insert ON public.master_document_change_logs;
CREATE POLICY master_document_change_logs_insert ON public.master_document_change_logs
  FOR INSERT WITH CHECK (public.cadastro_tenant_access(tenant_id));

-- Remapeia códigos PR/RE/MQ de uma base numérica para outra no tenant
CREATE OR REPLACE FUNCTION public.remap_master_document_family(
  p_tenant_id uuid,
  p_from_base text,
  p_to_base text,
  p_doc_types text DEFAULT 'ambos'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from text := trim(p_from_base);
  v_to text := trim(p_to_base);
  v_prefix_re text;
  v_updated_docs int := 0;
  v_updated_software int := 0;
  v_updated_external int := 0;
  r record;
  v_new_code text;
  v_new_ref text;
  v_new_replaced text;
  v_changes jsonb;
  v_preview jsonb := '[]'::jsonb;
BEGIN
  IF p_tenant_id IS NULL OR v_from = '' OR v_to = '' THEN
    RAISE EXCEPTION 'tenant_id, from_base e to_base são obrigatórios';
  END IF;
  IF v_from = v_to THEN
    RAISE EXCEPTION 'from_base e to_base devem ser diferentes';
  END IF;
  IF NOT public.cadastro_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Sem acesso ao tenant';
  END IF;

  -- Prefixos: PR|RE|MQ (ou só PR / só RE)
  IF lower(p_doc_types) = 'pr' THEN
    v_prefix_re := 'PR';
  ELSIF lower(p_doc_types) = 're' THEN
    v_prefix_re := 'RE';
  ELSE
    v_prefix_re := 'PR|RE|MQ';
  END IF;

  FOR r IN
    SELECT id, code, reference, replaced_by_code, title
    FROM public.master_documents
    WHERE tenant_id = p_tenant_id
      AND status <> 'cancelado'
      AND (
        code ~ ('^(' || v_prefix_re || ')-' || replace(v_from, '.', '\.') || '([A-Z0-9.]*)?$')
        OR reference ~ ('^(' || v_prefix_re || ')-' || replace(v_from, '.', '\.') || '([A-Z0-9.]*)?$')
        OR replaced_by_code ~ ('^(' || v_prefix_re || ')-' || replace(v_from, '.', '\.') || '([A-Z0-9.]*)?$')
      )
  LOOP
    v_new_code := regexp_replace(
      r.code,
      '^(' || v_prefix_re || ')-' || replace(v_from, '.', '\.') || '([A-Z0-9.]*)?$',
      '\1-' || v_to || '\2'
    );
    v_new_ref := regexp_replace(
      r.reference,
      '^(' || v_prefix_re || ')-' || replace(v_from, '.', '\.') || '([A-Z0-9.]*)?$',
      '\1-' || v_to || '\2'
    );
    v_new_replaced := regexp_replace(
      coalesce(r.replaced_by_code, ''),
      '^(' || v_prefix_re || ')-' || replace(v_from, '.', '\.') || '([A-Z0-9.]*)?$',
      '\1-' || v_to || '\2'
    );

    IF v_new_code = r.code AND v_new_ref = r.reference AND v_new_replaced = coalesce(r.replaced_by_code, '') THEN
      CONTINUE;
    END IF;

    -- Evitar colisão de código único
    IF v_new_code <> r.code AND EXISTS (
      SELECT 1 FROM public.master_documents md
      WHERE md.tenant_id = p_tenant_id
        AND md.code = v_new_code
        AND md.status <> 'cancelado'
        AND md.id <> r.id
    ) THEN
      RAISE EXCEPTION 'Código destino já existe: %', v_new_code;
    END IF;

    v_changes := jsonb_build_object();
    IF v_new_code <> r.code THEN
      v_changes := v_changes || jsonb_build_object('code', jsonb_build_object('from', r.code, 'to', v_new_code));
    END IF;
    IF v_new_ref <> r.reference THEN
      v_changes := v_changes || jsonb_build_object('reference', jsonb_build_object('from', r.reference, 'to', v_new_ref));
    END IF;
    IF v_new_replaced <> coalesce(r.replaced_by_code, '') THEN
      v_changes := v_changes || jsonb_build_object(
        'replaced_by_code',
        jsonb_build_object('from', coalesce(r.replaced_by_code, ''), 'to', v_new_replaced)
      );
    END IF;

    UPDATE public.master_documents
    SET
      code = v_new_code,
      reference = v_new_ref,
      replaced_by_code = v_new_replaced
    WHERE id = r.id;

    INSERT INTO public.master_document_change_logs (
      tenant_id, master_document_id, action, changes, summary,
      user_id, user_email, user_full_name, user_role, user_function
    ) VALUES (
      p_tenant_id, r.id, 'remap', v_changes,
      'Remapeamento de família ' || v_from || ' → ' || v_to || ': ' || coalesce(r.code, '') || ' → ' || v_new_code,
      auth.uid(),
      coalesce((SELECT email FROM public.profiles WHERE id = auth.uid()), ''),
      coalesce((SELECT full_name FROM public.profiles WHERE id = auth.uid()), ''),
      coalesce((SELECT role FROM public.profiles WHERE id = auth.uid()), ''),
      coalesce((
        SELECT er.job_role
        FROM public.profiles p
        LEFT JOIN public.employee_registrations er ON er.id = p.employee_registration_id
        WHERE p.id = auth.uid()
      ), '')
    );

    v_preview := v_preview || jsonb_build_array(jsonb_build_object(
      'id', r.id,
      'title', r.title,
      'from_code', r.code,
      'to_code', v_new_code,
      'from_reference', r.reference,
      'to_reference', v_new_ref
    ));
    v_updated_docs := v_updated_docs + 1;
  END LOOP;

  -- Software controlado
  UPDATE public.controlled_software cs
  SET
    related_procedure_code = regexp_replace(
      cs.related_procedure_code,
      '^(PR|RE|MQ)-' || replace(v_from, '.', '\.') || '([A-Z0-9.]*)?$',
      '\1-' || v_to || '\2'
    ),
    generated_document_code = regexp_replace(
      cs.generated_document_code,
      '^(PR|RE|MQ)-' || replace(v_from, '.', '\.') || '([A-Z0-9.]*)?$',
      '\1-' || v_to || '\2'
    )
  WHERE cs.tenant_id = p_tenant_id
    AND (
      cs.related_procedure_code ~ ('^(PR|RE|MQ)-' || replace(v_from, '.', '\.') || '([A-Z0-9.]*)?$')
      OR cs.generated_document_code ~ ('^(PR|RE|MQ)-' || replace(v_from, '.', '\.') || '([A-Z0-9.]*)?$')
    );
  GET DIAGNOSTICS v_updated_software = ROW_COUNT;

  -- Procedimentos envolvidos em externos (texto livre)
  UPDATE public.external_document_controls ed
  SET involved_procedures = regexp_replace(
    ed.involved_procedures,
    '(PR|RE|MQ)-' || replace(v_from, '.', '\.'),
    '\1-' || v_to,
    'g'
  )
  WHERE ed.tenant_id = p_tenant_id
    AND ed.involved_procedures ~ ('(PR|RE|MQ)-' || replace(v_from, '.', '\.'));
  GET DIAGNOSTICS v_updated_external = ROW_COUNT;

  RETURN jsonb_build_object(
    'updated_documents', v_updated_docs,
    'updated_software', v_updated_software,
    'updated_externals', v_updated_external,
    'items', v_preview
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.remap_master_document_family(uuid, text, text, text) TO authenticated;

-- Preview sem gravar (somente leitura)
CREATE OR REPLACE FUNCTION public.preview_remap_master_document_family(
  p_tenant_id uuid,
  p_from_base text,
  p_to_base text,
  p_doc_types text DEFAULT 'ambos'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from text := trim(p_from_base);
  v_to text := trim(p_to_base);
  v_prefix_re text;
  r record;
  v_new_code text;
  v_new_ref text;
  v_preview jsonb := '[]'::jsonb;
BEGIN
  IF p_tenant_id IS NULL OR v_from = '' OR v_to = '' THEN
    RAISE EXCEPTION 'tenant_id, from_base e to_base são obrigatórios';
  END IF;
  IF NOT public.cadastro_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Sem acesso ao tenant';
  END IF;

  IF lower(p_doc_types) = 'pr' THEN
    v_prefix_re := 'PR';
  ELSIF lower(p_doc_types) = 're' THEN
    v_prefix_re := 'RE';
  ELSE
    v_prefix_re := 'PR|RE|MQ';
  END IF;

  FOR r IN
    SELECT id, code, reference, title
    FROM public.master_documents
    WHERE tenant_id = p_tenant_id
      AND status <> 'cancelado'
      AND (
        code ~ ('^(' || v_prefix_re || ')-' || replace(v_from, '.', '\.') || '([A-Z0-9.]*)?$')
        OR reference ~ ('^(' || v_prefix_re || ')-' || replace(v_from, '.', '\.') || '([A-Z0-9.]*)?$')
      )
    ORDER BY code
  LOOP
    v_new_code := regexp_replace(
      r.code,
      '^(' || v_prefix_re || ')-' || replace(v_from, '.', '\.') || '([A-Z0-9.]*)?$',
      '\1-' || v_to || '\2'
    );
    v_new_ref := regexp_replace(
      r.reference,
      '^(' || v_prefix_re || ')-' || replace(v_from, '.', '\.') || '([A-Z0-9.]*)?$',
      '\1-' || v_to || '\2'
    );
    IF v_new_code <> r.code OR v_new_ref <> r.reference THEN
      v_preview := v_preview || jsonb_build_array(jsonb_build_object(
        'id', r.id,
        'title', r.title,
        'from_code', r.code,
        'to_code', CASE WHEN v_new_code = r.code THEN r.code ELSE v_new_code END,
        'from_reference', r.reference,
        'to_reference', CASE WHEN v_new_ref = r.reference THEN r.reference ELSE v_new_ref END
      ));
    END IF;
  END LOOP;

  RETURN jsonb_build_object('items', v_preview, 'count', jsonb_array_length(v_preview));
END;
$$;

GRANT EXECUTE ON FUNCTION public.preview_remap_master_document_family(uuid, text, text, text) TO authenticated;
