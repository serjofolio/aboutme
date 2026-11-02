# 个人网站一键部署（在你自己的 Windows 电脑上运行）
# 一般直接双击 site 文件夹里的「一键部署.bat」即可，它会调用本脚本。
# 过程：打包网站 → 上传到服务器 → 在服务器上自动安装并启动
# 中途会让你输入两次服务器 root 密码（上传一次、安装一次），输入时屏幕不显示任何字符，是正常的。
param(
  [string]$Server = "",
  [int]$SshPort = 22,
  [int]$AppPort = 5200,
  [string]$Domain = "aboutme.hyff.cc.cd"
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $PSScriptRoot 'deploy.env'
if (-not $Server -and (Test-Path $envFile)) {
  $line = Get-Content $envFile | Where-Object { $_ -match '^DEPLOY_SERVER=' } | Select-Object -Last 1
  if ($line) { $Server = ($line -replace '^DEPLOY_SERVER=', '').Trim() }
}
if (-not $Server) { throw "没有找到服务器地址：请用记事本打开 site\deploy\deploy.env，写一行 DEPLOY_SERVER=root@服务器IP" }

foreach ($cmd in 'tar', 'scp', 'ssh') {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { throw "电脑缺少 $cmd 命令：请在「设置 → 应用 → 可选功能」里添加「OpenSSH 客户端」" }
}

Write-Host ""
Write-Host "  部署目标：$Server  →  https://$Domain" -ForegroundColor Yellow
Write-Host ""

$tmp = $env:TEMP
$bundle = Join-Path $tmp 'aboutme.tar.gz'
$installer = Join-Path $tmp 'aboutme-install.sh'
$conf = Join-Path $tmp 'aboutme-twin.json'

Write-Host "[1/3] 打包网站文件..." -ForegroundColor Cyan
if (Test-Path $bundle) { Remove-Item $bundle }
tar -czf $bundle --exclude=.git --exclude=data --exclude=deploy --exclude=*.bat --exclude=.gitignore -C $root .
if ($LASTEXITCODE -ne 0) { throw "打包失败" }
Write-Host ("      完成，大小 {0:N1} MB" -f ((Get-Item $bundle).Length / 1MB))

Copy-Item (Join-Path $PSScriptRoot 'install.sh') $installer -Force
$files = @($bundle, $installer)
$localConf = Join-Path $root 'data\twin.json'
if (Test-Path $localConf) {
  Copy-Item $localConf $conf -Force
  $files += $conf
  Write-Host "      已带上你在本地后台配置好的大模型（API Key 会加密传输到服务器）"
} else {
  Write-Host "      [注意] 本地还没有配置大模型，网站会先用本地知识库回答" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[2/3] 上传到服务器（请输入服务器 root 密码，输入时不显示字符，输完按回车）..." -ForegroundColor Cyan
scp -P $SshPort -o StrictHostKeyChecking=accept-new @files "${Server}:/tmp/"
$up = $LASTEXITCODE
if (Test-Path $conf) { Remove-Item $conf }
if ($up -ne 0) { throw "上传失败：请检查服务器 IP 和密码是否正确" }

Write-Host ""
Write-Host "[3/3] 在服务器上安装（请再输入一次 root 密码）..." -ForegroundColor Cyan
ssh -p $SshPort -t $Server "sed -i 's/\r$//' /tmp/aboutme-install.sh && PORT=$AppPort DOMAIN=$Domain bash /tmp/aboutme-install.sh; rc=`$?; rm -f /tmp/aboutme-install.sh; exit `$rc"
if ($LASTEXITCODE -ne 0) { throw "服务器安装出错：请把这个窗口截图发给帮你的人" }
