$ErrorActionPreference='Stop'
$appRoot=Split-Path -Parent $PSScriptRoot
$apk=Join-Path $appRoot 'artifacts/Eco-Move-Nagpur.apk'
if(-not (Test-Path -LiteralPath $apk)){throw 'APK artifact is missing.'}
$env:JAVA_HOME='C:/Program Files/Eclipse Adoptium/jdk-17.0.20.101-hotspot'
$buildTools=Join-Path $appRoot 'toolchain/android-sdk/build-tools/36.0.0'
$signature=& (Join-Path $buildTools 'apksigner.bat') verify --verbose $apk
if($LASTEXITCODE){throw 'APK signature verification failed.'}
$badging=& (Join-Path $buildTools 'aapt.exe') dump badging $apk
if($LASTEXITCODE){throw 'APK manifest could not be read.'}
if(-not ($badging -match "package: name='in.ecomove.nagpur'")){throw 'Unexpected package identity.'}
$abis=($badging | Where-Object {$_ -like 'native-code:*'}) -join ' '
if($abis -notmatch 'arm64-v8a' -or $abis -notmatch 'x86_64'){throw 'Required native architectures are missing.'}
$file=Get-Item -LiteralPath $apk
$hasher=[Security.Cryptography.SHA256]::Create()
$stream=[IO.File]::OpenRead($apk)
try {$sha256=[BitConverter]::ToString($hasher.ComputeHash($stream)).Replace('-','')}
finally {$stream.Dispose();$hasher.Dispose()}
$result=[ordered]@{
  path=$file.FullName
  bytes=$file.Length
  sha256=$sha256
  modifiedUtc=$file.LastWriteTimeUtc.ToString('o')
  verifiedUtc=[DateTime]::UtcNow.ToString('o')
  signatureVerified=$true
  manifest=@($badging | Where-Object {$_ -match '^(package:|sdkVersion:|targetSdkVersion:|native-code:)'})
  signatureDetails=@($signature)
}
$result | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $appRoot 'artifacts/apk-verification.json') -Encoding utf8
$result | ConvertTo-Json -Depth 4
