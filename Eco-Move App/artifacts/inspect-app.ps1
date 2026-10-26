$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
Write-Output "=== Checking Packages ==="
& $adb shell pm list packages in.ecomove.nagpur

Write-Output "=== Installing APK ==="
& $adb install -r -d artifacts/Eco-Move-Nagpur.apk

Write-Output "=== Clearing Logcat ==="
& $adb logcat -c

Write-Output "=== Starting MainActivity ==="
& $adb shell am start -n in.ecomove.nagpur/.MainActivity

Write-Output "=== Waiting 12 seconds ==="
Start-Sleep -Seconds 12

Write-Output "=== Taking Screenshot ==="
& $adb shell screencap -p /sdcard/screen.png
& $adb pull /sdcard/screen.png artifacts/current-screen.png

Write-Output "=== Dumping React/Chromium Logs ==="
& $adb logcat -d -s ReactNative:V ReactNativeJS:V chromium:V ExpoAsset:V AndroidRuntime:E
