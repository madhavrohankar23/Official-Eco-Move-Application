$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'

# Tap "Wait" on the dialog (360, 915)
Write-Output "Tapping 'Wait' on System UI dialog at (360, 915)..."
& $adb shell input tap 360 915
Start-Sleep -Seconds 1

# Tap "Explore with the existing demo account" (360, 1310)
Write-Output "Tapping 'Explore with the existing demo account' at (360, 1310)..."
& $adb shell input tap 360 1310
Start-Sleep -Seconds 6

# Capture screenshot
Write-Output "Capturing screenshot..."
& $adb shell screencap -p /data/local/tmp/screen.png
& $adb pull /data/local/tmp/screen.png artifacts/demo-logged-in.png
Write-Output "Done."
