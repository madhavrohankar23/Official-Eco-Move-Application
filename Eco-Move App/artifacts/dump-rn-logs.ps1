$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
# Dismiss any system dialog
& $adb shell input keyevent 4
Start-Sleep -Seconds 1
# Get logs with tag ReactNativeJS or chromium or ExpoAsset
& $adb logcat -d -s ReactNativeJS:V chromium:V ExpoAsset:V AndroidRuntime:E
