-- Aceite de Termos de Adesão (EULA) + Licença no perfil do utilizador
-- Utilizadores autenticados não podem UPDATE em profiles (RLS admin-only);
-- por isso a persistência faz-se via RPC SECURITY DEFINER.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS legal_accepted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS legal_accepted_version text NULL;

COMMENT ON COLUMN public.profiles.legal_accepted_at IS
  'Quando o utilizador aceitou EULA + Licença; NULL = deve aceitar antes de usar a app.';

COMMENT ON COLUMN public.profiles.legal_accepted_version IS
  'Versão dos termos aceites (constante LEGAL_ACCEPTANCE_VERSION no frontend).';

CREATE OR REPLACE FUNCTION public.accept_legal_terms(p_version text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_version IS NULL OR btrim(p_version) = '' THEN
    RAISE EXCEPTION 'p_version required';
  END IF;

  UPDATE public.profiles
  SET
    legal_accepted_at = now(),
    legal_accepted_version = btrim(p_version),
    updated_at = now()
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.accept_legal_terms(text) IS
  'Regista aceite de EULA + Licença pelo utilizador autenticado (auth.uid()).';

GRANT EXECUTE ON FUNCTION public.accept_legal_terms(text) TO authenticated;

NOTIFY pgrst, 'reload schema';
