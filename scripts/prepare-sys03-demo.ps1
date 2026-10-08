[CmdletBinding()]
param([int]$StartInMinutes = 2)
$ErrorActionPreference = 'Stop'
if ($StartInMinutes -lt 1) { throw 'StartInMinutes must be positive.' }
$demoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$demoCompose = Join-Path $demoRoot 'deploy/sys03-demo/compose.yml'
$demoSqlArgs = @('compose','--project-name','carelink-sys03-demo','-f',$demoCompose,'exec','-T','db','mysql','-ucarelink','-plocal-sys03-db','-N','-B','carelink')
# Synthetic identities only; no SQL business outcomes.
Get-Content -LiteralPath (Join-Path $demoRoot 'backend/src/main/resources/db/demo/caregiver-execution-people.sql') -Raw -Encoding UTF8 | & docker @demoSqlArgs
if ($LASTEXITCODE -ne 0) { throw 'Synthetic identity setup failed.' }
$demoIds = "SELECT (SELECT MIN(id) FROM elder WHERE full_name='Execution Demo Elder'),(SELECT c.id FROM caregiver c JOIN app_user u ON u.id=c.user_id WHERE u.username='demo-exec-cg-a');" | & docker @demoSqlArgs
if ($LASTEXITCODE -ne 0) { throw 'Demo identity lookup failed.' }
$demoParts = ($demoIds | Select-Object -Last 1).Split("`t")
$demoElder = [long]$demoParts[0]; $demoCaregiver = [long]$demoParts[1]
$demoSession = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
$demoBase = 'http://127.0.0.1:8082'
function Invoke-DemoCommand([string]$Method,[string]$Path,$Body) {
    Invoke-RestMethod "$demoBase/api/auth/csrf" -WebSession $demoSession | Out-Null
    $demoToken = $demoSession.Cookies.GetCookies([uri]$demoBase) | Where-Object Name -eq 'XSRF-TOKEN' | Select-Object -First 1
    if (-not $demoToken) { throw 'Missing CSRF cookie.' }
    Invoke-RestMethod "$demoBase$Path" -Method $Method -WebSession $demoSession -Headers @{'X-XSRF-TOKEN'=$demoToken.Value} -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 12 -Compress)
}
Invoke-DemoCommand 'POST' '/api/auth/login' @{username='demo-exec-manager';password='Demo#2026'} | Out-Null
Invoke-DemoCommand 'PUT' "/api/elders/$demoElder/primary-caregiver" @{caregiverId=$demoCaregiver} | Out-Null
$demoStart = [TimeZoneInfo]::ConvertTimeFromUtc([DateTime]::UtcNow,[TimeZoneInfo]::FindSystemTimeZoneById('Singapore Standard Time')).AddMinutes($StartInMinutes)
$demoStart = $demoStart.AddSeconds(-$demoStart.Second).AddMilliseconds(-$demoStart.Millisecond)
$demoPlan = Invoke-DemoCommand 'POST' '/api/care-plans' @{elderId=$demoElder}
$demoNode = @{groupName='Personal care';name='SYS03 demo care routine';evidenceType='CHECKLIST';visits=@(@{day=$demoStart.DayOfWeek.ToString().ToUpperInvariant();startTime=$demoStart.ToString('HH:mm:ss');minutes=60})}
Invoke-DemoCommand 'POST' "/api/care-plans/$($demoPlan.id)/publish" @{startDate=$demoStart.ToString('yyyy-MM-dd');nodes=@($demoNode)} | Out-Null
$demoRoster = Invoke-RestMethod "$demoBase/api/visits/roster?date=$($demoStart.ToString('yyyy-MM-dd'))" -WebSession $demoSession
$demoVisits = @($demoRoster | Where-Object { $_.elderId -eq $demoElder -and $_.carePlanId -eq $demoPlan.id })
if ($demoVisits.Count -ne 1) { throw 'Expected exactly one Visit from the newly published demo plan.' }
Write-Output "Server day: $($demoStart.ToString('yyyy-MM-dd')); start: $demoStart; plan: $($demoPlan.id)"
$demoVisits | ConvertTo-Json -Depth 8
Write-Output 'Created through real manager assignment/publication; wait without checking in for SYS03.'
Write-Output 'LOCAL ONLY: 1-minute lateness, 5-second scan. Production defaults: 10 minutes / 60 seconds.'
Write-Output 'http://localhost:8082; demo-exec-cg-a / demo-exec-manager / demo-exec-family; password Demo#2026'
