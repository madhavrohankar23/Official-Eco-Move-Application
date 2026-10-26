$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'

Write-Output "Tapping 'Explore with the existing demo account' at (360, 1325)..."
& $adb shell input tap 360 1325

Start-Sleep -Seconds 6

Write-Output "Capturing screenshot..."
& $adb shell screencap -p /data/local/tmp/screen.png
& $adb pull /data/local/tmp/screen.png artifacts/main-app-screen.png

Write-Output "Dumping React Native Logs..."
& $adb logcat -d -t 40 -s ReactNativeJS:V
