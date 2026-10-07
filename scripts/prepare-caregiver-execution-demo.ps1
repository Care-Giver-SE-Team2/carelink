[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$demoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$demoCompose = Join-Path $demoRoot 'deploy/caregiver-demo/compose.yml'
$demoSqlArgs = @('compose','--project-name','carelink-caregiver-demo','-f',$demoCompose,'exec','-T','db','mysql','-ucarelink','-plocal-demo-db','-N','-B','carelink')
Get-Content -LiteralPath (Join-Path $demoRoot 'backend/src/main/resources/db/demo/caregiver-execution-people.sql') -Raw -Encoding UTF8 | & docker @demoSqlArgs
if ($LASTEXITCODE -ne 0) { throw 'Synthetic identity setup failed; do not proceed.' }
$demoIds = "SELECT (SELECT MIN(id) FROM elder WHERE full_name='Execution Demo Elder'),(SELECT c.id FROM caregiver c JOIN app_user u ON u.id=c.user_id WHERE u.username='demo-exec-cg-a');" | & docker @demoSqlArgs
if ($LASTEXITCODE -ne 0) { throw 'Demo identity lookup failed.' }
$demoParts = ($demoIds | Select-Object -Last 1).Split("`t")
$demoElder = [long]$demoParts[0]
$demoCaregiver = [long]$demoParts[1]
$demoSession = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
$demoBase = 'http://127.0.0.1:8081'
function Invoke-DemoCommand([string]$Method,[string]$Path,$Body) {
    Invoke-RestMethod "$demoBase/api/auth/csrf" -WebSession $demoSession | Out-Null
    $demoToken = $demoSession.Cookies.GetCookies([uri]$demoBase) | Where-Object Name -eq 'XSRF-TOKEN' | Select-Object -First 1
    if (-not $demoToken) { throw 'Missing CSRF cookie.' }
    Invoke-RestMethod "$demoBase$Path" -Method $Method -WebSession $demoSession -Headers @{'X-XSRF-TOKEN'=$demoToken.Value} -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 12 -Compress)
}
Invoke-DemoCommand 'POST' '/api/auth/login' @{username='demo-exec-manager';password='Demo#2026'} | Out-Null
Invoke-DemoCommand 'PUT' "/api/elders/$demoElder/primary-caregiver" @{caregiverId=$demoCaregiver} | Out-Null
$demoStart = [TimeZoneInfo]::ConvertTimeFromUtc([DateTime]::UtcNow,[TimeZoneInfo]::FindSystemTimeZoneById('Singapore Standard Time')).AddMinutes(2)
$demoStart = $demoStart.AddSeconds(-$demoStart.Second).AddMilliseconds(-$demoStart.Millisecond)
$demoPlan = Invoke-DemoCommand 'POST' '/api/care-plans' @{elderId=$demoElder}
$demoNode = @{groupName='Personal care';name='Execution demo care routine';evidenceType='CHECKLIST';visits=@(@{day=$demoStart.DayOfWeek.ToString().ToUpperInvariant();startTime=$demoStart.ToString('HH:mm:ss');minutes=60})}
Invoke-DemoCommand 'POST' "/api/care-plans/$($demoPlan.id)/publish" @{startDate=$demoStart.ToString('yyyy-MM-dd');nodes=@($demoNode)} | Out-Null
$demoVisits = @(Invoke-RestMethod "$demoBase/api/visits/roster?date=$($demoStart.ToString('yyyy-MM-dd'))" -WebSession $demoSession) | Where-Object { $_.elderId -eq $demoElder -and $_.carePlanId -eq $demoPlan.id }
Write-Output "Server day: $($demoStart.ToString('yyyy-MM-dd')); start: $demoStart; plan: $($demoPlan.id)"
$demoVisits | ConvertTo-Json -Depth 8
Write-Output 'Created by real manager HTTP assignment/publication. No check-in/task/incident SQL.'
Write-Output 'LOCAL ONLY: demo-exec-cg-a / demo-exec-cg-b / demo-exec-manager / demo-exec-family; password Demo#2026'
