# 岗策工具箱 - 完整部署指南

## 架构拓扑

```
用户访问 → gk.minicode.cloud（CF代理）
├─ 页面静态资源 → Cloudflare Pages 前端商城
├─ /api/* 接口请求 → 转发至 Cloudflare Workers
│  ├─ 接收虎皮椒支付Webhook回调
│  ├─ 查询D1商品、扣卡密、取出网盘链接+提取码
│  └─ 后台管理接口（商品增删、批量导入卡密、订单查看）
└─ 数据持久层：D1 SQLite数据库（商品表、订单表、卡密表）
```

## 第一步：创建 D1 数据库

1. 进入 CF 控制台 → Workers & Pages → D1 SQL Database → Create database
2. 数据库名称：`gk-db`
3. 进入数据库 → Query，粘贴 `database/init.sql` 内容，Run query 执行
4. 记录数据库绑定标识：后续 Worker 绑定需要填写 `gk-db`

## 第二步：部署 Workers 后端服务

### 2.1 新建 Worker 项目
- Workers & Pages → Create application → Create Worker
- Worker 名称：`gk-api`
- 点击 Quick edit，清空默认代码，粘贴 `worker/index.js` 完整代码

### 2.2 Worker 环境变量配置
- Settings → Variables → Add variable

| 变量名 | 值 |
|--------|-----|
| SITE_DOMAIN | https://gk.minicode.cloud |
| HUPIJIA_APP_ID | 你的虎皮椒应用 ID |
| HUPIJIA_APP_SECRET | 虎皮椒应用密钥 |
| ADMIN_PASSWORD | 自定义后台登录密码 |

### 2.3 绑定 D1 数据库
- Settings → D1 database bindings → Add binding
- Binding name：`DB`
- D1 database：选择刚创建的 `gk-db`
- 保存并部署 Worker

### 2.4 固定回调地址
- 虎皮椒后台填写回调通知地址：
- `https://gk.minicode.cloud/api/callback`

## 第三步：Pages 前端商城部署 + 路由转发

### 3.1 创建 Pages 项目
- Workers & Pages → Create application → Create Pages
- 连接你的 GitHub 仓库，或选择「上传资产」

### 3.2 构建配置
- Framework preset：None
- Build command：留空
- Build output directory：/

### 3.3 文件上传
将 `pages/` 目录下所有文件上传（包括 `_routes.json`、`index.html`、`css/`、`js/`）

### 3.4 绑定自定义域名
- Pages 项目 → Custom domains → Set up a custom domain
- 输入：`gk.minicode.cloud`
- 域名同账号下自动校验通过，无需添加 TXT 解析
- 开启 Always use HTTPS

## 第四步：DNS 解析确认

进入主域名 `minicode.cloud` → DNS → Add record

| Type | Name | Target | Proxy status |
|------|------|--------|--------------|
| CNAME | gk | 你的pages项目.pages.dev | ✅ 已代理 |

等待 2~10 分钟 DNS 全网生效，即可直接访问 `gk.minicode.cloud`

## 第五步：CF 全站安全与 SSL 统一配置

进入 `minicode.cloud` 总域名面板：

### 5.1 SSL/TLS
- Encryption mode：Strict
- Always Use HTTPS：On
- Minimum TLS Version：TLS 1.2
- Enable HTTP/2、HTTP/3

### 5.2 防火墙 WAF
- Create rule，规则名称：`block-sensitive-word`
- 表达式：`http.request.uri contains any {"押题","真题","绝密","内部","粉笔","中公","华图","保上岸","必过"}`
- Action：Block

### 5.3 Security Settings
- Security Level：Medium

## 第六步：虎皮椒支付对接配置

- 虎皮椒后台创建支付产品
- 异步通知地址：`https://gk.minicode.cloud/api/callback`
- 订单支付成功跳转地址：`https://gk.minicode.cloud/#/order`
- 复制 AppID、AppSecret 填入前面 Worker 环境变量

## 第七步：后台入口与商品、卡密录入

### 后台访问地址
`https://gk.minicode.cloud/api/admin`

### 登录方式
请求头携带鉴权：`Authorization: Bearer 你设置的ADMIN_PASSWORD`

### 可用操作
- 新增 / 编辑 / 删除商品
- 批量导入卡密（格式：网盘链接 \| 提取码，一行一条）
- 查看全部订单、手动补发卡密
- 查看已核销 / 未核销卡密库存

## 网盘资料规范（强制）

- 压缩包命名禁止敏感词
- ✅ 正确示例：公职岗位筛选工具包、申论写作素材文档合集
- ❌ 禁止：真题、押题、绝密、内部、粉笔、中公、华图
- 不存放扫描图书、机构课程、原版真题，只放原创整理 Excel/Word/PDF
- 每个商品单独生成分享链接，定期批量更换链接防止失效

## 后续扩容方向

- 多子域名分站：sydw.minicode.cloud（事业单位）、sk.minicode.cloud（省考）
- 废弃网盘迁移 R2：仅修改 Worker 内下载逻辑，前端域名完全不动
- 开启会员套餐、分销返佣，在 Worker 内新增逻辑即可