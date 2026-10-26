$adb = 'C:\Users\LENOVO\AppData\Local\Android\Sdk\platform-tools\adb.exe'
Write-Output "Launching via monkey..."
& $adb shell monkey -p in.ecomove.nagpur -c android.intent.category.LAUNCHER 1
Start-Sleep -Seconds 5
& $adb shell screencap -p /sdcard/screen.png
& $adb pull /sdcard/screen.png artifacts/screen-welcome-clean.png
Write-Output "Screenshot captured!"
