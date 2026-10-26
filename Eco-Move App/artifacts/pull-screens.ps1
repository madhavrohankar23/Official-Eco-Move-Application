$adb = 'C:\Users\LENOVO\AppData\Local\Android\Sdk\platform-tools\adb.exe'

# Pull proper binary screenshot of current state
& $adb shell screencap -p /sdcard/s1.png
& $adb pull /sdcard/s1.png artifacts/screen-plan-liquid.png
Copy-Item artifacts/screen-plan-liquid.png "C:\Users\LENOVO\.gemini\antigravity-ide\brain\5d4dee30-76bb-4a0c-8289-e1fd405ba67a\screen-plan-liquid.png" -Force

# Go back to Home
& $adb shell input tap 40 100
Start-Sleep -Seconds 2
& $adb shell screencap -p /sdcard/s2.png
& $adb pull /sdcard/s2.png artifacts/screen-home-liquid.png
Copy-Item artifacts/screen-home-liquid.png "C:\Users\LENOVO\.gemini\antigravity-ide\brain\5d4dee30-76bb-4a0c-8289-e1fd405ba67a\screen-home-liquid.png" -Force

# Log out to see Welcome screen
& $adb shell am start -n in.ecomove.nagpur/.MainActivity --es action logout
Start-Sleep -Seconds 2
& $adb shell screencap -p /sdcard/s3.png
& $adb pull /sdcard/s3.png artifacts/screen-welcome-liquid.png
Copy-Item artifacts/screen-welcome-liquid.png "C:\Users\LENOVO\.gemini\antigravity-ide\brain\5d4dee30-76bb-4a0c-8289-e1fd405ba67a\screen-welcome-liquid.png" -Force

Write-Host "Binary PNG screenshots pulled successfully."
