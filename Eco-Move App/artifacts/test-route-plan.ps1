$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'

Write-Output "=== Swiping up inside the sheet to reveal Find Routes ==="
& $adb shell input swipe 360 1000 360 700 300
Start-Sleep -Seconds 1

Write-Output "=== Capturing screen to verify Find Routes button position ==="
& $adb shell screencap -p /data/local/tmp/screen.png
& $adb pull /data/local/tmp/screen.png artifacts/plan-scrolled.png
Write-Output "Done."
