# AegisData 一键部署到 GitHub Pages
#
# 用法：
#   powershell -ExecutionPolicy Bypass -File deploy.ps1 -User 你的GitHub用户名 -Repo aegisdata
#
# 前置条件（只需要做一次）：
#   1. 注册 GitHub 账号
#   2. 生成 Personal Access Token（勾选 repo 权限）
#   3. 在 https://github.com/new 建一个 Public 仓库（不要勾选任何初始化选项）
#
# 本脚本会：重新打包单文件版 → 提交改动 → 推送。
# 推送时会弹窗要求登录：用户名填 GitHub 用户名，密码填 Personal Access Token。

param(
  [Parameter(Mandatory = $true)][string]$User,
  [Parameter(Mandatory = $true)][string]$Repo,
  [string]$Branch = 'main'
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

Write-Host "`n=== AegisData 部署到 GitHub Pages ===`n" -ForegroundColor Cyan

# ── 1. 重新打包单文件版 ────────────────────────────────────────
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { $node = 'C:\Program Files\nodejs\node.exe' }
Write-Host '[1/5] 重新打包单文件版...'
& $node (Join-Path $PSScriptRoot 'build-single.js')

# ── 2. 本仓库 git 身份（不改动全局配置） ───────────────────────
Write-Host '[2/5] 配置本仓库 git 身份...'
git config user.name  $User
git config user.email "$User@users.noreply.github.com"
git config core.autocrlf false

# ── 3. 提交 ────────────────────────────────────────────────────
Write-Host '[3/5] 提交改动...'
git add -A
if (git status --porcelain) {
  git commit -m '更新 AegisData 演示页面' | Out-Null
  Write-Host '      已提交。'
} else {
  Write-Host '      没有需要提交的改动。'
}

# ── 4. 设置远端 ────────────────────────────────────────────────
$remoteUrl = "https://github.com/$User/$Repo.git"
Write-Host "[4/5] 远端地址：$remoteUrl"
if ((git remote) -contains 'origin') {
  git remote set-url origin $remoteUrl
} else {
  git remote add origin $remoteUrl
}

# ── 5. 推送 ────────────────────────────────────────────────────
Write-Host '[5/5] 推送（若弹窗请用 Token 作为密码）...'
Push-Location $PSScriptRoot
$ErrorActionPreference = 'Continue'
& git push -u origin $Branch
$code = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
Pop-Location

if ($code -ne 0) {
  Write-Host "`n推送失败。请检查：" -ForegroundColor Yellow
  Write-Host "  · 仓库 https://github.com/$User/$Repo 是否已经建好（必须是 Public）"
  Write-Host '  · 弹窗登录时：用户名填 GitHub 用户名，密码填 Personal Access Token（不是账号密码）'
  exit 1
}

Write-Host "`n推送成功。" -ForegroundColor Green
Write-Host "`n如果这是首次部署，请开启 Pages（只做一次）：" -ForegroundColor Cyan
Write-Host "  https://github.com/$User/$Repo/settings/pages"
Write-Host '  Source: Deploy from a branch  /  Branch: ' -NoNewline
Write-Host "$Branch" -NoNewline
Write-Host '  /  Folder: / (root)  → Save'
Write-Host "`n约 1 分钟后访问：" -ForegroundColor Cyan
Write-Host "  https://$User.github.io/$Repo/`n" -ForegroundColor Green
