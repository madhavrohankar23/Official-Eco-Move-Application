$adb = 'C:\Users\LENOVO\AppData\Local\Android\Sdk\platform-tools\adb.exe'

# Dismiss system dialog by pressing Back or tapping Wait
Write-Host "Dismissing system dialog..."
& $adb shell input keyevent 4
Start-Sleep -Seconds 1
& $adb shell input tap 360 560
Start-Sleep -Seconds 1

# Check if app is ready
Write-Host "Checking screen..."
& $adb shell screencap -p /data/local/tmp/dismissed.png
& $adb pull /data/local/tmp/dismissed.png artifacts/screen-dismissed.png
Copy-Item artifacts/screen-dismissed.png "C:\Users\LENOVO\.gemini\antigravity-ide\brain\5d4dee30-76bb-4a0c-8289-e1fd405ba67a\screen-dismissed.png" -Force
