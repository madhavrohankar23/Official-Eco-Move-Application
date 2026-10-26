$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
Write-Output "Installing APK..."
& $adb install -r -d 'artifacts/Eco-Move-Nagpur.apk'
Write-Output "Restarting App..."
& $adb shell am force-stop in.ecomove.nagpur
& $adb shell am start -n in.ecomove.nagpur/.MainActivity
Start-Sleep -Seconds 4
Write-Output "Capturing screenshot..."
& $adb shell screencap -p /sdcard/screen.png
& $adb pull /sdcard/screen.png artifacts/screen-latest-ready.png
Write-Output "Done!"
