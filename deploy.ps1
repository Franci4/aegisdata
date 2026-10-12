# 一键部署到 GitHub Pages
# 用法：powershell -ExecutionPolicy Bypass -File deploy.ps1 -Repo AegisData
#
# 前置条件（只需要做一次）：
#   1. 注册 GitHub 账号
#   2. 生成 Personal Access Token（勾选 repo 权限）
# 本脚本会自动完成：打包 → 建 git 仓库 → 提交 → 在 GitHub 建仓库 → 推送

param(
  [Parameter(Mandatory = $true)]
  [string]$Repo,

  [string]$User = '',

  [string]$Branch = 'main'
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
Set-Location $root

Write-Host "`n=== AegisData 部署到 GitHub Pages ===`n" -ForegroundColor Cyan

# ── 1. 打包单文件版 ────────────────────────────────────────────
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { $node = 'C:\Program Files\nodejs\node.exe' }
Write-Host '[1/6] 重新打包单文件版...'
& $node (Join-Path $root 'build-single.js')

# ── 2. git 身份（仅本仓库，不动你的全局配置） ──────────────────
Write-Host '[2/6] 配置本仓库的 git 身份...'
if (-not $User) { $User = Read-Host '请输入你的 GitHub 用户名' }
if (-not $User) { throw '必须提供 GitHub 用户名' }

git config user.name  $User
git config user.email "$User@users.noreply.github.com"

# ── 3. 初始化仓库 ──────────────────────────────────────────────
if (-not (Test-Path (Join-Path $root '.git'))) {
  Write-Host '[3/6] 初始化 git 仓库...'
  git init -b $Branch | Out-Null
} else {
  Write-Host '[3/6] git 仓库已存在，跳过初始化。'
}

# ── 4. 提交 ────────────────────────────────────────────────────
Write-Host '[4/6] 提交文件...'
git add -A
$pending = git status --porcelain
if ($pending) {
  git commit -m 'AegisData 第一阶段演示页面' | Out-Null
  Write-Host '      已提交。'
} else {
  Write-Host '      没有需要提交的改动。'
}

# ── 5. 建远端仓库并推送 ────────────────────────────────────────
Write-Host '[5/6] 推送...'
$remoteUrl = "https://github.com/$User/$Repo.git"
$existing = git remote 2>$null
if ($existing -contains 'origin') {
  git remote set-url origin $remoteUrl
} else {
  git remote add origin $remoteUrl
}

try {
  git push -u origin $Branch
  Write-Host '      推送完成。' -ForegroundColor Green
} catch {
  Write-Host "`n推送失败。常见原因：" -ForegroundColor Yellow
  Write-Host '  · 远端仓库还不存在 —— 请先到 https://github.com/new 建一个名为 ' -NoNewline
  Write-Host $Repo -ForegroundColor White -NoNewline
  Write-Host ' 的 Public 仓库，然后重新运行本脚本'
  Write-Host '  · 没有凭据 —— 推送时会弹窗要求登录，用户名填 GitHub 用户名，密码填 Personal Access Token'
  throw
}

# ── 6. 提示开启 Pages ──────────────────────────────────────────
Write-Host "`n[6/6] 最后一步（只需要做一次）：" -ForegroundColor Cyan
Write-Host "  打开 https://github.com/$User/$Repo/settings/pages"
Write-Host "  Source 选 Deploy from a branch"
Write-Host "  Branch 选 $Branch    目录选 / (root)"
Write-Host "  点 Save，等约 1 分钟后访问：`n"
Write-Host "  https://$User.github.io/$Repo/`n" -ForegroundColor Green
