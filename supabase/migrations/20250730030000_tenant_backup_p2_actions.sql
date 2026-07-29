-- P2 Backup: dry-run / pre-replace / reauth nos eventos de auditoria

ALTER TABLE public.tenant_backup_events
  DROP CONSTRAINT IF EXISTS tenant_backup_events_action_check;

ALTER TABLE public.tenant_backup_events
  ADD CONSTRAINT tenant_backup_events_action_check
  CHECK (action IN (
    'create',
    'restore',
    'download',
    'purge',
    'verify_fail',
    'dry_run',
    'pre_replace_backup',
    'reauth_fail'
  ));

COMMENT ON TABLE public.tenant_backup_events IS
  'Trilha imutável de backup/restore (P1/P2). Inclui dry_run, pre_replace_backup e reauth_fail.';
