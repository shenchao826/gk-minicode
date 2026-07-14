#!/bin/bash
# 岗策工具箱 - 一键部署脚本
# 使用方式：bash scripts/deploy.sh

echo "========================================"
echo "    岗策工具箱 - 部署脚本"
echo "========================================"

# 检查 wrangler 是否安装
if ! command -v wrangler &> /dev/null; then
    echo "[ERROR] wrangler 未安装，请先执行: npm install -g wrangler"
    exit 1
fi

# 登录 Cloudflare
echo "[INFO] 正在登录 Cloudflare..."
wrangler login

# 创建 D1 数据库
echo "[INFO] 创建 D1 数据库 gk-db..."
wrangler d1 create gk-db

# 执行建表脚本
echo "[INFO] 执行数据库初始化脚本..."
wrangler d1 execute gk-db --file database/init.sql

# 部署 Worker
echo "[INFO] 部署 Worker gk-api..."
cd worker && wrangler deploy

# 部署 Pages
echo "[INFO] 部署 Pages 前端..."
cd ../pages
wrangler pages deploy . --project-name gk-minicode --branch main

echo "[SUCCESS] 部署完成！"
echo "[INFO] 请手动完成以下配置："
echo "  1. 配置 Worker 环境变量 (SITE_DOMAIN, HUPIJIA_APP_ID, HUPIJIA_APP_SECRET, ADMIN_PASSWORD)"
echo "  2. 绑定 D1 数据库 (Binding name: DB)"
echo "  3. 配置 Pages 自定义域名"
echo "  4. 配置 DNS 解析 (CNAME gk -> xxx.pages.dev)"
echo "  5. 配置虎皮椒支付回调地址"