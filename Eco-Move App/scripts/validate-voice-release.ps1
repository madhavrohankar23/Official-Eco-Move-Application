#requires -Version 7.0
param([switch]$ApkOnly)
$ErrorActionPreference='Stop'
$appRoot=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $appRoot
$result=[ordered]@{startedUtc=[DateTime]::UtcNow.ToString('o');export='pending';apk='pending';error=$null}
if($ApkOnly){
  $previous=Get-Content artifacts/voice-release-status.json -Raw | ConvertFrom-Json
  if($previous.export -ne 'passed' -or -not (Test-Path artifacts/voice-final-export/metadata.json)){
    throw 'APK-only validation requires a completed platform export.'
  }
  $result.export='passed'
  $result.exportReused=$true
  Copy-Item artifacts/voice-release-status.json artifacts/voice-release-previous-status.json -Force
  Copy-Item artifacts/voice-android-build.log artifacts/voice-android-previous-build.log -Force
}
$result | ConvertTo-Json | Set-Content artifacts/voice-release-status.json -Encoding utf8
$env:EXPO_NO_DOTENV='1'
$env:EXPO_NO_TELEMETRY='1'
$env:JAVA_HOME='C:/Program Files/Eclipse Adoptium/jdk-17.0.20.101-hotspot'
try {
  if(-not $ApkOnly){
  npm run typecheck *> artifacts/voice-typecheck.log
  if($LASTEXITCODE){throw 'Type checking failed.'}
  npm run build:runtime *> artifacts/voice-runtime-build.log
  if($LASTEXITCODE){throw 'Runtime compilation failed.'}
  node node_modules/expo/bin/cli export --platform all --output-dir artifacts/voice-final-export *> artifacts/voice-export.log
  if($LASTEXITCODE){throw 'Platform export failed.'}
  Copy-Item -Path 'artifacts/voice-final-export/*' -Destination artifacts/final-export -Recurse -Force
  $result.export='passed'
  $result | ConvertTo-Json | Set-Content artifacts/voice-release-status.json -Encoding utf8
  }
  & (Join-Path $PSScriptRoot 'build-android.ps1') *> artifacts/voice-android-build.log
  if($LASTEXITCODE){throw 'Android build failed.'}
  $result.apk='passed'
} catch {
  $result.error=$_.Exception.Message
  if($result.export -eq 'pending'){$result.export='failed'}else{$result.apk='failed'}
} finally {
  $result.finishedUtc=[DateTime]::UtcNow.ToString('o')
  $result | ConvertTo-Json | Set-Content artifacts/voice-release-status.json -Encoding utf8
}
if($result.error){exit 1}
