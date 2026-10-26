$adb = 'C:\Users\LENOVO\AppData\Local\Android\Sdk\platform-tools\adb.exe'
Write-Output "Tapping to expand sheet..."
& $adb shell input tap 360 700
Start-Sleep -Seconds 3
& $adb shell screencap -p /sdcard/screen.png
& $adb pull /sdcard/screen.png artifacts/screen-home-sheet-expanded.png
Write-Output "Expanded sheet captured!"
