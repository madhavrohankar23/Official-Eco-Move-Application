$ErrorActionPreference = 'Continue'
$appRoot = (Get-Item .).FullName
$installedSdk = Join-Path $env:LOCALAPPDATA 'Android/Sdk'
$env:ANDROID_HOME = Join-Path $appRoot 'toolchain/android-sdk'
$env:ANDROID_AVD_HOME = Join-Path $appRoot 'toolchain/avd'
$env:ANDROID_USER_HOME = Join-Path $appRoot 'toolchain/android-user'
$image = Join-Path $env:ANDROID_HOME 'system-images/android-35/google_apis/x86_64'
$emu = Join-Path $installedSdk 'emulator/emulator.exe'
Write-Output "Running emulator from: $emu"
Write-Output "Image exists: $(Test-Path (Join-Path $image 'system.img'))"
Write-Output "AVD ini exists: $(Test-Path (Join-Path $env:ANDROID_AVD_HOME 'EcoMove35.ini'))"
& $emu -avd EcoMove35 -sysdir $image -no-snapshot -no-audio -no-boot-anim -memory 2048 -cores 2 -gpu swiftshader -feature -Vulkan
Write-Output "Exit code: $LASTEXITCODE"
