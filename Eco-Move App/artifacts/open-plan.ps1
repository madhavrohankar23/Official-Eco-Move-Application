$adb = 'C:\Users\LENOVO\AppData\Local\Android\Sdk\platform-tools\adb.exe'

Write-Output "Tapping sheet-collapse at (506, 1292)..."
& $adb shell input tap 506 1292
Start-Sleep -Seconds 3

& $adb shell screencap -p /sdcard/screen.png
& $adb pull /sdcard/screen.png artifacts/screen-plan-uncollapsed.png
Write-Output "Captured to artifacts/screen-plan-uncollapsed.png"
