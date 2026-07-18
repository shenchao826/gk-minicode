# 部署经验总结（通用模板）

> Cloudflare Pages + Functions + D1 的完整部署经验

---

## 一、架构决策

### Pages Functions 优于独立 Worker

| 方案 | 问题 | 结论 |
|------|------|------|
| 独立 Worker 子域名（`api.yourdomain.com`） | 跨域 `Failed to fetch`，DNS 配置复杂 | ❌ 放弃 |
| Pages Functions 同域名（`yourdomain.com/api/*`） | 无跨域，D1 绑定同样支持 | ✅ 采用 |

**结论：** API 和前端放在同一个 Pages 项目下，用 `functions/api/[[path]].js` 处理
所有 `/api/*` 请求，前端 `apiPrefix = "/api"`，不走跨域。

### Worker 的定位

Worker 作为**备用 + 定时任务**部署，不参与主要 API 处理：
- 定时任务（如每月生成汇总报告）
- Pages Functions 出问题时应急

---

## 二、部署方式对比

| 方式 | 优点 | 缺点 |
|------|------|------|
| `wrangler pages deploy` | 无需 Git，本地直传 | **文件 hash 缓存**：改了代码但线上不更新 |
| GitHub Actions 自动部署 | push 即部署，不会漏文件；可回滚 | 需要配 Token，多了 commit 步骤 |

### wrangler 直传的坑

**核心问题：** `wrangler pages deploy` 用文件 hash 判断是否上传。如果 hash 没变
（即使内容变了），显示 `Uploaded 0 files (N already uploaded)`，线上还是旧代码。

**症状：** "明明改了代码，线上不生效"

**解决：** 放弃 wrangler 直传，改用 GitHub Actions 自动部署。

### GitHub Actions 自动部署

工作流文件：`.github/workflows/deploy.yml`

```yaml
name: Deploy to Cloudflare Pages
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: "your-cloudflare-account-id"
          projectName: "your-pages-project-name"
          directory: "pages"
```

**前提条件：**
1. GitHub 远程仓库已配置
2. GitHub Secrets 中已添加 `CLOUDFLARE_API_TOKEN`
3. Cloudflare Pages 项目已创建

**工作流：**
```
本地改代码 → git add . → git commit -m "说明" → git push
                                        ↓
                              GitHub Actions 自动部署
                                        ↓
                              yourdomain.com 自动更新
```

---

## 三、环境变量与 Secrets

### Pages 环境变量（wrangler.toml）

```toml
[vars]
SITE_DOMAIN = "https://yourdomain.com"
# 其他业务变量...

[[d1_databases]]
binding = "DB"
database_name = "your-db-name"
database_id = "your-database-id"
```

### Pages Secrets（敏感信息，通过 CLI 设置）

```bash
wrangler pages secret put YOUR_SECRET_KEY
```

### Worker Secrets

```bash
wrangler secret put YOUR_SECRET_KEY
```

**注意：** Pages 和 Worker 的 Secrets 是独立设置的，需要分别执行。

---

## 四、数据库 D1

**基础配置：**
- Binding name: `DB`（可自定义）
- 在 `wrangler.toml` 的 `[[d1_databases]]` 中配置

**常用命令：**

```bash
# 查询数据
npx wrangler d1 execute your-db --command="SELECT * FROM your_table LIMIT 10" --remote

# 更新数据
npx wrangler d1 execute your-db --command="UPDATE your_table SET status=1 WHERE id='xxx'" --remote
```

---

## 五、DNS 配置

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | @ 或子域名 | `your-project.pages.dev` | ✅ 已代理（橙色云朵） |

**注意：** 如果 API 走 Pages Functions 同域名处理，不需要添加额外的子域名记录。

---

## 六、部署命令速查

```bash
# 部署 Pages（前端 + Functions）
cd pages && wrangler pages deploy . --branch main

# 部署 Worker（定时任务等备用）
cd worker && wrangler deploy

# GitHub 自动部署（推荐日常使用）
git add . && git commit -m "说明" && git push
```

---

## 七、踩坑汇总

### 1. wrangler 文件缓存
- **现象：** 改了代码但 `Uploaded 0 files`，线上还是旧的
- **原因：** wrangler 用文件 hash 判断是否上传
- **解决：** 改用 GitHub Actions 自动部署

### 2. API 跨域
- **现象：** 前端 `Failed to fetch`
- **原因：** API 用独立子域名
- **解决：** 改用 Pages Functions 同域名

### 3. 第三方支付回调参数错误
- **现象：** 支付成功但系统未检测到
- **原因：** 回调状态字段名或订单号字段名与官方文档不符
- **解决：** 仔细对照官方 API 文档的字段名和状态值

### 4. 查询API参数不全
- **现象：** 第三方返回参数错误
- **原因：** 缺少必填字段或参数名错误
- **解决：** 严格按照官方文档要求的参数名和必填项传参
