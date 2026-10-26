$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'

Write-Output "=== Tapping 'Find routes' at (360, 785) ==="
& $adb shell input tap 360 785

Write-Output "=== Waiting 12 seconds for route calculation and enrichment ==="
Start-Sleep -Seconds 12

Write-Output "=== Capturing screen ==="
& $adb shell screencap -p /data/local/tmp/screen.png
& $adb pull /data/local/tmp/screen.png artifacts/journey-results.png
Write-Output "Done."
