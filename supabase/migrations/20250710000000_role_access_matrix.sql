-- Novos papéis + toggles de coleta/certificados por perfil

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_coleta boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_certificados boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.access_coleta IS
  'Libera coleta/OS além do papel base (gerente_qualidade, gerente_tecnico, administrativo_vendas).';

COMMENT ON COLUMN public.profiles.access_certificados IS
  'Libera emissão de certificados além do papel base (gerente_qualidade, gerente_tecnico, administrativo_vendas).';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'admin',
    'diretor',
    'gerente_qualidade',
    'gerente_tecnico',
    'gerente_geral',
    'administrativo_vendas',
    'administrativo_compras',
    'client',
    'tecnico_campo',
    'signatario'
  ));
