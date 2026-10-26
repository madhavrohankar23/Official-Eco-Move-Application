#requires -Version 7.0
param([string]$Architectures='arm64-v8a,x86_64')
$ErrorActionPreference='Stop'
$appRoot=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $appRoot
$env:EXPO_NO_DOTENV='1'
$env:EXPO_NO_TELEMETRY='1'
$env:NODE_ENV='production'
$env:GRADLE_USER_HOME=Join-Path $appRoot 'toolchain/gradle'
$nativeRoot=$appRoot
if($appRoot.Contains(' ')){
  foreach($mapping in (subst.exe)){
    if($mapping -match '^([A-Z]):\\: => (.+)$' -and $Matches[2] -eq $appRoot){$nativeRoot=$Matches[1]+':/';break}
  }
  if($nativeRoot -eq $appRoot){
    foreach($letter in @('M','N','O','P','Q','R','S','T','U')){
      if(-not (Test-Path ($letter+':/'))){
        & subst.exe ($letter+':') $appRoot
        if($LASTEXITCODE -eq 0){$nativeRoot=$letter+':/';break}
      }
    }
  }
  if($nativeRoot -eq $appRoot){throw 'No free drive alias is available for native Windows tools.'}
}
$localSdk=Join-Path $nativeRoot 'toolchain/android-sdk'
$env:GRADLE_USER_HOME=Join-Path $nativeRoot 'toolchain/gradle'
if(Test-Path -LiteralPath $localSdk){
  $env:ANDROID_HOME=$localSdk
  Set-Content -LiteralPath 'android/local.properties' -Value ('sdk.dir='+$localSdk.Replace('\','/')) -Encoding utf8
}
$env:ECO_NATIVE_STAGE=Join-Path $nativeRoot 'toolchain/cxx'
# Ninja retains absolute header paths independently of regenerated build.ninja.
# Discard only dependency indexes made before the short Gradle-cache alias.
$stage=Join-Path $appRoot 'toolchain/cxx'
if(Test-Path -LiteralPath $stage){
  $oldCache=$appRoot.Replace('\','/')+'/toolchain/gradle'
  Get-ChildItem -LiteralPath $stage -Filter '.ninja_deps' -Recurse -File | ForEach-Object {
    $resolved=[IO.Path]::GetFullPath($_.FullName)
    if(-not $resolved.StartsWith($appRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Native cache path escaped the app directory.'}
    if([Text.Encoding]::ASCII.GetString([IO.File]::ReadAllBytes($resolved)).Contains($oldCache)){
      Remove-Item -LiteralPath $resolved
      Write-Output 'Discarded a stale Ninja dependency index containing long Gradle-cache paths.'
    }
  }
}
if(-not $env:JAVA_HOME){$env:JAVA_HOME='C:/Program Files/Eclipse Adoptium/jdk-17.0.20.101-hotspot'}
node scripts/verify-source.cjs
if($LASTEXITCODE){throw 'Original source verification failed'}
npm run build:runtime
if($LASTEXITCODE){throw 'Runtime compilation failed'}
npm run typecheck
if($LASTEXITCODE){throw 'Type checking failed'}
& ./android/gradlew.bat -p android assembleRelease "-PreactNativeArchitectures=$Architectures" --max-workers=1 --console=plain
if($LASTEXITCODE){throw 'Android compilation failed'}
$apk=Join-Path $appRoot 'android/app/build/outputs/apk/release/app-release.apk'
Copy-Item -LiteralPath $apk -Destination (Join-Path $appRoot 'artifacts/Eco-Move-Nagpur.apk') -Force
$distDir=Join-Path $appRoot 'dist'
if(-not (Test-Path -LiteralPath $distDir)){ New-Item -ItemType Directory -Path $distDir -Force | Out-Null }
Copy-Item -LiteralPath $apk -Destination (Join-Path $distDir 'Eco-Move-Nagpur-Android.apk') -Force
& (Join-Path $PSScriptRoot 'verify-apk.ps1')
node scripts/verify-source.cjs
if($LASTEXITCODE){throw 'Final original source verification failed'}
