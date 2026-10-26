$adb = 'C:\Users\LENOVO\AppData\Local\Android\Sdk\platform-tools\adb.exe'
& $adb devices
$proc = & $adb shell "ps -A"
$proc | Select-String -Pattern "dex2oat|pm|in.ecomove"
