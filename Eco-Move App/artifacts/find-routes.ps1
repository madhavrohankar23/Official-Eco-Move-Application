$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'

Write-Output "=== Swiping sheet up slightly ==="
& $adb shell input swipe 360 1100 360 600 300
Start-Sleep -Seconds 1

Write-Output "=== Tapping Find Routes ==="
# Find routes button is centered at X=360, around Y=1100 after swipe
& $adb shell input tap 360 1100
Start-Sleep -Seconds 10

Write-Output "=== Capturing screen ==="
& $adb shell screencap -p /data/local/tmp/screen.png
& $adb pull /data/local/tmp/screen.png artifacts/calculated-routes.png

Write-Output "=== Dumping logcat ==="
& $adb logcat -d -t 40 -s ReactNativeJS:V
