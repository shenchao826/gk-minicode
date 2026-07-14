# 岗策工具箱 - 公考备考原创工具素材站

> 精简备考工具，降低选岗与复习成本

基于 Cloudflare Pages + Workers + D1 构建的轻量级公考资料付费商城，零服务器月租，仅支付渠道手续费。

## 📁 项目结构

```
gk-minicode/
├─ database/           # D1 数据库初始化脚本
│   └─ init.sql
├─ worker/             # Cloudflare Workers 后端
│   ├─ index.js
│   └─ wrangler.toml
├─ pages/              # Cloudflare Pages 前端
│   ├─ _routes.json
│   ├─ index.html
│   ├─ admin.html
│   ├─ css/style.css
│   └─ js/main.js
├─ docs/               # 部署与 API 文档
│   ├─ deploy-guide.md
│   ├─ config-checklist.md
│   └─ api-reference.md
├─ scripts/            # 部署脚本工具
│   ├─ deploy.sh
│   └─ setup.sh
├─ prompts/            # AI 资料生成提示词
│   ├─ 岗位筛选提示词.txt
│   ├─ 行测提示词.txt
│   ├─ 申论提示词.txt
│   ├─ 时政常识提示词.txt
│   └─ 面试政审提示词.txt
├─ materials/          # 网盘资料目录结构（本地预览）
│   ├─ 01_岗位报考筛选专区/
│   ├─ 02_行测考点速记&专项工具/
│   ├─ 03_申论写作素材&答题模板/
│   ├─ 04_时政汇总&常识背诵手册/
│   └─ 05_面试+政审全套流程文档/
└─ README.md
```

## 🏗️ 技术架构

```
用户访问 → gk.minicode.cloud（CF代理）
├─ 页面静态资源 → Cloudflare Pages 前端商城
├─ /api/* 接口请求 → 转发至 Cloudflare Workers
│  ├─ 支付回调 /api/callback
│  ├─ 创建订单 /api/createorder
│  ├─ 查询订单 /api/order/:tid
│  ├─ 商品列表 /api/goods
│  └─ 后台管理 /api/admin
└─ 数据持久层：D1 SQLite数据库（商品表、订单表、卡密表）
```

### 技术栈

| 模块 | 技术 | 说明 |
|------|------|------|
| 前端 | HTML5 + CSS3 + JavaScript | 纯静态，无需构建工具 |
| 后端 | Cloudflare Workers | Serverless，自动扩缩容 |
| 数据库 | Cloudflare D1 | SQLite 兼容，零维护 |
| 支付 | 虎皮椒聚合支付 | 支持微信、支付宝 |
| 存储 | 百度网盘 | 文件分发，按流量计费 |

## 🚀 快速开始

### 前置条件

- Cloudflare 账号
- 虎皮椒支付账号
- 已接入 Cloudflare 的域名（如 minicode.cloud）

### 部署步骤

1. **创建 D1 数据库**
   ```bash
   # 在 CF 控制台创建 gk-db
   # 执行 database/init.sql 建表
   ```

2. **部署 Worker**
   ```bash
   # 创建 Worker gk-api
   # 粘贴 worker/index.js
   # 配置环境变量
   ```

3. **部署 Pages**
   ```bash
   # 创建 Pages 项目
   # 上传 pages/ 目录所有文件
   # 绑定自定义域名 gk.minicode.cloud
   ```

4. **配置 DNS**
   ```bash
   # 添加 CNAME 记录
   # gk → xxx.pages.dev（代理开启）
   ```

详细部署指南见 [docs/deploy-guide.md](docs/deploy-guide.md)

## 📦 核心功能

### 前端商城
- ✅ 商品卡片展示（支持标签、悬浮动效）
- ✅ 订单弹窗（支付成功展示网盘链接）
- ✅ 一键复制链接+提取码
- ✅ 手动订单查询入口
- ✅ FAQ 常见问题解答
- ✅ 移动端自适应

### 后台管理
- ✅ 商品增删改查
- ✅ 订单列表查看
- ✅ 卡密批量导入
- ✅ 卡密库存管理
- ✅ 密码登录验证

### 支付流程
1. 用户选择商品 → 创建订单 → 跳转虎皮椒支付
2. 支付成功 → 虎皮椒回调 /api/callback
3. 系统核销卡密 → 更新订单状态
4. 用户查询订单 → 获取网盘链接+提取码

## 📄 API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/goods | GET | 获取商品列表 |
| /api/createorder | POST | 创建订单 |
| /api/order/:tid | GET | 查询订单 |
| /api/callback | POST | 支付回调 |
| /api/admin | GET/POST | 后台首页/新增商品 |
| /api/admin/goods | PUT/DELETE | 修改/删除商品 |
| /api/admin/card | POST | 批量导入卡密 |
| /api/admin/cards | GET | 查询卡密库存 |

详细接口文档见 [docs/api-reference.md](docs/api-reference.md)

## 📚 资料内容架构

### 五大板块

| 板块 | 定位 | 代表商品 |
|------|------|----------|
| 01_岗位报考筛选专区 | 引流爆款 | 岗位筛选 Excel 模板 |
| 02_行测考点速记&专项工具 | 主力单品 | 行测五大模块速记手册 |
| 03_申论写作素材&答题模板 | 利润核心 | 申论公文+大作文模板 |
| 04_时政汇总&常识背诵手册 | 会员刚需 | 月度时政更新 |
| 05_面试+政审全套流程文档 | 延伸品类 | 面试答题思路指南 |

### 资料生成规范

- ✅ 原创整理，无机构搬运
- ✅ 禁用敏感词（真题、押题、绝密等）
- ✅ 来源：官方公开信息 + 官媒内容 + AI 润色
- ✅ 格式：Word/Excel/PDF 标准化封装

资料生成提示词见 [prompts/](prompts/) 目录

## ⚙️ 配置说明

### Worker 环境变量

| 变量名 | 值 |
|--------|-----|
| SITE_DOMAIN | https://gk.minicode.cloud |
| HUPIJIA_APP_ID | 虎皮椒应用 ID |
| HUPIJIA_APP_SECRET | 虎皮椒应用密钥 |
| ADMIN_PASSWORD | 后台管理密码 |

### D1 数据库绑定

- Binding name: `DB`
- Database: `gk-db`

## 🔒 安全配置

### CF WAF 规则
- 拦截敏感词：押题、真题、绝密、内部、粉笔、中公、华图等

### SSL/TLS
- Encryption mode: Strict
- Always Use HTTPS: On
- Minimum TLS Version: TLS 1.2

## 📊 运营检查清单

见 [docs/config-checklist.md](docs/config-checklist.md)

## 📝 后续扩容

- 多子域名分站（事业单位、省考）
- 会员套餐系统
- 分销返佣模块
- R2 对象存储替代网盘
- 资料预览功能

## 📄 许可证

MIT License

---

**岗策工具箱** © 2026 - 公考备考原创工具素材站