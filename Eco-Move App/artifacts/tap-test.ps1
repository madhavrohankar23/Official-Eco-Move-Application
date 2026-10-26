$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
Write-Output "Tapping demo account button at (360, 1310)..."
& $adb shell input tap 360 1310
Start-Sleep -Seconds 6
Write-Output "Capturing screenshot..."
& $adb shell screencap -p /data/local/tmp/screen.png
& $adb pull /data/local/tmp/screen.png artifacts/after-tap.png
Write-Output "Done."
