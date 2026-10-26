$adb = 'C:\Users\LENOVO\AppData\Local\Android\Sdk\platform-tools\adb.exe'
& $adb shell screencap -p /data/local/tmp/now.png
& $adb pull /data/local/tmp/now.png artifacts/screen-now.png
Copy-Item artifacts/screen-now.png "C:\Users\LENOVO\.gemini\antigravity-ide\brain\5d4dee30-76bb-4a0c-8289-e1fd405ba67a\screen-now.png" -Force
