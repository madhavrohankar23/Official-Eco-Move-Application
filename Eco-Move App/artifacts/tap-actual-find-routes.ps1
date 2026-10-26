$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'

Write-Output "=== Tapping 'Find routes' at (360, 1280) ==="
& $adb shell input tap 360 1280

Write-Output "=== Waiting 12 seconds for calculation ==="
Start-Sleep -Seconds 12

Write-Output "=== Capturing screen ==="
& $adb shell screencap -p /data/local/tmp/screen.png
& $adb pull /data/local/tmp/screen.png artifacts/routes-planned-success.png

Write-Output "=== Dumping React Native logcat ==="
& $adb logcat -d -t 50 -s ReactNativeJS:V
