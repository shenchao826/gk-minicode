param(
    [string]$Version = "v1.0.0",
    [string]$CloudflareToken = $env:CLOUDFLARE_API_TOKEN,
    [string]$AccountId = $env:CLOUDFLARE_ACCOUNT_ID,
    [string]$ProjectName = "gk-minicode-pages"
)

Write-Host "========================================"
Write-Host "  国考资料工具 - 回滚脚本"
Write-Host "========================================"
Write-Host ""

if (-not $CloudflareToken) {
    Write-Host "错误: 请设置 CLOUDFLARE_API_TOKEN 环境变量" -ForegroundColor Red
    exit 1
}

if (-not $AccountId) {
    Write-Host "错误: 请设置 CLOUDFLARE_ACCOUNT_ID 环境变量" -ForegroundColor Red
    exit 1
}

Write-Host "回滚目标版本: $Version" -ForegroundColor Cyan

Write-Host ""
Write-Host "[1/3] 本地 git 回滚..." -ForegroundColor Yellow
try {
    git checkout $Version
    Write-Host "  ✓ 本地代码已回滚到 $Version" -ForegroundColor Green
} catch {
    Write-Host "  ✗ git 回滚失败: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[2/3] 获取 Cloudflare Pages 部署列表..." -ForegroundColor Yellow
try {
    $deployments = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$AccountId/pages/projects/$ProjectName/deployments" -Headers @{
        "Authorization" = "Bearer $CloudflareToken"
        "Content-Type" = "application/json"
    }

    if ($deployments.success -eq $true) {
        Write-Host "  ✓ 成功获取部署列表" -ForegroundColor Green
        $deployments.result | ForEach-Object {
            Write-Host "    - $($_.id) | $($_.branch) | $($_.created_on)"
        }
    } else {
        Write-Host "  ✗ 获取部署列表失败: $($deployments.errors)" -ForegroundColor Red
    }
} catch {
    Write-Host "  ✗ API 请求失败: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "[3/3] 提示: 如需回滚 Cloudflare Pages 部署" -ForegroundColor Yellow
Write-Host "请手动访问: https://dash.cloudflare.com/$AccountId/pages/view/$ProjectName/deployments"
Write-Host "选择目标部署版本后点击 'Activate deployment'" -ForegroundColor Cyan

Write-Host ""
Write-Host "========================================"
Write-Host "  回滚完成!" -ForegroundColor Green
Write-Host "  本地代码版本: $Version" -ForegroundColor Green
Write-Host "========================================"
