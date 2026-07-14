# 岗策工具箱 - 配置检查清单

## 上线前必查项

### D1 数据库 ✅
- [ ] 创建数据库 `gk-db`
- [ ] 执行 `database/init.sql` 建表
- [ ] 确认 3 张表已创建：goods、card、orders
- [ ] 确认 5 条初始化商品已插入

### Worker 后端 ✅
- [ ] 创建 Worker `gk-api`
- [ ] 粘贴 `worker/index.js` 完整代码
- [ ] 配置环境变量：
  - [ ] SITE_DOMAIN = https://gk.minicode.cloud
  - [ ] HUPIJIA_APP_ID（虎皮椒应用ID）
  - [ ] HUPIJIA_APP_SECRET（虎皮椒密钥）
  - [ ] ADMIN_PASSWORD（自定义后台密码）
- [ ] 绑定 D1 数据库：Binding name = DB，Database = gk-db
- [ ] 保存并部署

### Pages 前端 ✅
- [ ] 创建 Pages 项目
- [ ] 上传 `pages/` 目录所有文件
- [ ] 确认 `_routes.json` 在根目录
- [ ] Build command 留空
- [ ] Build output directory = /
- [ ] 绑定自定义域名 `gk.minicode.cloud`
- [ ] 开启 Always use HTTPS

### DNS 解析 ✅
- [ ] 添加 CNAME 记录：Name = gk，Target = xxx.pages.dev
- [ ] Proxy status = ✅ 已代理
- [ ] 等待 DNS 生效（2-10分钟）

### CF 安全配置 ✅
- [ ] SSL/TLS → Encryption mode = Strict
- [ ] Always Use HTTPS = On
- [ ] 创建 WAF 规则拦截敏感词

### 虎皮椒配置 ✅
- [ ] 创建支付产品
- [ ] 异步通知地址 = https://gk.minicode.cloud/api/callback
- [ ] 支付成功跳转 = https://gk.minicode.cloud/#/order

### 后台数据 ✅
- [ ] 登录后台验证商品列表可正常获取
- [ ] 为每个商品批量导入卡密（网盘链接 | 提取码）
- [ ] 测试下单流程完整跑通

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