$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'

Write-Output "=== Clearing logcat ==="
& $adb logcat -c

Write-Output "=== Tapping 'Find routes' at (360, 785) ==="
& $adb shell input tap 360 785
Start-Sleep -Seconds 8

Write-Output "=== Logcat for plan ==="
& $adb logcat -d -s ReactNativeJS:V chromium:V
