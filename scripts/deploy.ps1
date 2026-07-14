param(
    [string]$Version = "v1.0.0",
    [string]$Message = "部署更新"
)

Write-Host "========================================"
Write-Host "  国考资料工具 - 部署脚本"
Write-Host "========================================"
Write-Host ""

Write-Host "[1/4] 检查 git 状态..." -ForegroundColor Yellow
git status

Write-Host ""
Write-Host "[2/4] 添加并提交代码..." -ForegroundColor Yellow
git add -A
git commit -m "$Message"
$commitHash = git rev-parse --short HEAD
Write-Host "  ✓ 提交完成: $commitHash" -ForegroundColor Green

Write-Host ""
Write-Host "[3/4] 推送代码到远程..." -ForegroundColor Yellow
git push origin main
Write-Host "  ✓ 推送完成" -ForegroundColor Green

Write-Host ""
Write-Host "[4/4] 创建版本标签..." -ForegroundColor Yellow
git tag $Version
git push origin $Version
Write-Host "  ✓ 版本标签 $Version 已创建并推送" -ForegroundColor Green

Write-Host ""
Write-Host "========================================"
Write-Host "  部署完成!" -ForegroundColor Green
Write-Host "  提交: $commitHash" -ForegroundColor Green
Write-Host "  版本: $Version" -ForegroundColor Green
Write-Host "========================================"
Write-Host ""
Write-Host "Cloudflare Pages 将自动部署, 等待几分钟后访问:" -ForegroundColor Cyan
Write-Host "  https://gk.minicode.cloud" -ForegroundColor Cyan
