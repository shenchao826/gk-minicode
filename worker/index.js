export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const siteDomain = env.SITE_DOMAIN || "";
      const adminPwd = env.ADMIN_PASSWORD || "";
      const hupiAppId = env.HUPIJIA_APP_ID || "";
      const hupiAppSecret = env.HUPIJIA_APP_SECRET || "";

      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
      };
      if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    if (path === "/api/callback" && request.method === "POST") {
      let callbackData;
      const contentType = request.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        callbackData = await request.json();
      } else {
        const formData = await request.formData();
        callbackData = {};
        for (const [key, value] of formData.entries()) {
          callbackData[key] = value;
        }
      }

      console.log('收到虎皮椒回调:', JSON.stringify(callbackData));

      if (hupiAppSecret && callbackData.hash) {
        const paramsWithoutHash = { ...callbackData };
        delete paramsWithoutHash.hash;

        const signStr = Object.keys(paramsWithoutHash)
          .sort()
          .filter(key => paramsWithoutHash[key])
          .map(key => `${key}=${paramsWithoutHash[key]}`)
          .join('&') + hupiAppSecret;

        const encoder = new TextEncoder();
        const data = encoder.encode(signStr);
        const hashBuffer = await crypto.subtle.digest('MD5', data);
        const expectedHash = Array.from(new Uint8Array(hashBuffer))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        if (expectedHash !== callbackData.hash) {
          console.error('签名验证失败:', { expected: expectedHash, received: callbackData.hash });
          return new Response('fail', { status: 400 });
        }
      }

      // 文档: status=OD(已支付),WP(待支付),CD(已取消)
      if (callbackData.status !== 'OD') {
        console.log('非成功状态:', callbackData.status);
        return new Response('success', { headers: { 'Content-Type': 'text/plain' } });
      }

      const tradeNo = callbackData.trade_order_id;
      const body = callbackData.attach;

      const orderRes = await env.DB.prepare("SELECT * FROM orders WHERE trade_id = ?").bind(tradeNo).first();
      if (!orderRes) {
        console.error('订单不存在:', tradeNo);
        return new Response('fail', { status: 404 });
      }

      if (orderRes.status === 1) {
        console.log('订单已处理，跳过');
        return new Response('success', { headers: { 'Content-Type': 'text/plain' } });
      }

      await env.DB.prepare("UPDATE orders SET status=1,pay_at=CURRENT_TIMESTAMP WHERE trade_id=?").bind(tradeNo).run();

      if (orderRes.goods_id === 0 && body && body.startsWith("VIP_")) {
        const level = Number(body.split("_")[1]);
        await handleMemberPurchase(env, orderRes.user_id, level);
      }

      if (orderRes.referrer_id > 0) {
        await handleReferralCommission(env, orderRes);
      }

      if (orderRes.user_id > 0) {
        await updateMemberTotalSpent(env, orderRes.user_id, orderRes.pay_amount);
      }

      return new Response('success', { headers: { 'Content-Type': 'text/plain' } });
    }

    if (path === "/api/createorder" && request.method === "POST") {
      const body = await request.json();
      const goodsId = Number(body.goodsId);
      const userId = Number(body.userId) || 0;
      const referrerId = Number(body.referrerId) || 0;
      const outTradeNo = "GK" + Date.now() + Math.floor(Math.random()*1000);

      let goods = await env.DB.prepare("SELECT price FROM goods WHERE id=?").bind(goodsId).first();
      if (!goods) return json({code:-1,msg:"商品不存在"});

      let finalPrice = goods.price;
      if (userId > 0) {
        const member = await env.DB.prepare("SELECT level FROM members WHERE user_id=? AND expire_at > CURRENT_TIMESTAMP").bind(userId).first();
        if (member) {
          const config = await env.DB.prepare("SELECT discount FROM member_config WHERE level=?").bind(member.level).first();
          if (config && config.discount < 1) {
            finalPrice = parseFloat((goods.price * config.discount).toFixed(2));
          }
        }
      }

      let cardId = 0;
      try {
        const cardRow = await env.DB.prepare("SELECT id FROM card WHERE goods_id=? AND is_used=0 LIMIT 1").bind(goodsId).first();
        if (!cardRow) return json({code:-1,msg:"商品库存不足"});
        cardId = cardRow.id;
        await env.DB.prepare("UPDATE card SET is_used=1 WHERE id=?").bind(cardRow.id).run();
        await env.DB.prepare("INSERT INTO orders (trade_id,goods_id,card_id,user_id,referrer_id,pay_amount) VALUES (?,?,?,?,?,?)")
          .bind(outTradeNo, goodsId, cardRow.id, userId, referrerId, finalPrice).run();
      } catch (e) {
        return json({code:-1,msg:"创建订单失败:" + e.message});
      }

      const notifyUrl = `${siteDomain}/api/callback`;
      const returnUrl = `${siteDomain}/#/order?tid=${outTradeNo}`;
      
      const params = {
        version: '1.1',
        appid: hupiAppId,
        trade_order_id: outTradeNo,
        total_fee: finalPrice.toFixed(2),
        title: `商品ID:${goodsId}`,
        time: Math.floor(Date.now() / 1000).toString(),
        notify_url: notifyUrl,
        nonce_str: Math.random().toString(36).substring(2, 14),
        type: 'WAP',
        wap_url: siteDomain,
        wap_name: '国考资料工具'
      };
      
      if (!hupiAppSecret) {
        return json({code:-1,msg:"支付配置未完成，请联系管理员"});
      }
      
      const signStr = Object.keys(params)
        .sort()
        .filter(key => params[key])
        .map(key => `${key}=${params[key]}`)
        .join('&') + hupiAppSecret;
      
      const encoder = new TextEncoder();
      const data = encoder.encode(signStr);
      const hashBuffer = await crypto.subtle.digest('MD5', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      params.hash = hash;

      try {
        const res = await fetch('https://api.xunhupay.com/payment/do.html', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        });
        
        const result = await res.json();
        
        if (result.errcode !== 0 && result.errcode !== undefined) {
          return json({code:-1,msg:result.errmsg || '创建支付订单失败'});
        }
        
        return json({code:0,data:{payUrl:result.url || result.url_qrcode || '',tradeNo:outTradeNo,finalPrice}});
      } catch(e) {
        return json({code:-1,msg:"支付接口调用失败:" + e.message});
      }
    }

    if (path.startsWith("/api/order/")) {
      const tid = path.split("/").pop();
      const order = await env.DB.prepare(`
        SELECT o.*,c.pan_link,c.pan_code,g.title as goods_title
        FROM orders o
        LEFT JOIN card c ON o.card_id = c.id
        LEFT JOIN goods g ON o.goods_id = g.id
        WHERE o.trade_id=?
      `).bind(tid).first();
      return json({code:0,data:order});
    }

    if (path === "/api/init-db") {
      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS goods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            price REAL NOT NULL,
            description TEXT,
            sort INTEGER DEFAULT 0
          );
        `).run();
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS card (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            goods_id INTEGER NOT NULL,
            pan_link TEXT NOT NULL,
            pan_code TEXT NOT NULL,
            is_used TINYINT DEFAULT 0,
            create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `).run();
        await env.DB.prepare(`
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
        `).run();
        await env.DB.prepare(`
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
        `).run();
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS members (
            user_id INTEGER PRIMARY KEY,
            level TINYINT DEFAULT 0,
            expire_at TIMESTAMP,
            create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `).run();
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS distributors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            invite_code TEXT NOT NULL UNIQUE,
            commission_rate REAL DEFAULT 0.15,
            total_commission REAL DEFAULT 0,
            available_commission REAL DEFAULT 0,
            status TINYINT DEFAULT 0,
            create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `).run();
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS referral_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            referrer_id INTEGER NOT NULL,
            commission REAL DEFAULT 0,
            status TINYINT DEFAULT 0,
            create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `).run();
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS monthly_updates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            month TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            content TEXT,
            create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `).run();

        const exist = await env.DB.prepare("SELECT COUNT(*) as cnt FROM goods").first();
        if (exist.cnt === 0) {
          await env.DB.prepare(`INSERT INTO goods (id,title,price,description,sort) VALUES
            (1,'岗位报考筛选专区',1.99,'岗位筛选工具Excel模板，含往年岗位表、筛选公式、避坑指南',5),
            (2,'行测提分突破营',19.9,'行测五大模块技巧解析、高频考点、易错点总结',4),
            (3,'申论写作黄金模板',29.9,'申论万能模板、热点素材、高分范文',3),
            (4,'时政常识速记手册',12.9,'最新时政热点、常识考点、模拟题',2),
            (5,'国考全套资料大礼包',49.9,'包含以上全部内容，超值合集',1)
          `).run();
        }
        return json({code:0,msg:"数据库初始化成功"});
      } catch(e) {
        return json({code:-1,msg:"初始化失败:"+e.message});
      }
    }

    if (path === "/api/goods") {
      try {
        const list = await env.DB.prepare("SELECT * FROM goods ORDER BY sort DESC").all();
        return json({code:0,data:list.results});
      } catch(e) {
        return json({code:-1,msg:"查询商品失败:" + e.message});
      }
    }

    if (path === "/api/monthly-updates") {
      const list = await env.DB.prepare("SELECT id,month,title,create_at FROM monthly_updates ORDER BY month DESC LIMIT 12").all();
      return json({code:0,data:list.results});
    }

    if (path === "/api/monthly-update/latest") {
      const latest = await env.DB.prepare("SELECT * FROM monthly_updates ORDER BY month DESC LIMIT 1").first();
      return json({code:0,data:latest});
    }

    if (path.startsWith("/api/monthly-update/") && path !== "/api/monthly-update/latest") {
      const month = path.split("/").pop();
      const item = await env.DB.prepare("SELECT * FROM monthly_updates WHERE month=?").bind(month).first();
      if (!item) return json({code:-1,msg:"未找到该月时政"});

      if (request.method === "POST") {
        const body = await request.json();
        const userId = Number(body.userId);
        if (!userId) return json({code:-1,msg:"请登录后查看"});
        const member = await env.DB.prepare("SELECT level FROM members WHERE user_id=? AND expire_at > CURRENT_TIMESTAMP").bind(userId).first();
        if (!member || member.level === 0) return json({code:-1,msg:"需开通会员才能查看全文"});
        return json({code:0,data:item});
      }
      return json({code:0,data:{...item, content:""}});
    }

    if (path === "/api/admin/trigger-monthly" && request.method === "POST") {
      if (!(await verifyAdminToken(env, request))) return json({code:-1,msg:"无权限"},401);
      try {
        await generateMonthlyUpdate(env);
        return json({code:0,msg:"月度时政已生成"});
      } catch(e) {
        return json({code:-1,msg:"生成失败:"+e.message});
      }
    }



    if (path === "/api/register" && request.method === "POST") {
      const body = await request.json();
      const phone = body.phone;
      const password = body.password;
      const nickname = body.nickname || "";
      const referrerId = Number(body.referrerId) || 0;

      if (!phone || !password) return json({code:-1,msg:"手机号和密码不能为空"});
      if (password.length < 6) return json({code:-1,msg:"密码长度不能少于6位"});

      const exist = await env.DB.prepare("SELECT id FROM users WHERE phone=?").bind(phone).first();
      if (exist) return json({code:-1,msg:"该手机号已注册"});

      const hashPwd = await sha256Hex(password);
      const inviteCode = await generateInviteCode(env);
      await env.DB.prepare("INSERT INTO users (phone,password,nickname,invite_code,referrer_id) VALUES (?,?,?,?,?)")
        .bind(phone, hashPwd, nickname, inviteCode, referrerId).run();

      const user = await env.DB.prepare("SELECT id,phone,nickname,invite_code FROM users WHERE phone=?").bind(phone).first();
      await env.DB.prepare("INSERT INTO members (user_id,level,expire_at) VALUES (?,?,?)")
        .bind(user.id, 0, null).run();

      return json({code:0,data:user});
    }

    if (path === "/api/reset-pwd" && request.method === "POST") {
      const body = await request.json();
      const phone = body.phone;
      const newPassword = body.newPassword;

      if (!phone || !newPassword) return json({code:-1,msg:"手机号和新密码不能为空"});
      if (newPassword.length < 6) return json({code:-1,msg:"密码长度不能少于6位"});

      const exist = await env.DB.prepare("SELECT id FROM users WHERE phone=?").bind(phone).first();
      if (!exist) return json({code:-1,msg:"该手机号未注册"});

      const lastReset = await env.DB.prepare("SELECT reset_at FROM users WHERE phone=?").bind(phone).first();
      if (lastReset?.reset_at) {
        const lastTime = new Date(lastReset.reset_at).getTime();
        if (Date.now() - lastTime < 300000) return json({code:-1,msg:"重置过于频繁，请5分钟后再试"});
      }

      const hashPwd = await sha256Hex(newPassword);
      await env.DB.prepare("UPDATE users SET password=?, reset_at=CURRENT_TIMESTAMP WHERE phone=?").bind(hashPwd, phone).run();

      return json({code:0,msg:"密码重置成功，请登录"});
    }

    if (path === "/api/login" && request.method === "POST") {
      const body = await request.json();
      const phone = body.phone;
      const password = body.password;

      if (!phone || !password) return json({code:-1,msg:"手机号和密码不能为空"});

      const hashPwd = await sha256Hex(password);
      const user = await env.DB.prepare("SELECT id,phone,nickname,invite_code,referrer_id FROM users WHERE phone=? AND password=?").bind(phone, hashPwd).first();
      if (!user) return json({code:-1,msg:"手机号或密码错误"});

      const member = await env.DB.prepare("SELECT level,expire_at,total_spent FROM members WHERE user_id=?").bind(user.id).first();
      const distributor = await env.DB.prepare("SELECT status,commission_rate,total_commission,available_commission,invite_code as dist_code FROM distributors WHERE user_id=?").bind(user.id).first();

      return json({code:0,data:{
        ...user,
        member: member || {level:0,expire_at:null,total_spent:0},
        distributor: distributor || null
      }});
    }

    if (path === "/api/member/config") {
      const list = await env.DB.prepare("SELECT * FROM member_config ORDER BY sort ASC").all();
      return json({code:0,data:list.results});
    }

    if (path === "/api/member/buy" && request.method === "POST") {
      const body = await request.json();
      const userId = Number(body.userId);
      const level = Number(body.level);
      const referrerId = Number(body.referrerId) || 0;

      if (!userId || !level) return json({code:-1,msg:"参数错误"});

      const config = await env.DB.prepare("SELECT * FROM member_config WHERE level=?").bind(level).first();
      if (!config) return json({code:-1,msg:"会员等级不存在"});

      const outTradeNo = "VIP" + Date.now() + Math.floor(Math.random()*1000);
      await env.DB.prepare("INSERT INTO orders (trade_id,goods_id,user_id,referrer_id,pay_amount) VALUES (?,?,?,?,?)")
        .bind(outTradeNo, 0, userId, referrerId, config.price).run();

      const notifyUrl = `${siteDomain}/api/callback`;
      
      const params = {
        version: '1.1',
        appid: hupiAppId,
        trade_order_id: outTradeNo,
        total_fee: config.price.toFixed(2),
        title: `VIP会员等级${level}`,
        time: Math.floor(Date.now() / 1000).toString(),
        notify_url: notifyUrl,
        nonce_str: Math.random().toString(36).substring(2, 14),
        type: 'WAP',
        wap_url: siteDomain,
        wap_name: '国考资料工具',
        attach: `VIP_${level}`
      };
      
      const signStr = Object.keys(params)
        .sort()
        .filter(key => params[key])
        .map(key => `${key}=${params[key]}`)
        .join('&') + hupiAppSecret;
      
      const encoder = new TextEncoder();
      const data = encoder.encode(signStr);
      const hashBuffer = await crypto.subtle.digest('MD5', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      params.hash = hash;

      const res = await fetch('https://api.xunhupay.com/payment/do.html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      
      const result = await res.json();
      
      if (result.errcode !== 0 && result.errcode !== undefined) {
        return json({code:-1,msg:result.errmsg || '创建支付订单失败'});
      }
      
      return json({code:0,data:{payUrl:result.url || result.url_qrcode || '',tradeNo:outTradeNo,price:config.price}});
    }

    if (path === "/api/member/info" && request.method === "POST") {
      const body = await request.json();
      const userId = Number(body.userId);
      if (!userId) return json({code:-1,msg:"参数错误"});

      const member = await env.DB.prepare("SELECT level,expire_at,total_spent FROM members WHERE user_id=?").bind(userId).first();
      if (!member) return json({code:-1,msg:"会员信息不存在"});

      const config = await env.DB.prepare("SELECT name,discount,benefits FROM member_config WHERE level=?").bind(member.level).first();

      return json({code:0,data:{
        ...member,
        config: config || null,
        isExpired: member.expire_at ? new Date(member.expire_at) < new Date() : true
      }});
    }

    if (path === "/api/distributor/apply" && request.method === "POST") {
      const body = await request.json();
      const userId = Number(body.userId);
      if (!userId) return json({code:-1,msg:"参数错误"});

      const exist = await env.DB.prepare("SELECT id FROM distributors WHERE user_id=?").bind(userId).first();
      if (exist) return json({code:-1,msg:"您已申请过分销员"});

      const inviteCode = await generateInviteCode(env);
      await env.DB.prepare("INSERT INTO distributors (user_id,status,commission_rate,invite_code) VALUES (?,?,?,?)")
        .bind(userId, 1, 0.15, inviteCode).run();

      return json({code:0,msg:"申请成功，已自动通过"});
    }

    if (path === "/api/distributor/info") {
      const params = new URLSearchParams(url.search);
      const userId = params.get("userId");
      if (!userId) return json({code:-1,msg:"参数错误"});

      const distributor = await env.DB.prepare("SELECT * FROM distributors WHERE user_id=?").bind(userId).first();
      if (!distributor) return json({code:-1,msg:"您还不是分销员"});

      const referralCount = await env.DB.prepare("SELECT COUNT(*) as cnt FROM users WHERE referrer_id=?").bind(userId).first();
      const referralOrderCount = await env.DB.prepare("SELECT COUNT(*) as cnt FROM referral_orders WHERE distributor_id=?").bind(userId).first();
      const recentOrders = await env.DB.prepare(`
        SELECT ro.*,o.pay_amount,o.create_at as order_create_at,u.phone as user_phone,g.title as goods_title
        FROM referral_orders ro
        LEFT JOIN orders o ON ro.order_id = o.trade_id
        LEFT JOIN users u ON ro.user_id = u.id
        LEFT JOIN goods g ON o.goods_id = g.id
        WHERE ro.distributor_id = ?
        ORDER BY ro.create_at DESC
        LIMIT 10
      `).bind(userId).all();

      return json({code:0,data:{
        ...distributor,
        referralCount: referralCount.cnt,
        referralOrderCount: referralOrderCount.cnt,
        totalCommission: distributor.total_commission,
        availableCommission: distributor.available_commission,
        recentOrders: recentOrders.results
      }});
    }

    if (path === "/api/distributor/orders") {
      const params = new URLSearchParams(url.search);
      const userId = params.get("userId");
      const status = params.get("status");

      if (!userId) return json({code:-1,msg:"参数错误"});

      let query = `
        SELECT ro.*,o.pay_amount,o.create_at as order_create_at,u.phone as user_phone
        FROM referral_orders ro
        LEFT JOIN orders o ON ro.order_id = o.trade_id
        LEFT JOIN users u ON ro.user_id = u.id
        WHERE ro.distributor_id = ?
      `;
      const binds = [userId];

      if (status !== undefined) {
        query += " AND ro.status = ?";
        binds.push(status);
      }

      query += " ORDER BY ro.create_at DESC";
      const res = await env.DB.prepare(query).bind(...binds).all();
      return json({code:0,data:res.results});
    }

    if (path === "/api/distributor/withdraw") {
      if (request.method === "GET") {
        const params = new URLSearchParams(url.search);
        const userId = params.get("userId");
        if (!userId) return json({code:-1,msg:"参数错误"});
        
        const distributor = await env.DB.prepare("SELECT available_commission FROM distributors WHERE user_id=?").bind(userId).first();
        if (!distributor) return json({code:-1,msg:"您还不是分销员"});
        
        return json({code:0,data:{availableCommission: distributor.available_commission}});
      }
      
      if (request.method === "POST") {
        const body = await request.json();
        const userId = Number(body.userId);
        const amount = Number(body.amount);

        if (!userId || !amount) return json({code:-1,msg:"参数错误"});
        if (amount < 50) return json({code:-1,msg:"最低提现金额为50元"});

        const distributor = await env.DB.prepare("SELECT available_commission FROM distributors WHERE user_id=?").bind(userId).first();
        if (!distributor) return json({code:-1,msg:"您还不是分销员"});
        if (distributor.available_commission < amount) return json({code:-1,msg:"可提现余额不足"});

        await env.DB.prepare("UPDATE distributors SET available_commission = available_commission - ? WHERE user_id=?")
          .bind(amount, userId).run();

        return json({code:0,msg:"提现申请已提交，将在3个工作日内到账"});
      }
    }

    if (path === "/api/referrer/check") {
      const params = new URLSearchParams(url.search);
      const inviteCode = params.get("code");

      if (!inviteCode) return json({code:-1,msg:"参数错误"});

      const user = await env.DB.prepare("SELECT id,nickname FROM users WHERE invite_code=?").bind(inviteCode).first();
      if (!user) return json({code:-1,msg:"邀请码不存在"});

      const distributor = await env.DB.prepare("SELECT status FROM distributors WHERE user_id=?").bind(user.id).first();
      if (!distributor || distributor.status !== 1) return json({code:-1,msg:"邀请人不是有效分销员"});

      return json({code:0,data:{userId:user.id,nickname:user.nickname}});
    }

    if (path === "/api/admin/login" && request.method === "POST") {
      const body = await request.json();
      const password = body.password;
      if (!password) return json({code:-1,msg:"请输入密码"},401);
      
      if (password !== adminPwd) return json({code:-1,msg:"密码错误"},401);
      
      const token = await sha256Hex(password + Date.now() + Math.random());
      const expireAt = new Date(Date.now() + 86400000).toISOString();
      await env.DB.prepare("INSERT OR REPLACE INTO admin_tokens (token, expire_at) VALUES (?,?)")
        .bind(token, expireAt).run();
      return json({code:0,data:{token,expireAt: Date.now() + 86400000}});
    }

    async function verifyAdminToken(env, request) {
      const auth = request.headers.get("Authorization");
      if (!auth) return false;
      const token = auth.replace("Bearer ", "");
      const t = await env.DB.prepare("SELECT expire_at FROM admin_tokens WHERE token=? AND expire_at > CURRENT_TIMESTAMP")
        .bind(token).first();
      return !!t;
    }

    if (path === "/api/admin") {
      if (!(await verifyAdminToken(env, request))) return json({code:-1,msg:"无权限"},401);

      if (request.method === "POST") {
        const b = await request.json();
        await env.DB.prepare("INSERT INTO goods (title,price,description,sort) VALUES (?,?,?,?)")
          .bind(b.title,b.price,b.desc,b.sort||0).run();
        return json({code:0});
      }
      if (request.method === "GET") {
        const g = await env.DB.prepare("SELECT * FROM goods ORDER BY sort DESC").all();
        const o = await env.DB.prepare("SELECT * FROM orders ORDER BY create_at DESC LIMIT 50").all();
        return json({code:0,goods:g.results,orders:o.results});
      }
    }

    if (path === "/api/admin/distributors") {
      if (!(await verifyAdminToken(env, request))) return json({code:-1},401);

      if (request.method === "PUT") {
        const b = await request.json();
        await env.DB.prepare("UPDATE distributors SET status=?,commission_rate=? WHERE user_id=?")
          .bind(b.status, b.commission_rate, b.user_id).run();
        return json({code:0});
      }

      const status = new URLSearchParams(url.search).get("status");
      let query = "SELECT d.*,u.phone,u.nickname FROM distributors d LEFT JOIN users u ON d.user_id=u.id";
      const binds = [];
      if (status !== undefined) {
        query += " WHERE d.status=?";
        binds.push(status);
      }
      query += " ORDER BY d.create_at DESC";
      const res = await env.DB.prepare(query).bind(...binds).all();
      return json({code:0,data:res.results});
    }

    if (path === "/api/admin/referral-orders") {
      if (!(await verifyAdminToken(env, request))) return json({code:-1},401);

      const res = await env.DB.prepare(`
        SELECT ro.*,o.pay_amount,o.create_at as order_create_at,u.phone as user_phone,du.phone as distributor_phone
        FROM referral_orders ro
        LEFT JOIN orders o ON ro.order_id = o.trade_id
        LEFT JOIN users u ON ro.user_id = u.id
        LEFT JOIN users du ON ro.distributor_id = du.id
        ORDER BY ro.create_at DESC
      `).all();
      return json({code:0,data:res.results});
    }

    if (path === "/api/admin/card" && request.method === "POST") {
      if (!(await verifyAdminToken(env, request))) return json({code:-1},401);
      const b = await request.json();
      const lines = b.text.trim().split("\n");
      const gId = Number(b.goodsId);
      for(let line of lines){
        if(!line.trim()) continue;
        const [link,code] = line.split("|");
        await env.DB.prepare("INSERT INTO card (goods_id,pan_link,pan_code) VALUES (?,?,?)")
          .bind(gId,link.trim(),code.trim()).run();
      }
      return json({code:0});
    }

    // init test cards
    if (path === "/api/init-test-cards") {
      const count = await env.DB.prepare("SELECT COUNT(*) as c FROM card").first();
      if (count && count.c > 0) {
        return json({code:0,msg:"card data exists"});
      }
      await initTestCards(env);
      return json({code:0,msg:"test cards initialized"});
    }

    if (path === "/api/admin/goods" && request.method === "PUT") {
      if (!(await verifyAdminToken(env, request))) return json({code:-1},401);
      const b = await request.json();
      await env.DB.prepare("UPDATE goods SET title=?,price=?,description=?,sort=? WHERE id=?")
        .bind(b.title,b.price,b.desc,b.sort,b.id).run();
      return json({code:0});
    }

    if (path === "/api/admin/goods" && request.method === "DELETE") {
      if (!(await verifyAdminToken(env, request))) return json({code:-1},401);
      const b = await request.json();
      await env.DB.prepare("DELETE FROM goods WHERE id=?").bind(b.id).run();
      return json({code:0});
    }

    if (path === "/api/admin/cards") {
      if (!(await verifyAdminToken(env, request))) return json({code:-1},401);
      const params = new URLSearchParams(url.search);
      const goodsId = params.get("goodsId");
      const used = params.get("used");
      let query = "SELECT * FROM card WHERE goods_id=?";
      const binds = [goodsId];
      if (used !== undefined) {
        query += " AND is_used=?";
        binds.push(used);
      }
      const res = await env.DB.prepare(query + " ORDER BY create_at DESC").bind(...binds).all();
      return json({code:0,data:res.results});
    }

      return new Response("Not Found",{status:404});
    } catch(e) {
      console.error('Worker Error:', e.message);
      return new Response(JSON.stringify({code:-1,msg:"服务器错误:" + e.message}),{status:500,headers:{"Content-Type":"application/json"}});
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(generateMonthlyUpdate(env));
  }
};

function json(obj,status=200){
  return new Response(JSON.stringify(obj),{
    status,
    headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}
  })
}

async function md5Hex(str){
  const buf = await crypto.subtle.digest("MD5",new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

async function sha256Hex(str){
  const buf = await crypto.subtle.digest("SHA-256",new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

async function generateInviteCode(env) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let retry = 0; retry < 5; retry++) {
    let code = "";
    for(let i=0;i<6;i++){
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const exist = await env.DB.prepare("SELECT id FROM users WHERE invite_code=?").bind(code).first();
    if (!exist) {
      const distExist = await env.DB.prepare("SELECT id FROM distributors WHERE invite_code=?").bind(code).first();
      if (!distExist) return code;
    }
  }
  return "GK" + Date.now().toString(36).toUpperCase();
}

async function handleReferralCommission(env, order) {
  const distributor = await env.DB.prepare("SELECT id,commission_rate FROM distributors WHERE user_id=?").bind(order.referrer_id).first();
  if (!distributor) return;

  const commissionAmount = parseFloat((order.pay_amount * distributor.commission_rate).toFixed(2));
  await env.DB.prepare("INSERT INTO referral_orders (order_id,user_id,distributor_id,commission_amount,status) VALUES (?,?,?,?,?)")
    .bind(order.trade_id, order.user_id, order.referrer_id, commissionAmount, 0).run();

  await env.DB.prepare("UPDATE distributors SET total_commission = total_commission + ?, available_commission = available_commission + ? WHERE user_id=?")
    .bind(commissionAmount, commissionAmount, order.referrer_id).run();
}

async function updateMemberTotalSpent(env, userId, amount) {
  await env.DB.prepare("UPDATE members SET total_spent = total_spent + ?, update_at = CURRENT_TIMESTAMP WHERE user_id=?")
    .bind(amount, userId).run();
}

async function handleMemberPurchase(env, userId, level) {
  const config = await env.DB.prepare("SELECT duration_days FROM member_config WHERE level=?").bind(level).first();
  if (!config) return;

  const existingMember = await env.DB.prepare("SELECT expire_at FROM members WHERE user_id=?").bind(userId).first();
  let expireAt;
  
  if (existingMember && existingMember.expire_at) {
    const currentExpire = new Date(existingMember.expire_at);
    const now = new Date();
    const baseDate = currentExpire > now ? currentExpire : now;
    expireAt = new Date(baseDate.getTime() + config.duration_days * 24 * 60 * 60 * 1000).toISOString();
  } else {
    expireAt = new Date(Date.now() + config.duration_days * 24 * 60 * 60 * 1000).toISOString();
  }

  await env.DB.prepare("UPDATE members SET level=?, expire_at=?, update_at=CURRENT_TIMESTAMP WHERE user_id=?")
    .bind(level, expireAt, userId).run();
}

// ====== 月度时政自动生成（Cron触发 + 红线限制提示词）======

async function generateMonthlyUpdate(env) {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = prevMonth.getFullYear();
  const month = String(prevMonth.getMonth() + 1).padStart(2, '0');
  const monthKey = `${year}-${month}`;

  // 幂等：同月不重复生成
  const exist = await env.DB.prepare("SELECT id FROM monthly_updates WHERE month=?").bind(monthKey).first();
  if (exist) {
    console.log(`月度时政 ${monthKey} 已存在，跳过`);
    return;
  }

  if (!env.DEEPSEEK_API_KEY) {
    console.error("未配置 DEEPSEEK_API_KEY，无法生成月度时政");
    return;
  }

  const systemPrompt = `你是一名公考时政资料编辑，负责整理公务员考试时政热点。

【红线规则 - 必须严格遵守】
1. 只整理公开新闻报道和官方发布的内容，绝不编造任何政策、数据、会议
2. 不涉及敏感政治话题评论，不议论政策导向
3. 禁用词汇：押题、真题、绝密、内部、命中、预测、泄漏
4. 保持客观中立，只陈述事实，不做主观评价
5. 不评论领导人个人，只整理政策要点和工作部署
6. 只整理公考可考的知识点，剔除娱乐、体育等无关新闻
7. 内容来源限定：人民日报、新华社、央视新闻、政府官网公开信息
8. 涉及法律法规只引用正式发布内容，不解读立法意图
9. 涉及经济数据只引用国家统计局等官方发布，不添加分析预测

【输出格式】
输出纯HTML（不含html/body标签），结构如下：
<div class="monthly-section"><h2>一、重要会议与政策</h2>
  <div class="topic"><h3>考点标题</h3><p class="topic-content">核心内容</p><p class="exam-tip">🔥 考试角度：考查方向提示</p></div>
</div>
板块包含：重要会议与政策、科技与经济成就、民生与社会热点、新法新规、国际要闻
每个板块至少2个考点，总共15-20个考点。`;

  const userPrompt = `请整理${year}年${month}月的时政高频考点汇总。
要求：
1. 每个考点包含标题、核心内容、考试角度提示
2. 内容精炼，适合公考备考速记
3. 总字数3000-5000字
4. 直接输出HTML，不要markdown标记
5. 如该月无重大时政，可适当补充近期持续性热点`;

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 8000
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`DeepSeek API 错误: ${response.status}`, errText);
    return;
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || '';

  if (!content) {
    console.error("DeepSeek 返回空内容");
    return;
  }

  // 红线词二次过滤
  const bannedWords = ['押题', '真题', '绝密', '内部', '命中', '预测', '泄漏'];
  let safeContent = content;
  for (const word of bannedWords) {
    safeContent = safeContent.replace(new RegExp(word, 'g'), '★');
  }

  const title = `${year}年${month}月时政高频考点汇总`;

  await env.DB.prepare("INSERT INTO monthly_updates (month,title,content) VALUES (?,?,?)")
    .bind(monthKey, title, safeContent).run();

  console.log(`月度时政 ${monthKey} 生成成功`);
}