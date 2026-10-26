$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
Write-Output "=== Top Activity ==="
& $adb shell dumpsys activity activities | Select-String "topResumedActivity|mResumedActivity"
Write-Output "=== Logcat tail ==="
& $adb logcat -d -t 30
