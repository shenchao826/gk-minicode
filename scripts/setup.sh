#!/bin/bash
# 岗策工具箱 - 本地环境初始化脚本
# 使用方式：bash scripts/setup.sh

echo "========================================"
echo "    岗策工具箱 - 环境初始化"
echo "========================================"

# 检查 Node.js
echo "[INFO] 检查 Node.js 环境..."
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js 未安装，请先安装 Node.js"
    exit 1
fi
echo "[INFO] Node.js 版本: $(node -v)"

# 安装 wrangler
echo "[INFO] 安装 Cloudflare Wrangler..."
npm install -g wrangler
echo "[INFO] Wrangler 版本: $(wrangler -v)"

# 创建目录结构
echo "[INFO] 创建项目目录结构..."
mkdir -p database worker pages/css pages/js docs scripts prompts materials

# 初始化 wrangler 项目
echo "[INFO] 初始化 Worker 项目..."
cd worker
wrangler init --template=hello-world
cd ..

echo "[SUCCESS] 环境初始化完成！"
echo "[INFO] 项目结构已创建，可开始开发部署"