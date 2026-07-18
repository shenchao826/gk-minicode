# 岗策工具箱 - 配置检查清单

## 上线前必查项

### D1 数据库 ✅
- [ ] 创建数据库 `gk-db`（ID: `7e9e2bc1-cc6c-4889-8bcc-a697961559d4`）
- [ ] 执行 `database/init.sql` 或访问 `/api/init-db` 建表
- [ ] 确认所有表已创建：goods、card、orders、users、members、distributors、referral_orders、monthly_updates
- [ ] 确认商品数据已插入（5条基础商品）

### Pages 前端 + Functions ✅
- [ ] 项目名称 `gk-minicode-pages`
- [ ] 上传 `pages/` 目录所有文件（含 `functions/api/[[path]].js`）
- [ ] 绑定 D1 数据库：Binding name = `DB`，Database = `gk-db`
- [ ] 配置环境变量：
  - [ ] SITE_DOMAIN = `https://gk.minicode.cloud`
  - [ ] HUPIJIA_APP_ID = `201906179658`
- [ ] 配置 Secrets（`wrangler pages secret put`）：
  - [ ] HUPIJIA_APP_SECRET
  - [ ] ADMIN_PASSWORD
- [ ] 绑定自定义域名 `gk.minicode.cloud`
- [ ] 开启 Always use HTTPS

### Worker 备用 ✅
- [ ] Worker 名称 `gk-api`
- [ ] 同 Pages 一样配置 D1 绑定和 Secrets
- [ ] 定时任务 crons = `0 0 1 * *`

### DNS 解析 ✅
- [ ] CNAME：`gk` → `gk-minicode-pages.pages.dev`，Proxy = 已代理

### 虎皮椒支付 ✅
- [ ] AppID: `201906179658` 已配置
- [ ] AppSecret: `d097ec838557c0f3aaebc5c5a00a7aab` 已配置
- [ ] 回调地址：`https://gk.minicode.cloud/api/callback`
- [ ] ⚠️ 回调状态字段用 `status === 'OD'`（不是 `trade_status === 'TRADE_SUCCESS'`）
- [ ] ⚠️ 查询API参数用 `out_trade_order` + `time` + `nonce_str`（不是 `trade_order_id`）

### 前端配置 ✅
- [ ] `apiPrefix = "/api"`（同域名，不要用跨域子域名）
- [ ] `index.html` 中 `main.js` 版本号 `?v=xxxxx`

### 后台数据 ✅
- [ ] 为每个商品导入卡密（网盘链接 | 提取码）
- [ ] 测试下单流程完整跑通
- [ ] 测试支付回调可正常更新订单
- [ ] 测试"我的订单"可查看已支付订单的下载链接

## 运营检查

### 资料合规检查
- [ ] 文件名不含敏感词（真题、押题、绝密等）
- [ ] 内容为原创整理，无机构搬运
- [ ] 无扫描图书、无录播课程

### 链接有效期
- [ ] 网盘链接测试可正常访问
- [ ] 提取码验证正确
- [ ] 准备主网盘 + 备用网盘双账号

### 客服准备
- [ ] FAQ 常见问题已完善
- [ ] 订单查询流程清晰
- [ ] 链接失效补发流程明确
