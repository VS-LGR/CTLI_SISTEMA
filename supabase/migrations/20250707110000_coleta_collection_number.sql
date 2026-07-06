-- Numeração de ordem de serviço (O.S.) para coletas RE-7.2A

ALTER TABLE public.scale_calibration_collections
  ADD COLUMN IF NOT EXISTS collection_number int,
  ADD COLUMN IF NOT EXISTS collection_year int;

CREATE UNIQUE INDEX IF NOT EXISTS idx_scale_cal_coll_os_number
  ON public.scale_calibration_collections (tenant_id, collection_year, collection_number)
  WHERE collection_number IS NOT NULL AND collection_year IS NOT NULL;

CREATE OR REPLACE FUNCTION public.next_collection_number(p_tenant_id uuid, p_year integer)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(collection_number), 0) + 1
  FROM public.scale_calibration_collections
  WHERE tenant_id = p_tenant_id AND collection_year = p_year;
$$;

-- Backfill: numerar coletas existentes por tenant/ano de criação
WITH numbered AS (
  SELECT
    id,
    EXTRACT(YEAR FROM created_at)::int AS yr,
    ROW_NUMBER() OVER (
      PARTITION BY tenant_id, EXTRACT(YEAR FROM created_at)::int
      ORDER BY created_at ASC, id ASC
    )::int AS num
  FROM public.scale_calibration_collections
  WHERE collection_number IS NULL
)
UPDATE public.scale_calibration_collections c
SET
  collection_year = n.yr,
  collection_number = n.num
FROM numbered n
WHERE c.id = n.id;
