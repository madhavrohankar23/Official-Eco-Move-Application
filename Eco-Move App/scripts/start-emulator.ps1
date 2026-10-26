param(
  [ValidateSet('auto','host','swiftshader')][string]$Gpu='auto',
  [ValidateRange(1536,4096)][int]$MemoryMB=2048
)
$ErrorActionPreference='Stop'
$appRoot=Split-Path -Parent $PSScriptRoot
$installedSdk=Join-Path $env:LOCALAPPDATA 'Android/Sdk'
$env:ANDROID_HOME=Join-Path $appRoot 'toolchain/android-sdk'
$env:ANDROID_AVD_HOME=Join-Path $appRoot 'toolchain/avd'
$env:ANDROID_USER_HOME=Join-Path $appRoot 'toolchain/android-user'
$image=Join-Path $env:ANDROID_HOME 'system-images/android-35/google_apis/x86_64'
if(-not (Test-Path (Join-Path $image 'system.img'))){throw 'The app-local Android 35 Google APIs image is required.'}
$avd=Join-Path $env:ANDROID_AVD_HOME 'EcoMove35.avd'
New-Item -ItemType Directory -Force -Path $avd | Out-Null
if(-not (Test-Path (Join-Path $avd 'config.ini'))){
  @'
AvdId=EcoMove35
avd.ini.displayname=Eco-Move Android 35 QA
avd.ini.encoding=UTF-8
abi.type=x86_64
hw.cpu.arch=x86_64
hw.cpu.ncore=2
hw.ramSize=2048
hw.lcd.width=720
hw.lcd.height=1600
hw.lcd.density=320
hw.gpu.enabled=yes
hw.gpu.mode=swiftshader
hw.keyboard=yes
hw.gps=yes
hw.mainKeys=no
disk.dataPartition.size=4G
fastboot.forceColdBoot=yes
fastboot.forceFastBoot=no
image.sysdir.1=system-images/android-35/google_apis/x86_64/
tag.id=google_apis
tag.display=Google APIs
PlayStore.enabled=false
target=android-35
'@ | Set-Content -LiteralPath (Join-Path $avd 'config.ini') -Encoding utf8
}
@("avd.ini.encoding=UTF-8","path=$avd",'target=android-35') | Set-Content -LiteralPath (Join-Path $env:ANDROID_AVD_HOME 'EcoMove35.ini') -Encoding utf8
# Start-Process joins arguments into a command line; preserve the space in Eco-Move App.
Start-Process (Join-Path $installedSdk 'emulator/emulator.exe') -ArgumentList @('-avd','EcoMove35','-sysdir',('"'+$image+'"'),'-no-snapshot','-no-audio','-no-boot-anim','-memory',"$MemoryMB",'-cores','2','-gpu',$Gpu,'-feature','-Vulkan') -RedirectStandardOutput (Join-Path $appRoot 'artifacts/emulator35.log') -RedirectStandardError (Join-Path $appRoot 'artifacts/emulator35-error.log')
