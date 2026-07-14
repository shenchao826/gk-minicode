-- 岗策工具箱 - Cloudflare D1 数据库初始化脚本
-- 执行位置：CF 控制台 → Workers & Pages → D1 → gk-db → Query → Run query

-- 商品表
CREATE TABLE IF NOT EXISTS goods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  price REAL NOT NULL,
  description TEXT,
  sort INTEGER DEFAULT 0
);

-- 卡密库存表：一条卡密对应一个网盘链接+提取码
CREATE TABLE IF NOT EXISTS card (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goods_id INTEGER NOT NULL,
  pan_link TEXT NOT NULL,
  pan_code TEXT NOT NULL,
  is_used TINYINT DEFAULT 0,
  create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
  trade_id TEXT PRIMARY KEY,
  goods_id INTEGER NOT NULL,
  card_id INTEGER DEFAULT 0,
  user_id INTEGER DEFAULT 0,
  referrer_id INTEGER DEFAULT 0,
  pay_amount REAL NOT NULL,
  status TINYINT DEFAULT 0,
  create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  pay_at TIMESTAMP
);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  nickname TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  invite_code TEXT UNIQUE,
  referrer_id INTEGER DEFAULT 0,
  reset_at TIMESTAMP,
  create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 会员表
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  level TINYINT DEFAULT 0,
  expire_at TIMESTAMP,
  total_spent REAL DEFAULT 0,
  create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  update_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 分销员表
CREATE TABLE IF NOT EXISTS distributors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  status TINYINT DEFAULT 0,
  commission_rate REAL DEFAULT 0.15,
  total_commission REAL DEFAULT 0,
  available_commission REAL DEFAULT 0,
  invite_code TEXT UNIQUE,
  create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  update_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 分销订单表
CREATE TABLE IF NOT EXISTS referral_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  distributor_id INTEGER NOT NULL,
  commission_amount REAL DEFAULT 0,
  status TINYINT DEFAULT 0,
  settle_at TIMESTAMP,
  create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 会员等级配置表
CREATE TABLE IF NOT EXISTS member_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TINYINT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  duration_days INTEGER NOT NULL,
  discount REAL DEFAULT 1,
  benefits TEXT,
  sort INTEGER DEFAULT 0
);



-- 月度时政更新表（Cron自动生成）
CREATE TABLE IF NOT EXISTS monthly_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 管理员token表
CREATE TABLE IF NOT EXISTS admin_tokens (
  token TEXT PRIMARY KEY,
  expire_at TIMESTAMP NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_distributors_user_id ON distributors(user_id);
CREATE INDEX IF NOT EXISTS idx_distributors_invite_code ON distributors(invite_code);
CREATE INDEX IF NOT EXISTS idx_card_goods_id ON card(goods_id);
CREATE INDEX IF NOT EXISTS idx_card_is_used ON card(is_used);
CREATE INDEX IF NOT EXISTS idx_orders_trade_id ON orders(trade_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_orders_distributor_id ON referral_orders(distributor_id);
CREATE INDEX IF NOT EXISTS idx_sms_codes_phone ON sms_codes(phone);

-- 初始化会员等级配置
INSERT OR IGNORE INTO member_config (level, name, price, duration_days, discount, benefits, sort) VALUES 
(1, '普通会员', 39.9, 90, 0.95, '全场95折优惠、免费获取时政月度更新', 3),
(2, 'VIP会员', 99, 365, 0.90, '全场9折优惠、免费获取时政月度更新、优先获取新资料、专属备考计划指导', 2),
(3, '至尊会员', 199, 3650, 0.85, '全场85折优惠、免费获取全站所有资料、时政月度更新、优先获取新资料、专属备考计划指导、一对一学习咨询', 1);

-- 初始化商品数据（5个核心商品）
INSERT OR IGNORE INTO goods (title, price, description, sort) VALUES 
('国考岗位筛选Excel工具表｜应届生专属筛岗模板', 1.99, '【定位：国考备考入门工具】原创整理国考岗位筛选工具表格，支持学历、专业、应届生身份、基层条件多维度自查筛选。告别盲查岗位，一键筛选适配岗位、避雷高分岗、限制岗、服务年限岗。内含报考全流程指南+避雷指南+科学备考计划，适合国考零基础考生快速选岗入门。', 10),
('行测全套考点速记手册｜公式+技巧+真题+模拟', 19.9, '【定位：行测提分核心资料】覆盖行测五大模块全套备考素材：政治理论核心考点、言语理解高频成语与技巧、数量关系12类必考题型、判断推理四大模块规律、资料分析必背公式与速算技巧。新增2022-2026年行测真题分模块汇编（含详细解析）+3套行测全真模拟试卷（含答案），适合有一定基础后针对性提分。', 9),
('申论全套答题模板｜规范词+公文+大作文+真题', 29.9, '【定位：申论写作专项突破】包含申论归纳概括题规范词库、提出对策题答题模板、综合分析题答题框架、11类公文应用文格式模板（含完整示例）、大作文10大高频主题素材库（含高分范文）。新增2022-2026年申论真题汇编（含参考答案）+3套申论全真模拟试卷（含评分标准），适配国考阅卷作答逻辑。', 8),
('全年时政汇总合集｜月度更新考点精简版', 12.9, '【定位：时政常识背诵手册】按月整理国内重大会议、政策文件、科技成就、新法热点、民生考点。纯备考精简版本，剔除无效新闻，只保留公考可考内容，持续更新至国考笔试结束。内含常识判断高频考点速记+常识速记口诀+碎片化背诵清单，适合碎片时间快速记忆。', 7),
('国考全套备考工具包｜行测+申论+时政+面试+真题', 49.9, '【定位：国考备考一站式解决方案】全站整合30份资料，一套覆盖国考全程备考：岗位筛选Excel工具包、行测五大模块速记素材+真题汇编+模拟试卷、申论全套答题模板与写作素材+真题汇编+模拟试卷、全年时政背诵汇总、结构化面试答题思路+真题解析、政审体检全套流程文档。性价比最高，适合全面备考考生。', 6);