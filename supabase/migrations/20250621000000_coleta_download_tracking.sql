-- Rastreamento de exportação (PDF / TXT) na coleta RE-7.2A

ALTER TABLE public.scale_calibration_collections
  ADD COLUMN IF NOT EXISTS pdf_downloaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS tsv_downloaded_at timestamptz;
