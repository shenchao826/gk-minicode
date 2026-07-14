export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const siteDomain = env.SITE_DOMAIN;
    const adminPwd = env.ADMIN_PASSWORD;
    const hupiAppId = env.HUPIJIA_APP_ID;
    const hupiAppSecret = env.HUPIJIA_APP_SECRET;

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

      if (callbackData.trade_status !== 'TRADE_SUCCESS') {
        console.log('非成功状态:', callbackData.trade_status);
        return new Response('success', { headers: { 'Content-Type': 'text/plain' } });
      }

      const tradeNo = callbackData.out_trade_order_no || callbackData.trade_order_id;
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
        await env.DB.transaction(async tx => {
          const card = await tx.prepare("SELECT id FROM card WHERE goods_id=? AND is_used=0 LIMIT 1").bind(goodsId).first();
          if (!card) throw new Error("no_card");
          cardId = card.id;
          await tx.prepare("UPDATE card SET is_used=1 WHERE id=?").bind(card.id).run();
          await tx.prepare("INSERT INTO orders (trade_id,goods_id,card_id,user_id,referrer_id,pay_amount) VALUES (?,?,?,?,?,?)")
            .bind(outTradeNo, goodsId, card.id, userId, referrerId, finalPrice).run();
        });
      } catch (e) {
        if (e.message === "no_card") return json({code:-1,msg:"商品库存不足"});
        return json({code:-1,msg:"创建订单失败，请重试"});
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
      
      return json({code:0,data:{payUrl:result.url || result.url_qrcode || '',tradeNo:outTradeNo,finalPrice}});
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

    if (path === "/api/goods") {
      const list = await env.DB.prepare("SELECT * FROM goods ORDER BY sort DESC").all();
      return json({code:0,data:list.results});
    }

    if (path === "/api/sms/send" && request.method === "POST") {
      const body = await request.json();
      const phone = body.phone;
      const scene = body.scene || "register";

      if (!phone) return json({code:-1,msg:"请输入手机号"});
      if (!/^1[3-9]\d{9}$/.test(phone)) return json({code:-1,msg:"手机号格式不正确"});

      const exist = await env.DB.prepare("SELECT id FROM sms_codes WHERE phone=? AND used=0 AND expires_at > CURRENT_TIMESTAMP").bind(phone).first();
      if (exist) return json({code:-1,msg:"验证码已发送，请稍后再试"});

      const lastSend = await env.DB.prepare("SELECT create_at FROM sms_codes WHERE phone=? ORDER BY create_at DESC LIMIT 1").bind(phone).first();
      if (lastSend) {
        const lastTime = new Date(lastSend.create_at).getTime();
        if (Date.now() - lastTime < 60000) return json({code:-1,msg:"发送过于频繁，请1分钟后再试"});
      }

      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      await env.DB.prepare("INSERT INTO sms_codes (phone,code,scene,expires_at) VALUES (?,?,?,?)")
        .bind(phone, code, scene, expiresAt).run();

      console.log(`SMS code sent: phone=${phone}, code=${code}, scene=${scene}`);

      return json({code:0,msg:"验证码已发送，请注意查收"});
    }

    if (path === "/api/sms/verify" && request.method === "POST") {
      const body = await request.json();
      const phone = body.phone;
      const code = body.code;
      const scene = body.scene || "register";

      if (!phone || !code) return json({code:-1,msg:"参数错误"});

      const sms = await env.DB.prepare("SELECT * FROM sms_codes WHERE phone=? AND code=? AND scene=? AND used=0 AND expires_at > CURRENT_TIMESTAMP").bind(phone, code, scene).first();
      if (!sms) return json({code:-1,msg:"验证码无效或已过期"});

      await env.DB.prepare("UPDATE sms_codes SET used=1 WHERE id=?").bind(sms.id).run();

      return json({code:0,msg:"验证成功"});
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

      const hashPwd = await sha256Hex(newPassword);
      await env.DB.prepare("UPDATE users SET password=? WHERE phone=?").bind(hashPwd, phone).run();

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

      if (!userId || !level) return json({code:-1,msg:"参数错误"});

      const config = await env.DB.prepare("SELECT * FROM member_config WHERE level=?").bind(level).first();
      if (!config) return json({code:-1,msg:"会员等级不存在"});

      const outTradeNo = "VIP" + Date.now() + Math.floor(Math.random()*1000);
      await env.DB.prepare("INSERT INTO orders (trade_id,goods_id,user_id,pay_amount) VALUES (?,?,?,?)")
        .bind(outTradeNo, 0, userId, config.price).run();

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
        .bind(userId, 0, 0.15, inviteCode).run();

      return json({code:0,msg:"申请已提交，等待审核"});
    }

    if (path === "/api/distributor/info" && request.method === "POST") {
      const body = await request.json();
      const userId = Number(body.userId);
      if (!userId) return json({code:-1,msg:"参数错误"});

      const distributor = await env.DB.prepare("SELECT * FROM distributors WHERE user_id=?").bind(userId).first();
      if (!distributor) return json({code:-1,msg:"您还不是分销员"});

      const referralCount = await env.DB.prepare("SELECT COUNT(*) as cnt FROM users WHERE referrer_id=?").bind(userId).first();
      const referralOrderCount = await env.DB.prepare("SELECT COUNT(*) as cnt FROM referral_orders WHERE distributor_id=?").bind(userId).first();

      return json({code:0,data:{
        ...distributor,
        referralCount: referralCount.cnt,
        referralOrderCount: referralOrderCount.cnt
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

    if (path === "/api/distributor/withdraw" && request.method === "POST") {
      const body = await request.json();
      const userId = Number(body.userId);
      const amount = Number(body.amount);

      if (!userId || !amount) return json({code:-1,msg:"参数错误"});
      if (amount < 10) return json({code:-1,msg:"最低提现金额为10元"});

      const distributor = await env.DB.prepare("SELECT available_commission FROM distributors WHERE user_id=?").bind(userId).first();
      if (!distributor) return json({code:-1,msg:"您还不是分销员"});
      if (distributor.available_commission < amount) return json({code:-1,msg:"可提现余额不足"});

      await env.DB.prepare("UPDATE distributors SET available_commission = available_commission - ? WHERE user_id=?")
        .bind(amount, userId).run();

      return json({code:0,msg:"提现申请已提交，将在3个工作日内到账"});
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
      return json({code:0,data:{token,expireAt: Date.now() + 86400000}});
    }

    if (path === "/api/admin") {
      const auth = request.headers.get("Authorization");
      if (!auth) return json({code:-1,msg:"无权限"},401);

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
      const auth = request.headers.get("Authorization");
      if (!auth) return json({code:-1},401);

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
      const auth = request.headers.get("Authorization");
      if (!auth) return json({code:-1},401);

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
      const auth = request.headers.get("Authorization");
      if (!auth) return json({code:-1},401);
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

    if (path === "/api/admin/goods" && request.method === "PUT") {
      const auth = request.headers.get("Authorization");
      if (!auth) return json({code:-1},401);
      const b = await request.json();
      await env.DB.prepare("UPDATE goods SET title=?,price=?,description=?,sort=? WHERE id=?")
        .bind(b.title,b.price,b.desc,b.sort,b.id).run();
      return json({code:0});
    }

    if (path === "/api/admin/goods" && request.method === "DELETE") {
      const auth = request.headers.get("Authorization");
      if (!auth) return json({code:-1},401);
      const b = await request.json();
      await env.DB.prepare("DELETE FROM goods WHERE id=?").bind(b.id).run();
      return json({code:0});
    }

    if (path === "/api/admin/cards") {
      const auth = request.headers.get("Authorization");
      if (!auth) return json({code:-1},401);
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
  const distributor = await env.DB.prepare("SELECT id,commission_rate FROM distributors WHERE user_id=? AND status=1").bind(order.referrer_id).first();
  if (!distributor) return;

  const commissionAmount = parseFloat((order.pay_amount * distributor.commission_rate).toFixed(2));
  await env.DB.prepare("INSERT INTO referral_orders (order_id,user_id,distributor_id,commission_amount,status) VALUES (?,?,?,?,?)")
    .bind(order.trade_id, order.user_id, distributor.id, commissionAmount, 0).run();

  await env.DB.prepare("UPDATE distributors SET total_commission = total_commission + ?, available_commission = available_commission + ? WHERE id=?")
    .bind(commissionAmount, commissionAmount, distributor.id).run();
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