[CmdletBinding()]
param([switch]$SkipBuild,[switch]$CachedRuntime)
$ErrorActionPreference='Stop'
$demoRoot=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$demoArgs=@('compose','--project-name','carelink-sys03-demo','-f',(Join-Path $demoRoot 'deploy/sys03-demo/compose.yml'))
if($CachedRuntime) { $demoArgs+=@('-f',(Join-Path $demoRoot 'deploy/sys03-demo/compose.cached-runtime.yml')) }
$demoSha=& git -C $demoRoot rev-parse HEAD
if($LASTEXITCODE -ne 0) { throw 'Cannot determine source commit.' }
$demoDirty=& git -C $demoRoot status --porcelain
$env:SYS03_APP_COMMIT=if($demoDirty) { "$demoSha-dirty" } else { $demoSha }
$demoArgs+=@('up','-d','--wait','--wait-timeout','240')
if(-not $SkipBuild) { $demoArgs+='--build' }
& docker @demoArgs
if($LASTEXITCODE -ne 0) { throw 'SYS03 demo startup failed; inspect only this project logs.' }
Write-Output 'Ready: http://localhost:8082 (isolated 1-minute threshold / 5-second scanner).'
Write-Output 'Run scripts/prepare-sys03-demo.ps1 to create fictional identities and a real scheduled Visit.'
Write-Output 'No legacy volumes were repaired, deleted or reused.'
