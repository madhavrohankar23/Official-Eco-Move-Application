$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'

Write-Output "=== Swiping sheet up ==="
& $adb shell input swipe 360 1200 360 500 400
Start-Sleep -Seconds 2

Write-Output "=== Capturing screen ==="
& $adb shell screencap -p /data/local/tmp/screen.png
& $adb pull /data/local/tmp/screen.png artifacts/routes-visible.png
Write-Output "Done."
