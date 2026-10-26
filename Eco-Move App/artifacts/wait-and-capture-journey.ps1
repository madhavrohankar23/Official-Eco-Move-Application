$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'

Write-Output "Waiting 12 seconds for calculation..."
Start-Sleep -Seconds 12

Write-Output "Capturing screen..."
& $adb shell screencap -p /data/local/tmp/screen.png
& $adb pull /data/local/tmp/screen.png artifacts/calculated-journey-results.png
Write-Output "Done."
