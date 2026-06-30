# Publica Edge Functions no projeto Supabase ligado (requer login + link).
# Uso (PowerShell, na pasta frontend):
#   .\scripts\deploy-edge-functions.ps1
# Ou com project-ref explícito (Settings → General → Reference ID):
#   .\scripts\deploy-edge-functions.ps1 -ProjectRef "abcdefghijklmnop"

param(
  [string]$ProjectRef = ""
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$functions = @(
  "admin-create-user",
  "admin-update-user",
  "admin-delete-user",
  "tenant-manage-technician",
  "tenant-backup",
  "send-calibration-certificate"
)

Write-Host "ProcVault — deploy Edge Functions" -ForegroundColor Cyan
Write-Host ""

if ($ProjectRef) {
  Write-Host "A ligar ao projeto $ProjectRef ..."
  npx supabase link --project-ref $ProjectRef
}

Write-Host "A publicar: $($functions -join ', ')"
npx supabase functions deploy $functions

Write-Host ""
Write-Host "Concluido. No painel Supabase (NAO na Vercel):" -ForegroundColor Green
Write-Host "  Edge Functions -> Secrets:"
Write-Host "    CTLI_SERVICE_ROLE_KEY = service_role (Settings -> API)"
Write-Host "    RESEND_API_KEY = chave da API Resend"
Write-Host "    RESEND_FROM_EMAIL = remetente padrao (fallback se o ambiente nao tiver billing_email)"
Write-Host "  Remetente por ambiente: cadastre billing_email em Admin -> Clientes."
Write-Host "  (SUPABASE_URL e SUPABASE_ANON_KEY ja existem por defeito nas funcoes.)"
Write-Host "  Vercel: apenas REACT_APP_* do frontend (URL/anon key). Nunca service_role nem RESEND_API_KEY."
