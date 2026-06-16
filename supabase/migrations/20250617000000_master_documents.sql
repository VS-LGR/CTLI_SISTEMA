-- Lista Mestra de Documentos (RE-8.3A) — schema principal

-- Regras globais de nome de arquivo (sem tenant)
CREATE TABLE IF NOT EXISTS public.document_file_naming_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  pattern text NOT NULL,
  required_context_fields text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_document_file_naming_rules_touch ON public.document_file_naming_rules;
CREATE TRIGGER trg_document_file_naming_rules_touch
  BEFORE UPDATE ON public.document_file_naming_rules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Documento mestre por tenant
CREATE TABLE IF NOT EXISTS public.master_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  code text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'procedimento'
    CHECK (type IN (
      'manual', 'politica', 'procedimento', 'registro', 'planilha_software',
      'documento_externo', 'template_exportacao', 'relatorio', 'lista', 'anexo', 'documento_interno'
    )),
  category text NOT NULL DEFAULT '',
  reference text NOT NULL DEFAULT '',
  current_revision text NOT NULL DEFAULT '00',
  current_issue_date date,
  previous_revision_date date,
  current_revision_date date,
  last_critical_analysis_date date,
  next_critical_analysis_date date,
  critical_analysis_period_months int NOT NULL DEFAULT 24,
  status text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN (
      'rascunho', 'ativo', 'em_revisao', 'obsoleto', 'retido_como_obsoleto',
      'substituido', 'cancelado', 'externo_em_verificacao', 'externo_desatualizado'
    )),
  related_process text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  storage_location text NOT NULL DEFAULT '',
  distribution_method text NOT NULL DEFAULT '',
  protection_method text NOT NULL DEFAULT '',
  copy_control text NOT NULL DEFAULT '',
  access_level text NOT NULL DEFAULT '',
  retention_time int,
  retention_unit text NOT NULL DEFAULT 'anos',
  disposition_after_retention text NOT NULL DEFAULT '',
  file_naming_rule text NOT NULL DEFAULT '',
  export_file_name_pattern text NOT NULL DEFAULT '',
  allow_manual_file_name_edit boolean NOT NULL DEFAULT false,
  template_key text NOT NULL DEFAULT '',
  linked_module text NOT NULL DEFAULT '',
  emission_responsible_id uuid REFERENCES public.responsibles (id) ON DELETE SET NULL,
  analysis_responsible_id uuid REFERENCES public.responsibles (id) ON DELETE SET NULL,
  approval_responsible_id uuid REFERENCES public.responsibles (id) ON DELETE SET NULL,
  quality_management_responsible_id uuid REFERENCES public.responsibles (id) ON DELETE SET NULL,
  is_obsolete boolean NOT NULL DEFAULT false,
  obsolete_date date,
  obsolete_reason text NOT NULL DEFAULT '',
  replaced_by_code text NOT NULL DEFAULT '',
  retained_for_legal boolean NOT NULL DEFAULT false,
  retained_for_knowledge boolean NOT NULL DEFAULT false,
  obsolete_identification_applied boolean NOT NULL DEFAULT false,
  obsolete_responsible_id uuid REFERENCES public.responsibles (id) ON DELETE SET NULL,
  critical_analysis_result text NOT NULL DEFAULT '',
  critical_analysis_notes text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  page_count int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_master_documents_tenant ON public.master_documents (tenant_id);
CREATE INDEX IF NOT EXISTS idx_master_documents_code ON public.master_documents (tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_master_documents_status ON public.master_documents (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_master_documents_template ON public.master_documents (tenant_id, template_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_master_documents_unique_code
  ON public.master_documents (tenant_id, code)
  WHERE code <> '' AND status <> 'cancelado';

DROP TRIGGER IF EXISTS trg_master_documents_touch ON public.master_documents;
CREATE TRIGGER trg_master_documents_touch
  BEFORE UPDATE ON public.master_documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Histórico de revisões
CREATE TABLE IF NOT EXISTS public.document_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  master_document_id uuid NOT NULL REFERENCES public.master_documents (id) ON DELETE CASCADE,
  revision_number text NOT NULL DEFAULT '00',
  issue_date date,
  revision_date date,
  change_description text NOT NULL DEFAULT '',
  change_reason text NOT NULL DEFAULT '',
  changed_by_id uuid REFERENCES public.responsibles (id) ON DELETE SET NULL,
  reviewed_by_id uuid REFERENCES public.responsibles (id) ON DELETE SET NULL,
  approved_by_id uuid REFERENCES public.responsibles (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'vigente', 'obsoleta', 'cancelada')),
  file_url text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_revisions_doc ON public.document_revisions (master_document_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_document_revisions_one_vigente
  ON public.document_revisions (master_document_id)
  WHERE status = 'vigente';

DROP TRIGGER IF EXISTS trg_document_revisions_touch ON public.document_revisions;
CREATE TRIGGER trg_document_revisions_touch
  BEFORE UPDATE ON public.document_revisions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Distribuição
CREATE TABLE IF NOT EXISTS public.document_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  master_document_id uuid NOT NULL REFERENCES public.master_documents (id) ON DELETE CASCADE,
  area text NOT NULL DEFAULT '',
  user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  copy_number int,
  copy_type text NOT NULL DEFAULT 'copia_eletronica'
    CHECK (copy_type IN ('original', 'copia_controlada', 'copia_eletronica', 'copia_nao_controlada')),
  distribution_method text NOT NULL DEFAULT '',
  distribution_date date,
  status text NOT NULL DEFAULT 'ativa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_distributions_doc ON public.document_distributions (master_document_id);

DROP TRIGGER IF EXISTS trg_document_distributions_touch ON public.document_distributions;
CREATE TRIGGER trg_document_distributions_touch
  BEFORE UPDATE ON public.document_distributions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Templates vinculados
CREATE TABLE IF NOT EXISTS public.document_template_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  master_document_id uuid NOT NULL REFERENCES public.master_documents (id) ON DELETE CASCADE,
  template_key text NOT NULL,
  module_name text NOT NULL DEFAULT '',
  is_default boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_template_links_key ON public.document_template_links (tenant_id, template_key);

DROP TRIGGER IF EXISTS trg_document_template_links_touch ON public.document_template_links;
CREATE TRIGGER trg_document_template_links_touch
  BEFORE UPDATE ON public.document_template_links
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Documentos externos controlados
CREATE TABLE IF NOT EXISTS public.external_document_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  master_document_id uuid REFERENCES public.master_documents (id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  consultation_location text NOT NULL DEFAULT '',
  issuing_organization text NOT NULL DEFAULT '',
  external_revision text NOT NULL DEFAULT '',
  previous_consultation_date date,
  last_consultation_date date,
  next_consultation_date date,
  consultation_period_months int NOT NULL DEFAULT 6,
  has_revision boolean NOT NULL DEFAULT false,
  involved_procedures text NOT NULL DEFAULT '',
  consultation_responsible_id uuid REFERENCES public.responsibles (id) ON DELETE SET NULL,
  validity_status text NOT NULL DEFAULT 'pendente_consulta'
    CHECK (validity_status IN (
      'valido', 'pendente_consulta', 'revisao_identificada',
      'desatualizado', 'substituido', 'indisponivel'
    )),
  external_link text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_external_document_controls_tenant ON public.external_document_controls (tenant_id);

DROP TRIGGER IF EXISTS trg_external_document_controls_touch ON public.external_document_controls;
CREATE TRIGGER trg_external_document_controls_touch
  BEFORE UPDATE ON public.external_document_controls
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Planilhas / softwares controlados
CREATE TABLE IF NOT EXISTS public.controlled_software (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  master_document_id uuid REFERENCES public.master_documents (id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  revision text NOT NULL DEFAULT '00',
  last_validation_date date,
  validation_location text NOT NULL DEFAULT '',
  validation_responsible_id uuid REFERENCES public.responsibles (id) ON DELETE SET NULL,
  generated_document_code text NOT NULL DEFAULT '',
  related_procedure_code text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'ativo',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_controlled_software_tenant ON public.controlled_software (tenant_id);

DROP TRIGGER IF EXISTS trg_controlled_software_touch ON public.controlled_software;
CREATE TRIGGER trg_controlled_software_touch
  BEFORE UPDATE ON public.controlled_software
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Snapshots de exportação
CREATE TABLE IF NOT EXISTS public.document_generated_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  master_document_id uuid REFERENCES public.master_documents (id) ON DELETE SET NULL,
  source_module text NOT NULL DEFAULT '',
  source_record_id text NOT NULL DEFAULT '',
  document_code text NOT NULL DEFAULT '',
  document_title text NOT NULL DEFAULT '',
  document_reference text NOT NULL DEFAULT '',
  document_revision text NOT NULL DEFAULT '',
  document_issue_date date,
  document_template_key text NOT NULL DEFAULT '',
  export_file_name text NOT NULL DEFAULT '',
  export_file_name_pattern text NOT NULL DEFAULT '',
  file_naming_rule text NOT NULL DEFAULT '',
  file_extension text NOT NULL DEFAULT 'pdf',
  file_version int NOT NULL DEFAULT 1,
  generated_by_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  file_url text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_generated_snapshots_doc ON public.document_generated_snapshots (master_document_id);
CREATE INDEX IF NOT EXISTS idx_document_generated_snapshots_source ON public.document_generated_snapshots (tenant_id, source_module, source_record_id);

-- Regras de acesso
CREATE TABLE IF NOT EXISTS public.document_access_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  master_document_id uuid NOT NULL REFERENCES public.master_documents (id) ON DELETE CASCADE,
  role_id text NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_approve boolean NOT NULL DEFAULT false,
  can_obsolete boolean NOT NULL DEFAULT false,
  can_export boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_document_access_rules_touch ON public.document_access_rules;
CREATE TRIGGER trg_document_access_rules_touch
  BEFORE UPDATE ON public.document_access_rules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Funções auxiliares de data
CREATE OR REPLACE FUNCTION public.calculate_next_critical_analysis_date(
  p_last_date date,
  p_period_months int DEFAULT 24
)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_last_date IS NULL THEN NULL
    ELSE (p_last_date + (COALESCE(p_period_months, 24) || ' months')::interval)::date
  END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_next_external_consultation_date(
  p_last_date date,
  p_period_months int DEFAULT 6
)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_last_date IS NULL THEN NULL
    ELSE (p_last_date + (COALESCE(p_period_months, 6) || ' months')::interval)::date
  END;
$$;

-- Aprovar revisão: obsoleta anterior e atualiza master
CREATE OR REPLACE FUNCTION public.approve_document_revision(p_revision_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc_id uuid;
  v_tenant_id uuid;
  v_rev text;
  v_issue date;
  v_rev_date date;
BEGIN
  SELECT master_document_id, tenant_id, revision_number, issue_date, revision_date
  INTO v_doc_id, v_tenant_id, v_rev, v_issue, v_rev_date
  FROM public.document_revisions
  WHERE id = p_revision_id;

  IF v_doc_id IS NULL THEN
    RAISE EXCEPTION 'Revisão não encontrada';
  END IF;

  UPDATE public.document_revisions
  SET status = 'obsoleta', updated_at = now()
  WHERE master_document_id = v_doc_id AND status = 'vigente' AND id <> p_revision_id;

  UPDATE public.document_revisions
  SET status = 'vigente', updated_at = now()
  WHERE id = p_revision_id;

  UPDATE public.master_documents
  SET
    current_revision = v_rev,
    current_issue_date = v_issue,
    current_revision_date = COALESCE(v_rev_date, v_issue),
    previous_revision_date = current_revision_date,
    status = 'ativo',
    updated_at = now()
  WHERE id = v_doc_id;
END;
$$;

-- RLS
ALTER TABLE public.document_file_naming_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_template_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_document_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controlled_software ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_generated_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_access_rules ENABLE ROW LEVEL SECURITY;

-- naming rules: leitura para todos autenticados
DROP POLICY IF EXISTS "document_file_naming_rules_select" ON public.document_file_naming_rules;
CREATE POLICY "document_file_naming_rules_select" ON public.document_file_naming_rules
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "master_documents_select" ON public.master_documents;
CREATE POLICY "master_documents_select" ON public.master_documents FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "master_documents_insert" ON public.master_documents;
CREATE POLICY "master_documents_insert" ON public.master_documents FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "master_documents_update" ON public.master_documents;
CREATE POLICY "master_documents_update" ON public.master_documents FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id))
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "master_documents_delete" ON public.master_documents;
CREATE POLICY "master_documents_delete" ON public.master_documents FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id));

-- Políticas repetidas para tabelas filhas
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'document_revisions', 'document_distributions', 'document_template_links',
    'external_document_controls', 'controlled_software',
    'document_generated_snapshots', 'document_access_rules'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (public.cadastro_tenant_access(tenant_id))', t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (public.cadastro_tenant_access(tenant_id))', t || '_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (public.cadastro_tenant_access(tenant_id)) WITH CHECK (public.cadastro_tenant_access(tenant_id))', t || '_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (public.cadastro_tenant_access(tenant_id))', t || '_delete', t);
  END LOOP;
END $$;

-- Seed regras de nome de arquivo globais
INSERT INTO public.document_file_naming_rules (name, description, pattern, required_context_fields)
VALUES
  ('Código + Título + Revisão + Data da Revisão Atual', 'Procedimentos e manuais', '{codigo}_{titulo}_Rev{revisao}_{dataRevisaoAtual}', ARRAY['dataRevisaoAtual']),
  ('Código + Título + Revisão + Nome e Cargo', 'Registros com pessoa', '{codigo}_{titulo}_Rev{revisao}_{nome}_{cargo}', ARRAY['nome', 'cargo']),
  ('Código + Título + Revisão + Cargo', 'Competências do cargo', '{codigo}_{titulo}_Rev{revisao}_{cargo}', ARRAY['cargo']),
  ('Código + Título + Revisão + Curso e Data', 'Lista de presença', '{codigo}_{titulo}_Rev{revisao}_{curso}_{data}', ARRAY['curso', 'data']),
  ('Código + Título + Revisão + Ano', 'Registros anuais', '{codigo}_{titulo}_Rev{revisao}_{ano}', ARRAY['ano']),
  ('Código + Título + Revisão + Equipamento e Ano', 'Verificação de equipamento', '{codigo}_{titulo}_Rev{revisao}_{equipamento}_{ano}', ARRAY['equipamento', 'ano']),
  ('Código + Título + Revisão + Número, Fornecedor e Data', 'Pedidos e orçamentos', '{codigo}_{titulo}_Rev{revisao}_{numero}_{fornecedor}_{data}', ARRAY['numero', 'fornecedor', 'data']),
  ('Código + Título + Revisão + Número, Cliente e Data', 'Registros comerciais', '{codigo}_{titulo}_Rev{revisao}_{numero}_{cliente}_{data}', ARRAY['numero', 'cliente', 'data']),
  ('Código + Título + Revisão + Número, Cliente e Ano', 'Pesquisas de satisfação', '{codigo}_{titulo}_Rev{revisao}_{numero}_{cliente}_{ano}', ARRAY['numero', 'cliente', 'ano']),
  ('Código + Título + Revisão + Número, Cliente e Número de Série', 'Certificados', '{codigo}_{titulo}_Rev{revisao}_{numero}_{cliente}_{numeroSerie}', ARRAY['numero', 'cliente', 'numeroSerie']),
  ('Código + Título + Revisão + Número e Ano', 'Auditorias', '{codigo}_{titulo}_Rev{revisao}_{numero}_{ano}', ARRAY['numero', 'ano']),
  ('Personalizado', 'Padrão personalizado', '{codigo}_{titulo}_Rev{revisao}_{custom}', ARRAY[]::text[])
ON CONFLICT (name) DO NOTHING;
