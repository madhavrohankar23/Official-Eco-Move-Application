$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'

Write-Output "=== Tapping Chevron to expand sheet ==="
& $adb shell input tap 520 625
Start-Sleep -Seconds 2

Write-Output "=== Capturing screen ==="
& $adb shell screencap -p /data/local/tmp/screen.png
& $adb pull /data/local/tmp/screen.png artifacts/expanded-sheet.png
Write-Output "Done."
