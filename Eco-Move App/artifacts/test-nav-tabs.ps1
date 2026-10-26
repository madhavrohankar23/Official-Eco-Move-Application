$adb = 'C:\Users\LENOVO\AppData\Local\Android\Sdk\platform-tools\adb.exe'

# Tap nav-plan
Write-Output "Tapping Plan tab..."
& $adb shell input tap 237 1450
Start-Sleep -Seconds 3
& $adb shell screencap -p /sdcard/screen.png
& $adb pull /sdcard/screen.png artifacts/screen-plan-tab.png

# Tap nav-nearby
Write-Output "Tapping Nearby tab..."
& $adb shell input tap 362 1450
Start-Sleep -Seconds 3
& $adb shell screencap -p /sdcard/screen.png
& $adb pull /sdcard/screen.png artifacts/screen-nearby-tab.png

# Tap nav-trips
Write-Output "Tapping Trips tab..."
& $adb shell input tap 486 1450
Start-Sleep -Seconds 3
& $adb shell screencap -p /sdcard/screen.png
& $adb pull /sdcard/screen.png artifacts/screen-trips-tab.png

# Tap nav-profile
Write-Output "Tapping Profile tab..."
& $adb shell input tap 611 1450
Start-Sleep -Seconds 3
& $adb shell screencap -p /sdcard/screen.png
& $adb pull /sdcard/screen.png artifacts/screen-profile-tab.png

Write-Output "All tabs captured!"
