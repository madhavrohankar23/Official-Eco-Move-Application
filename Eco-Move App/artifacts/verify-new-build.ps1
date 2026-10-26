$ErrorActionPreference = 'Stop'
$adb = 'C:\Users\LENOVO\AppData\Local\Android\Sdk\platform-tools\adb.exe'
$apk = 'dist\Eco-Move-Nagpur-Android.apk'

Write-Host "Installing $apk..."
& $adb install -r $apk

Write-Host "Launching in.ecomove.nagpur/.MainActivity..."
& $adb shell am force-stop in.ecomove.nagpur
Start-Sleep -Seconds 1
& $adb shell am start -n in.ecomove.nagpur/.MainActivity

Write-Host "Waiting for welcome screen..."
Start-Sleep -Seconds 7

& $adb exec-out screencap -p > artifacts/screen-welcome-liquid.png
Copy-Item artifacts/screen-welcome-liquid.png "C:\Users\LENOVO\.gemini\antigravity-ide\brain\5d4dee30-76bb-4a0c-8289-e1fd405ba67a\screen-welcome-liquid.png" -Force

Write-Host "Tapping Demo Account..."
& $adb shell input tap 360 1240
Start-Sleep -Seconds 5

& $adb exec-out screencap -p > artifacts/screen-home-liquid.png
Copy-Item artifacts/screen-home-liquid.png "C:\Users\LENOVO\.gemini\antigravity-ide\brain\5d4dee30-76bb-4a0c-8289-e1fd405ba67a\screen-home-liquid.png" -Force

Write-Host "Tapping Find Routes..."
& $adb shell input tap 360 1150
Start-Sleep -Seconds 4

& $adb exec-out screencap -p > artifacts/screen-plan-liquid.png
Copy-Item artifacts/screen-plan-liquid.png "C:\Users\LENOVO\.gemini\antigravity-ide\brain\5d4dee30-76bb-4a0c-8289-e1fd405ba67a\screen-plan-liquid.png" -Force

Write-Host "Screenshots captured successfully."
