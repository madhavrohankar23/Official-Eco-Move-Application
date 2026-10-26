$adb = 'C:\Users\LENOVO\AppData\Local\Android\Sdk\platform-tools\adb.exe'
Write-Output "Tapping demo account button at (360, 1240)..."
& $adb shell input tap 360 1240
Start-Sleep -Seconds 6
& $adb shell screencap -p /sdcard/screen.png
& $adb pull /sdcard/screen.png artifacts/screen-demo-tapped.png
Write-Output "Done tap-demo"
