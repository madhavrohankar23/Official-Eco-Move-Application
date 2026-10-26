$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'

Write-Output "=== Swiping sheet up to see journey cards ==="
& $adb shell input swipe 360 1300 360 400 400
Start-Sleep -Seconds 2

Write-Output "=== Capturing screen ==="
& $adb shell screencap -p /data/local/tmp/screen.png
& $adb pull /data/local/tmp/screen.png artifacts/journey-cards-visible.png
Write-Output "Done."
