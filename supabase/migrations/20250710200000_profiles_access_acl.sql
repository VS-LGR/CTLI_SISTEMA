-- ACL granular por utilizador (módulos + pastas PR).
-- version:1 distingue legado {} de ACL gravada (mesmo que vazia).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS access_acl jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN profiles.access_acl IS
  'JSON ACL: { version:1, modules:[], folders:{ "6":["pr-6-2"], "7":["pr-7-1"] } }. Sem version = legado (matriz por papel).';
