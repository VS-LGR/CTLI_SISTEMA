-- Atualiza cargos de colaboradores para lista institucional Trevo
-- Ordem: remover CHECK antigo → migrar dados → criar CHECK novo

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'employee_registrations'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%job_role%'
  LOOP
    EXECUTE format('ALTER TABLE public.employee_registrations DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

UPDATE public.employee_registrations SET job_role = 'tecnico_em_balancas' WHERE job_role = 'tecnico';
UPDATE public.employee_registrations SET job_role = 'gerente_tecnico' WHERE job_role = 'gerente';
UPDATE public.employee_registrations SET job_role = 'diretor' WHERE job_role = 'diretoria';
UPDATE public.employee_registrations SET job_role = 'auxiliar_administrativo' WHERE job_role = 'administrativo';
UPDATE public.employee_registrations SET job_role = 'auxiliar_tecnico' WHERE job_role = 'auxiliar';
UPDATE public.employee_registrations SET job_role = 'gerente_tecnico' WHERE job_role = 'supervisor';
UPDATE public.employee_registrations SET job_role = 'gerente_tecnico' WHERE job_role = 'coordenador';
UPDATE public.employee_registrations SET job_role = 'auxiliar_tecnico' WHERE job_role = 'operador';
UPDATE public.employee_registrations SET job_role = 'auxiliar_tecnico' WHERE job_role = 'estagiario';
UPDATE public.employee_registrations SET job_role = 'signatario' WHERE job_role = 'outro';

ALTER TABLE public.employee_registrations
  DROP CONSTRAINT IF EXISTS employee_registrations_job_role_check;

ALTER TABLE public.employee_registrations
  ADD CONSTRAINT employee_registrations_job_role_check
  CHECK (job_role IN (
    'motorista',
    'auxiliar_administrativo',
    'compras',
    'vendas',
    'compras_vendas',
    'auxiliar_tecnico',
    'tecnico_em_balancas',
    'gerente_qualidade',
    'gerente_tecnico',
    'signatario',
    'diretor'
  ));
