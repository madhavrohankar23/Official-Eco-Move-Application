$adb = 'C:\Users\LENOVO\AppData\Local\Android\Sdk\platform-tools\adb.exe'
Write-Output "Tapping chevron at (500, 805)..."
& $adb shell input tap 500 805
Start-Sleep -Seconds 3
& $adb shell screencap -p /sdcard/screen.png
& $adb pull /sdcard/screen.png artifacts/screen-home-sheet-opened.png
Write-Output "Opened sheet captured!"
