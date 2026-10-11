param([switch]$UsePrebuiltJar)
$ErrorActionPreference='Stop'
$credentialRoot=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$credentialCompose=Join-Path $credentialRoot 'deploy/credential-demo/compose.yml'
$credentialArgs=@('compose','-f',$credentialCompose)
if ($UsePrebuiltJar) {
    $credentialJar=Join-Path $credentialRoot 'reports/main-sync/credential-demo-build/backend/target/backend-0.0.1-SNAPSHOT.jar'
    if (-not (Test-Path -LiteralPath $credentialJar)) { throw 'Fresh frontend-containing prebuilt credential demo jar is required.' }
    $credentialArgs+=@('-f',(Join-Path $credentialRoot 'deploy/credential-demo/compose.local.yml'))
}
New-Item -ItemType Directory -Force -Path (Join-Path $credentialRoot 'reports/credential-demo/private/credentials'),(Join-Path $credentialRoot 'reports/credential-demo/private/multipart') | Out-Null
& docker @credentialArgs up -d --build --wait
if ($LASTEXITCODE -ne 0) { throw 'Isolated credential demo did not become healthy.' }
# Existing synthetic test identities only; no manager UI/business code is altered.
foreach ($fixture in @('caregiver-execution-people.sql','caregiver-credential-catalogue.sql')) {
    Get-Content -LiteralPath (Join-Path $credentialRoot "backend/src/main/resources/db/demo/$fixture") -Raw -Encoding UTF8 |
        & docker @credentialArgs exec -T db mysql -ucarelink -plocal-credential-db carelink
    if ($LASTEXITCODE -ne 0) { throw "Fictional credential setup failed: $fixture" }
}
Write-Output 'Local-only: http://localhost:8085/caregiver/credentials'
Write-Output 'Caregiver demo-exec-cg-a / Demo#2026; other caregiver demo-exec-cg-b. Existing synthetic manager demo-exec-manager is only for MG06 API acceptance.'
Write-Output 'No old demo database/volume has been replaced. No real catalogue or account has been created.'
