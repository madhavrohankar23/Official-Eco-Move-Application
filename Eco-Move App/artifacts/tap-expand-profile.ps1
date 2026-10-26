$adb = 'C:\Users\LENOVO\AppData\Local\Android\Sdk\platform-tools\adb.exe'
Write-Output "Tapping chevron at (500, 430)..."
& $adb shell input tap 500 430
Start-Sleep -Seconds 3
& $adb shell screencap -p /sdcard/screen.png
& $adb pull /sdcard/screen.png artifacts/screen-profile-expanded.png
Write-Output "Profile expanded captured!"
