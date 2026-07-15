export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/', '');
  
  if (!env.DB) {
    return new Response(JSON.stringify({ code: -1, msg: '数据库未配置' }), { headers: { 'Content-Type': 'application/json' } });
  }

  const db = env.DB;

  try {
    if (path === 'goods' && request.method === 'GET') {
      const { results } = await db.prepare('SELECT * FROM goods ORDER BY sort DESC').all();
      return new Response(JSON.stringify({ code: 0, data: results }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (path === 'member/config' && request.method === 'GET') {
      const { results } = await db.prepare('SELECT * FROM member_config ORDER BY sort').all();
      return new Response(JSON.stringify({ code: 0, data: results }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (path === 'monthly-updates' && request.method === 'GET') {
      const { results } = await db.prepare('SELECT * FROM monthly_updates ORDER BY month DESC LIMIT 12').all();
      return new Response(JSON.stringify({ code: 0, data: results }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (path === 'monthly-update/latest' && request.method === 'GET') {
      const { results } = await db.prepare('SELECT * FROM monthly_updates ORDER BY month DESC LIMIT 1').all();
      return new Response(JSON.stringify({ code: 0, data: results[0] || null }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (path.startsWith('monthly-update/') && request.method === 'POST') {
      const month = path.replace('monthly-update/', '');
      const { results } = await db.prepare('SELECT * FROM monthly_updates WHERE month = ?').bind(month).all();
      return new Response(JSON.stringify({ code: 0, data: results[0] || null }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (path === 'login' && request.method === 'POST') {
      const { phone, password } = await request.json();
      if (!phone || !password) {
        return new Response(JSON.stringify({ code: -1, msg: '请填写手机号和密码' }), { headers: { 'Content-Type': 'application/json' } });
      }
      const { results } = await db.prepare('SELECT * FROM users WHERE phone = ? AND password = ?').bind(phone, password).all();
      if (results.length === 0) {
        return new Response(JSON.stringify({ code: -1, msg: '手机号或密码错误' }), { headers: { 'Content-Type': 'application/json' } });
      }
      const user = results[0];
      const token = Math.random().toString(36).substr(2) + Date.now().toString(36);
      await db.prepare('UPDATE users SET token = ?, token_expire = datetime(\'now\', \'+7 days\') WHERE id = ?').bind(token, user.id).run();
      return new Response(JSON.stringify({ code: 0, data: { token, userId: user.id, phone: user.phone } }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (path === 'register' && request.method === 'POST') {
      const { phone, password } = await request.json();
      if (!phone || !password) {
        return new Response(JSON.stringify({ code: -1, msg: '请填写手机号和密码' }), { headers: { 'Content-Type': 'application/json' } });
      }
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        return new Response(JSON.stringify({ code: -1, msg: '请输入正确的手机号' }), { headers: { 'Content-Type': 'application/json' } });
      }
      if (password.length < 6) {
        return new Response(JSON.stringify({ code: -1, msg: '密码长度不能少于6位' }), { headers: { 'Content-Type': 'application/json' } });
      }
      const { results: exists } = await db.prepare('SELECT id FROM users WHERE phone = ?').bind(phone).all();
      if (exists.length > 0) {
        return new Response(JSON.stringify({ code: -1, msg: '手机号已注册' }), { headers: { 'Content-Type': 'application/json' } });
      }
      const token = Math.random().toString(36).substr(2) + Date.now().toString(36);
      await db.prepare('INSERT INTO users (phone, password, token, token_expire) VALUES (?, ?, ?, datetime(\'now\', \'+7 days\'))').bind(phone, password, token).run();
      return new Response(JSON.stringify({ code: 0, data: { token, phone } }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (path === 'reset-pwd' && request.method === 'POST') {
      const { phone, newPassword } = await request.json();
      if (!phone || !newPassword) {
        return new Response(JSON.stringify({ code: -1, msg: '请填写手机号和新密码' }), { headers: { 'Content-Type': 'application/json' } });
      }
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        return new Response(JSON.stringify({ code: -1, msg: '请输入正确的手机号' }), { headers: { 'Content-Type': 'application/json' } });
      }
      if (newPassword.length < 6) {
        return new Response(JSON.stringify({ code: -1, msg: '密码长度不能少于6位' }), { headers: { 'Content-Type': 'application/json' } });
      }
      const { results: exists } = await db.prepare('SELECT id FROM users WHERE phone = ?').bind(phone).all();
      if (exists.length === 0) {
        return new Response(JSON.stringify({ code: -1, msg: '该手机号未注册' }), { headers: { 'Content-Type': 'application/json' } });
      }
      await db.prepare('UPDATE users SET password = ? WHERE phone = ?').bind(newPassword, phone).run();
      return new Response(JSON.stringify({ code: 0, msg: '密码重置成功' }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (path === 'user/info' && request.method === 'GET') {
      const token = request.headers.get('Authorization')?.replace('Bearer ', '');
      if (!token) {
        return new Response(JSON.stringify({ code: -1, msg: '请登录' }), { headers: { 'Content-Type': 'application/json' } });
      }
      const { results } = await db.prepare('SELECT * FROM users WHERE token = ? AND token_expire > datetime(\'now\')').bind(token).all();
      if (results.length === 0) {
        return new Response(JSON.stringify({ code: -1, msg: '登录已过期' }), { headers: { 'Content-Type': 'application/json' } });
      }
      const user = results[0];
      const { results: memberResults } = await db.prepare('SELECT * FROM members WHERE user_id = ? AND expire_at > datetime(\'now\')').bind(user.id).all();
      return new Response(JSON.stringify({ code: 0, data: { phone: user.phone, member: memberResults[0] || null } }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (path === 'member/purchase' && request.method === 'POST') {
      const token = request.headers.get('Authorization')?.replace('Bearer ', '');
      if (!token) {
        return new Response(JSON.stringify({ code: -1, msg: '请登录' }), { headers: { 'Content-Type': 'application/json' } });
      }
      const { results: userResults } = await db.prepare('SELECT * FROM users WHERE token = ? AND token_expire > datetime(\'now\')').bind(token).all();
      if (userResults.length === 0) {
        return new Response(JSON.stringify({ code: -1, msg: '登录已过期' }), { headers: { 'Content-Type': 'application/json' } });
      }
      const user = userResults[0];
      const { level } = await request.json();
      const { results: configResults } = await db.prepare('SELECT * FROM member_config WHERE level = ?').bind(level).all();
      if (configResults.length === 0) {
        return new Response(JSON.stringify({ code: -1, msg: '会员等级不存在' }), { headers: { 'Content-Type': 'application/json' } });
      }
      const config = configResults[0];
      const orderNo = 'MO' + Date.now().toString(10) + Math.random().toString(36).substr(2, 6).toUpperCase();
      await db.prepare('INSERT INTO orders (order_no, user_id, type, amount, status) VALUES (?, ?, ?, ?, ?)').bind(orderNo, user.id, 'member', config.price, 'pending').run();
      await db.prepare('UPDATE members SET level = ?, expire_at = datetime(\'now\', ?) WHERE user_id = ?').bind(config.level, `+${config.duration_days} days`, user.id).run();
      if (config.level > 0) {
        const { results: existing } = await db.prepare('SELECT id FROM members WHERE user_id = ?').bind(user.id).all();
        if (existing.length === 0) {
          await db.prepare('INSERT INTO members (user_id, level, expire_at) VALUES (?, ?, datetime(\'now\', ?))').bind(user.id, config.level, `+${config.duration_days} days`).run();
        }
      }
      return new Response(JSON.stringify({ code: 0, data: { orderNo, payUrl: '#', amount: config.price } }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (path === 'goods/buy' && request.method === 'POST') {
      const token = request.headers.get('Authorization')?.replace('Bearer ', '');
      if (!token) {
        return new Response(JSON.stringify({ code: -1, msg: '请登录' }), { headers: { 'Content-Type': 'application/json' } });
      }
      const { results: userResults } = await db.prepare('SELECT * FROM users WHERE token = ? AND token_expire > datetime(\'now\')').bind(token).all();
      if (userResults.length === 0) {
        return new Response(JSON.stringify({ code: -1, msg: '登录已过期' }), { headers: { 'Content-Type': 'application/json' } });
      }
      const user = userResults[0];
      const { goodsId } = await request.json();
      const { results: goodsResults } = await db.prepare('SELECT * FROM goods WHERE id = ?').bind(goodsId).all();
      if (goodsResults.length === 0) {
        return new Response(JSON.stringify({ code: -1, msg: '商品不存在' }), { headers: { 'Content-Type': 'application/json' } });
      }
      const goods = goodsResults[0];
      const orderNo = 'GO' + Date.now().toString(10) + Math.random().toString(36).substr(2, 6).toUpperCase();
      await db.prepare('INSERT INTO orders (order_no, user_id, goods_id, amount, status) VALUES (?, ?, ?, ?, ?)').bind(orderNo, user.id, goodsId, goods.price, 'pending').run();
      return new Response(JSON.stringify({ code: 0, data: { orderNo, payUrl: '#', amount: goods.price } }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (path === 'orders' && request.method === 'GET') {
      const token = request.headers.get('Authorization')?.replace('Bearer ', '');
      if (!token) {
        return new Response(JSON.stringify({ code: -1, msg: '请登录' }), { headers: { 'Content-Type': 'application/json' } });
      }
      const { results: userResults } = await db.prepare('SELECT * FROM users WHERE token = ? AND token_expire > datetime(\'now\')').bind(token).all();
      if (userResults.length === 0) {
        return new Response(JSON.stringify({ code: -1, msg: '登录已过期' }), { headers: { 'Content-Type': 'application/json' } });
      }
      const user = userResults[0];
      const { results } = await db.prepare('SELECT o.*, g.title AS goods_title FROM orders o LEFT JOIN goods g ON o.goods_id = g.id WHERE o.user_id = ? ORDER BY o.create_at DESC').bind(user.id).all();
      return new Response(JSON.stringify({ code: 0, data: results }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (path === 'order/detail' && request.method === 'GET') {
      const token = request.headers.get('Authorization')?.replace('Bearer ', '');
      const orderNo = url.searchParams.get('orderNo');
      if (!token || !orderNo) {
        return new Response(JSON.stringify({ code: -1, msg: '参数错误' }), { headers: { 'Content-Type': 'application/json' } });
      }
      const { results: userResults } = await db.prepare('SELECT * FROM users WHERE token = ? AND token_expire > datetime(\'now\')').bind(token).all();
      if (userResults.length === 0) {
        return new Response(JSON.stringify({ code: -1, msg: '登录已过期' }), { headers: { 'Content-Type': 'application/json' } });
      }
      const user = userResults[0];
      const { results } = await db.prepare('SELECT o.*, g.title AS goods_title, c.pan_link, c.pan_code FROM orders o LEFT JOIN goods g ON o.goods_id = g.id LEFT JOIN card c ON o.card_id = c.id WHERE o.order_no = ? AND o.user_id = ?').bind(orderNo, user.id).all();
      return new Response(JSON.stringify({ code: 0, data: results[0] || null }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (path === 'distributor/apply' && request.method === 'POST') {
      const token = request.headers.get('Authorization')?.replace('Bearer ', '');
      if (!token) {
        return new Response(JSON.stringify({ code: -1, msg: '请登录' }), { headers: { 'Content-Type': 'application/json' } });
      }
      const { results: userResults } = await db.prepare('SELECT * FROM users WHERE token = ? AND token_expire > datetime(\'now\')').bind(token).all();
      if (userResults.length === 0) {
        return new Response(JSON.stringify({ code: -1, msg: '登录已过期' }), { headers: { 'Content-Type': 'application/json' } });
      }
      const user = userResults[0];
      const inviteCode = Math.random().toString(36).substr(2, 8).toUpperCase();
      await db.prepare('INSERT OR REPLACE INTO distributors (user_id, invite_code, status) VALUES (?, ?, ?)').bind(user.id, inviteCode, 'pending').run();
      return new Response(JSON.stringify({ code: 0, msg: '申请提交成功，等待审核' }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (path === 'distributor/info' && request.method === 'GET') {
      const token = request.headers.get('Authorization')?.replace('Bearer ', '');
      if (!token) {
        return new Response(JSON.stringify({ code: -1, msg: '请登录' }), { headers: { 'Content-Type': 'application/json' } });
      }
      const { results: userResults } = await db.prepare('SELECT * FROM users WHERE token = ? AND token_expire > datetime(\'now\')').bind(token).all();
      if (userResults.length === 0) {
        return new Response(JSON.stringify({ code: -1, msg: '登录已过期' }), { headers: { 'Content-Type': 'application/json' } });
      }
      const user = userResults[0];
      const { results } = await db.prepare('SELECT * FROM distributors WHERE user_id = ?').bind(user.id).all();
      if (results.length === 0) {
        return new Response(JSON.stringify({ code: -1, msg: '您还不是分销员' }), { headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ code: 0, data: results[0] }), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ code: -1, msg: '接口不存在' }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('API error:', e);
    return new Response(JSON.stringify({ code: -1, msg: '服务器错误: ' + e.message }), { headers: { 'Content-Type': 'application/json' } });
  }
}
