$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
Write-Output "Waiting for device..."
& $adb wait-for-device
Write-Output "Device online. Checking boot_completed..."
for ($i = 0; $i -lt 60; $i++) {
    $val = (& $adb shell getprop sys.boot_completed 2>$null)
    if ($val -and $val.Trim() -eq '1') {
        Write-Output "Boot completed!"
        exit 0
    }
    Start-Sleep -Seconds 2
}
Write-Output "Timeout waiting for boot."
