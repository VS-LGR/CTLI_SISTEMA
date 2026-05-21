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
  "tenant-backup"
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
Write-Host "Concluido. No painel Supabase:" -ForegroundColor Green
Write-Host "  Edge Functions -> Secrets -> adicione CTLI_SERVICE_ROLE_KEY = valor service_role (Settings -> API)"
Write-Host "  (SUPABASE_URL e SUPABASE_ANON_KEY ja existem por defeito nas funcoes.)"
