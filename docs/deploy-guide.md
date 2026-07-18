# 岗策工具箱 - 完整部署指南

## 架构拓扑

```
用户访问 → gk.minicode.cloud（CF代理）
├─ 页面静态资源 → Cloudflare Pages 前端商城
├─ /api/* 接口请求 → Pages Functions（同域名处理，无跨域）
│  ├─ 创建订单 → 调用虎皮椒支付API → 返回二维码
│  ├─ 接收虎皮椒支付Webhook回调（/api/callback）
│  ├─ 主动查询虎皮椒支付状态（/api/verify-payment）
│  ├─ 查询D1商品、扣卡密、取出网盘链接+提取码
│  └─ 后台管理接口（商品增删、批量导入卡密、订单查看）
└─ 数据持久层：D1 SQLite数据库（商品表、订单表、卡密表、用户表、会员表）
```

**关键决策：** API 不走独立的 Worker 子域名（如 `gk-api.minicode.cloud`），而是用 Pages Functions 同域名处理，避免跨域问题导致前端 `Failed to fetch`。

---

## 第一步：创建 D1 数据库

1. 进入 CF 控制台 → Workers & Pages → D1 SQL Database → Create database
2. 数据库名称：`gk-db`
3. Database ID: `7e9e2bc1-cc6c-4889-8bcc-a697961559d4`
4. 进入数据库 → Query，粘贴 `database/init.sql` 内容，Run query 执行

数据库初始化也可以通过访问 `https://gk.minicode.cloud/api/init-db` 自动完成（首次部署后调用一次即可）。

---

## 第二步：Pages 前端 + Functions 部署

### 2.1 创建 Pages 项目
- Workers & Pages → Create application → Create Pages
- 项目名称：`gk-minicode-pages`
- 连接 GitHub 仓库，或选择「上传资产」

### 2.2 构建配置
- Framework preset：None
- Build command：留空
- Build output directory：`/`

### 2.3 文件上传
将 `pages/` 目录下所有文件上传：
- `index.html`、`admin.html`、`css/style.css`、`js/main.js`
- `_headers`、`_routes.json`
- `functions/api/[[path]].js`（Pages Functions，处理所有 API 请求）

### 2.4 绑定 D1 数据库
- Pages 项目 → Settings → Functions → D1 database bindings → Add binding
- Binding name：`DB`
- D1 database：选择 `gk-db`

### 2.5 环境变量配置
**wrangler.toml（`pages/wrangler.toml`）：**
```toml
[vars]
SITE_DOMAIN = "https://gk.minicode.cloud"
HUPIJIA_APP_ID = "201906179658"

[[d1_databases]]
binding = "DB"
database_name = "gk-db"
database_id = "7e9e2bc1-cc6c-4889-8bcc-a697961559d4"
```

**Secrets（敏感信息，通过 CLI 设置）：**
```bash
wrangler pages secret put HUPIJIA_APP_SECRET
wrangler pages secret put ADMIN_PASSWORD
```

### 2.6 部署命令
```bash
cd pages
wrangler pages deploy . --branch main
```

### 2.7 绑定自定义域名
- Pages 项目 → Custom domains → Set up a custom domain
- 输入：`gk.minicode.cloud`
- 开启 Always use HTTPS

---

## 第三步：Worker 独立部署（备用 + 定时任务）

Worker `gk-api` 部署于 `gk-api.13365616616.workers.dev`，主要功能：
- 定时任务（每月1号自动生成上月的时政汇总）
- 可作为 Pages Functions 的备用

### 部署命令
```bash
cd worker
wrangler deploy
```

### Secrets
```bash
wrangler secret put HUPIJIA_APP_SECRET
wrangler secret put ADMIN_PASSWORD
wrangler secret put DEEPSEEK_API_KEY
```

### wrangler.toml
```toml
name = "gk-api"
main = "index.js"
compatibility_date = "2024-07-14"

[vars]
SITE_DOMAIN = "https://gk.minicode.cloud"
HUPIJIA_APP_ID = "201906179658"

[[d1_databases]]
binding = "DB"
database_name = "gk-db"
database_id = "7e9e2bc1-cc6c-4889-8bcc-a697961559d4"

[triggers]
crons = ["0 0 1 * *"]
```

---

## 第四步：DNS 解析确认

| Type | Name | Target | Proxy status |
|------|------|--------|--------------|
| CNAME | gk | gk-minicode-pages.pages.dev | ✅ 已代理（橙色云朵） |

等待 2~10 分钟 DNS 全网生效。

---

## 第五步：虎皮椒支付对接

### 5.1 账户信息
```
AppID:     201906179658
AppSecret: d097ec838557c0f3aaebc5c5a00a7aab
支付网关:  https://api.xunhupay.com/payment/do.html
查询网关:  https://api.xunhupay.com/payment/query.html
```

### 5.2 回调地址
**异步通知地址：** `https://gk.minicode.cloud/api/callback`

### 5.3 回调参数格式（form 表单 POST）

| 参数 | 说明 | 支付成功时的值 |
|------|------|---------------|
| `trade_order_id` | 商户订单号 | 如 `GK1234567890` |
| `status` | **订单状态** | **`OD`**（已支付） |
| `total_fee` | 支付金额 | `1.99` |
| `transaction_id` | 微信交易号 | 微信内部单号 |
| `open_order_id` | 虎皮椒内部单号 | 虎皮椒系统单号 |
| `hash` | MD5签名 | 32位小写 |

### 5.4 查询支付状态 API

主动向虎皮椒查询某笔订单是否已支付：

**请求参数（POST JSON）：**

| 参数 | 必填 | 说明 |
|------|------|------|
| `appid` | 是 | 虎皮椒APPID |
| `out_trade_order` | 是 | **商户订单号**（注意不是 trade_order_id） |
| `time` | 是 | 当前时间戳（秒） |
| `nonce_str` | 是 | 随机字符串 |
| `hash` | 是 | MD5签名 |

**响应：**
```json
{
  "errcode": 0,
  "data": { "status": "OD" },   // OD=已支付, WP=待支付, CD=已取消
  "errmsg": "success!"
}
```

### 5.5 签名算法

```
1. 剔除 hash 参数本身
2. 非空参数按 ASCII 升序排序
3. 拼接为 key1=value1&key2=value2 格式
4. 末尾直接拼接 AppSecret（之间无任何连接符）
5. 对整串做 MD5，取 32 位小写
```

---

## 第六步：后台管理

### 访问方式
后台页面：`https://gk.minicode.cloud/admin.html`

### 功能
- 商品管理（增删改）
- 批量导入卡密（格式：网盘链接 | 提取码，一行一条）
- 订单查看
- 数据库初始化

---

## 第七步：支付流程概要

```
用户点击购买
    ↓
POST /api/createorder
    ├─ 数据库创建订单（status=0）
    ├─ 分配卡密（标记is_used=1）
    ├─ 调用虎皮椒 payment/do.html
    └─ 返回 {payUrl, tradeNo}
    ↓
前端展示二维码 → 用户手机扫码支付
    ↓
虎皮椒回调 POST /api/callback（status=OD）
    → 更新订单 status=1 → 返回 "success"
    ↓
前端轮询 /api/order/{tradeNo}（每3秒，最长2分钟）
  或用户点击"确认"按钮主动查询
    ↓
订单已支付 → 展示网盘链接 + 提取码
```

---

## 踩坑记录（重要！）

### 1. API 跨域问题
**症状：** 前端 `Failed to fetch`
**原因：** API 用了独立的子域名 `gk-api.minicode.cloud`，浏览器跨域请求失败
**解决：** 改用 Pages Functions 同域名处理，`apiPrefix = "/api"`

### 2. 回调状态字段错误
**症状：** 用户已支付成功，但系统未检测到
**原因：** 代码判断 `callbackData.trade_status === 'TRADE_SUCCESS'`
**正确：** 虎皮椒回调的状态字段是 **`status`**，值为 **`'OD'`**（不是 `trade_status`/`TRADE_SUCCESS`）

### 3. 回调订单号字段错误
**症状：** 回调无法匹配订单
**原因：** 代码读取 `callbackData.out_trade_order_no`
**正确：** 回调的商户订单号字段是 **`trade_order_id`**

### 4. 查询API参数错误
**症状：** 虎皮椒返回 `"Invalid open_order_id or out_trade_order!"`
**原因：** 
- 参数名用了 `trade_order_id`，正确是 **`out_trade_order`**
- 缺了 `time` 和 `nonce_str` 两个必填字段

### 5. 前端 main.js 未更新到线上
**症状：** 明明改了代码但线上不生效
**原因：** `wrangler pages deploy` 用文件 hash 判断是否上传，有时不识别修改
**解决：** 修改 `index.html` 中 `main.js` 的版本号（`?v=xxxx`），或加注释强制改变文件hash

---

## 数据库操作

### 查询订单
```bash
npx wrangler d1 execute gk-db --command="SELECT * FROM orders ORDER BY create_at DESC LIMIT 10" --remote
```

### 手动标记订单已支付
```bash
npx wrangler d1 execute gk-db --command="UPDATE orders SET status=1,pay_at=CURRENT_TIMESTAMP WHERE trade_id='GKxxxx'" --remote
```

### 查看卡密库存
```bash
npx wrangler d1 execute gk-db --command="SELECT goods_id, COUNT(*) as total, SUM(is_used) as used FROM card GROUP BY goods_id" --remote
```

---

## 后续扩容方向

- 多子域名分站：sydw.minicode.cloud（事业单位）、sk.minicode.cloud（省考）
- 废弃网盘迁移 R2：仅修改 API 内下载逻辑，前端域名完全不动
- 开启会员套餐、分销返佣，在 Pages Functions 内新增逻辑即可
