-- Alinhar CHECK de responsibles aos novos papéis documentais

ALTER TABLE public.responsibles DROP CONSTRAINT IF EXISTS responsibles_role_check;

ALTER TABLE public.responsibles ADD CONSTRAINT responsibles_role_check
  CHECK (role IN (
    'diretor',
    'gerente_qualidade',
    'gerente_tecnico',
    'gerente_geral',
    'administrativo_vendas',
    'administrativo_compras'
  ));
