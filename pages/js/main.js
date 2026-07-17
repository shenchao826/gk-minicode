let tradeNo = "";
let currentPanLink = "";
let currentPanCode = "";
let allGoods = [];
let currentCategory = "all";
let currentUser = null;

const tagMap = {
  1: "tag-new",
  2: "tag-hot",
  3: "tag-hot",
  4: "tag-new",
  5: "tag-package"
};
const tagText = {
  "tag-new": "新人特惠",
  "tag-hot": "热销精选",
  "tag-package": "全站合集"
};

const positionMap = {
  1: "入门工具",
  2: "行测提分",
  3: "申论突破",
  4: "时政常识",
  5: "全套合集"
};

function loadGoods() {
  allGoods = [
    {id:5,title:'国考全套资料大礼包',price:49.9,description:'包含以上全部内容，超值合集',sort:1},
    {id:2,title:'行测提分突破营',price:19.9,description:'行测五大模块技巧解析、高频考点、易错点总结',sort:4},
    {id:3,title:'申论写作黄金模板',price:29.9,description:'申论万能模板、热点素材、高分范文',sort:3},
    {id:4,title:'时政常识速记手册',price:12.9,description:'最新时政热点、常识考点、模拟题',sort:2},
    {id:1,title:'岗位报考筛选专区',price:1.99,description:'岗位筛选工具Excel模板，含往年岗位表、筛选公式、避坑指南',sort:5}
  ];
  renderGoods(allGoods);
}

function loadMemberConfig() {
  const configs = [
    {level:1,name:'普通会员',price:39.9,duration_days:90,discount:0.95,benefits:'全场95折优惠、免费查看时政月度更新、资料永久有效'},
    {level:2,name:'VIP会员',price:99,duration_days:365,discount:0.9,benefits:'全场9折优惠、免费查看时政月度更新、优先获取资料更新、专属客服支持'},
    {level:3,name:'至尊会员',price:199,duration_days:3650,discount:0.85,benefits:'全场85折优惠、免费查看时政月度更新、免费获取全站资料、专属客服支持、优先体验新功能'}
  ];
  renderMemberCards(configs);
}

function renderGoods(goods) {
  const wrap = document.getElementById("goodsList");
  wrap.innerHTML = "";
  
  if (goods.length === 0) {
    wrap.innerHTML = `<div style="text-align:center;padding:60px;color:#A0AEC0">暂无匹配的资料</div>`;
    return;
  }
  
  goods.forEach(item => {
    const tagClass = tagMap[item.id] || "";
    const tagTxt = tagClass ? tagText[tagClass] : "";
    const position = positionMap[item.id] || "";
    const description = formatDescription(item.description);
    
    const div = document.createElement("div");
    div.className = "goods-item";
    div.innerHTML = `
      ${tagClass ? `<div class="goods-tag ${tagClass}">${tagTxt}</div>` : ""}
      <h3>${item.title}</h3>
      ${position ? `<span class="goods-position">${position}</span>` : ""}
      <p class="intro">${description}</p>
      <div class="price-row">
        <div class="price">¥${item.price.toFixed(2)}</div>
        <button class="buy-btn" onclick="buy(${item.id})">立即购买</button>
      </div>
      <p class="service-tip">永久链接补发 | 文档可编辑打印 | 后续内容免费更新</p>
    `;
    wrap.appendChild(div);
  });
}

function renderMemberCards(configs) {
  const wrap = document.getElementById("memberCards");
  wrap.innerHTML = "";
  
  configs.forEach((config, index) => {
    const benefits = config.benefits.split("、");
    const isFeatured = index === 1;
    
    const div = document.createElement("div");
    div.className = `member-card ${isFeatured ? "featured" : ""}`;
    div.innerHTML = `
      <h3>${config.name}</h3>
      <div class="member-price">¥${config.price}</div>
      <div class="member-duration">${config.duration_days}天</div>
      <ul>
        ${benefits.map(b => `<li>${b}</li>`).join("")}
      </ul>
      <button class="member-btn ${isFeatured ? "member-btn-primary" : "member-btn-outline"}" onclick="buyMember(${config.level})">立即开通</button>
    `;
    wrap.appendChild(div);
  });
}

function formatDescription(desc) {
  if (!desc) return "";
  const posMatch = desc.match(/【定位：(.+?)】/);
  if (posMatch) {
    return desc.replace(/【定位：(.+?)】/, "").trim();
  }
  return desc;
}

function setCategory(cat) {
  currentCategory = cat;
  document.querySelectorAll(".cat-btn").forEach(btn => {
    btn.classList.remove("active");
    if (btn.dataset.cat === cat) btn.classList.add("active");
  });
  filterGoods();
}

function filterGoods() {
  const keyword = document.getElementById("searchInput").value.toLowerCase().trim();
  let filtered = allGoods;
  
  if (currentCategory !== "all") {
    filtered = filtered.filter(item => {
      const pos = positionMap[item.id] || "";
      return pos.includes(currentCategory);
    });
  }
  
  if (keyword) {
    filtered = filtered.filter(item => {
      const title = item.title.toLowerCase();
      const desc = (item.description || "").toLowerCase();
      return title.includes(keyword) || desc.includes(keyword);
    });
  }
  
  renderGoods(filtered);
}

const HUPIJIA_APP_ID = "201906179658";
const HUPIJIA_APP_SECRET = "d41d8cd98f00b204e9800998ecf8427e";
const HUPIJIA_API_URL = "https://api.xunhupay.com/payment/do.html";
const SITE_DOMAIN = "https://gk.minicode.cloud";

function md5(str) {
  const table = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476];
  const s = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
             5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
             4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
             6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
  const k = [];
  for (let i = 0; i < 64; i++) k[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000);
  
  function rotateLeft(value, shift) { return (value << shift) | (value >>> (32 - shift)); }
  
  const padding = str + String.fromCharCode(0x80);
  while ((padding.length % 64) !== 56) padding += String.fromCharCode(0);
  const bitLen = str.length * 8;
  padding += String.fromCharCode(bitLen & 0xFF, (bitLen >>> 8) & 0xFF, (bitLen >>> 16) & 0xFF, (bitLen >>> 24) & 0xFF);
  padding += String.fromCharCode(0, 0, 0, 0, 0, 0, 0, 0);
  
  let a = table[0], b = table[1], c = table[2], d = table[3];
  
  for (let i = 0; i < padding.length; i += 64) {
    const chunks = [];
    for (let j = 0; j < 16; j++) {
      chunks[j] = padding.charCodeAt(i + j * 4) | (padding.charCodeAt(i + j * 4 + 1) << 8) |
                  (padding.charCodeAt(i + j * 4 + 2) << 16) | (padding.charCodeAt(i + j * 4 + 3) << 24);
    }
    
    let AA = a, BB = b, CC = c, DD = d;
    
    for (let j = 0; j < 64; j++) {
      let f, g;
      if (j < 16) { f = (b & c) | (~b & d); g = j; }
      else if (j < 32) { f = (d & b) | (~d & c); g = (5 * j + 1) % 16; }
      else if (j < 48) { f = b ^ c ^ d; g = (3 * j + 5) % 16; }
      else { f = c ^ (b | ~d); g = (7 * j) % 16; }
      
      const temp = d;
      d = c;
      c = b;
      b = (b + rotateLeft(a + f + k[j] + chunks[g], s[j])) >>> 0;
      a = temp;
    }
    
    a = (a + AA) >>> 0;
    b = (b + BB) >>> 0;
    c = (c + CC) >>> 0;
    d = (d + DD) >>> 0;
  }
  
  const toHex = (n) => {
    let str = n.toString(16);
    while (str.length < 8) str = '0' + str;
    return str;
  };
  
  return (toHex(a) + toHex(b) + toHex(c) + toHex(d)).toLowerCase();
}

function generateHash(params, secret) {
  const sorted = Object.keys(params).filter(k => params[k]).sort();
  let signStr = '';
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0) signStr += '&';
    signStr += sorted[i] + '=' + params[sorted[i]];
  }
  return md5(signStr + secret);
}

async function createPaymentOrder(params) {
  const baseParams = {
    version: '1.1',
    appid: HUPIJIA_APP_ID,
    trade_order_id: params.tradeNo,
    total_fee: params.amount.toFixed(2),
    title: params.title,
    time: Math.floor(Date.now() / 1000).toString(),
    notify_url: `${SITE_DOMAIN}/api/callback`,
    nonce_str: Math.random().toString(36).substring(2, 14),
    type: 'WAP',
    wap_url: SITE_DOMAIN,
    wap_name: '国考资料工具'
  };
  
  if (params.attach) baseParams.attach = params.attach;
  
  baseParams.hash = generateHash(baseParams, HUPIJIA_APP_SECRET);
  
  try {
    const res = await fetch(HUPIJIA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(baseParams)
    });
    return await res.json();
  } catch(e) {
    throw new Error("支付接口调用失败:" + e.message);
  }
}

async function buy(goodsId) {
  if (!currentUser) {
    openLoginModal();
    return;
  }
  const goods = allGoods.find(g => g.id === goodsId);
  if (!goods) return;
  
  const loadingModal = document.getElementById("loadingModal");
  const loadingText = document.getElementById("loadingText");
  loadingText.textContent = "正在创建支付订单...";
  loadingModal.classList.add("show");
  
  try {
    const tradeNo = "GK" + Date.now() + Math.floor(Math.random() * 1000);
    
    const result = await createPaymentOrder({
      tradeNo,
      amount: goods.price,
      title: goods.title,
      attach: `GOODS_${goodsId}`
    });
    
    loadingModal.classList.remove("show");
    
    if (result.errcode !== 0 && result.errcode !== undefined) {
      return alert(result.errmsg || '创建支付订单失败');
    }
    
    tradeNo = tradeNo;
    
    const payModal = document.getElementById("payModal");
    const payBody = document.getElementById("payBody");
    const payConfirmBtn = document.getElementById("payConfirmBtn");
    
    payBody.innerHTML = `
      <p style="font-size:16px;font-weight:600;margin-bottom:16px">微信扫码支付</p>
      <p><strong>商品名称：</strong>${goods.title}</p>
      <p style="margin-top:8px"><strong>支付金额：</strong><span style="color:#E53E3E;font-size:18px;font-weight:600">¥${goods.price.toFixed(2)}</span></p>
      <p style="margin-top:8px"><strong>订单号：</strong>${tradeNo}</p>
      <div style="margin-top:16px;text-align:center">
        <img src="${result.url_qrcode}" alt="支付二维码" style="max-width:280px;width:100%;border-radius:8px" />
        <p style="margin-top:8px;color:#718096;font-size:13px">请使用微信扫码支付</p>
      </div>
    `;
    
    let paid = false;
    
    payConfirmBtn.onclick = () => {
      if (paid) {
        payModal.classList.remove("show");
        return;
      }
      alert("请扫码完成支付后点击确认");
    };
    
    payModal.classList.add("show");
    
    const checkPay = async () => {
      try {
        const queryRes = await fetch(`https://api.xunhupay.com/payment/query.html`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version: '1.1',
            appid: HUPIJIA_APP_ID,
            trade_order_id: tradeNo,
            time: Math.floor(Date.now() / 1000).toString(),
            nonce_str: Math.random().toString(36).substring(2, 14)
          })
        });
        const queryResult = await queryRes.json();
        
        if (queryResult.errcode === 0 && queryResult.status === 'OD') {
          paid = true;
          payModal.classList.remove("show");
          
          currentPanLink = "https://pan.baidu.com/s/1234567890abcdef";
          currentPanCode = "gk" + goodsId;
          
          const successModal = document.getElementById("orderModal");
          const body = document.getElementById("orderBody");
          const copyBtn = document.getElementById("copyBtn");
          
          body.innerHTML = `
            <p style="color:#279E66;font-weight:600">✅ 支付成功，资料已解锁</p>
            <p style="margin-top:12px"><strong>商品名称：</strong>${goods.title}</p>
            <p style="margin-top:8px"><strong>支付金额：</strong>¥${goods.price.toFixed(2)}</p>
            <p style="margin-top:12px"><strong>网盘链接：</strong><a target="_blank" href="${currentPanLink}">${currentPanLink}</a></p>
            <p style="margin-top:8px"><strong>提取码：</strong>${currentPanCode}</p>
            <p style="margin-top:12px;color:#718096;font-size:13px">请妥善保存链接与提取码，链接失效可凭订单号申请补发</p>
          `;
          copyBtn.style.display = "block";
          successModal.classList.add("show");
          return true;
        }
      } catch(e) {}
      return false;
    };
    
    const interval = setInterval(async () => {
      const success = await checkPay();
      if (success) clearInterval(interval);
    }, 3000);
    
    setTimeout(() => clearInterval(interval), 120000);
    
  } catch(e) {
    loadingModal.classList.remove("show");
    alert("创建订单失败：" + e.message);
  }
}

async function buyMember(level) {
  if (!currentUser) {
    openLoginModal();
    return;
  }
  const configs = [
    {level:1,name:'普通会员',price:39.9,duration_days:90},
    {level:2,name:'VIP会员',price:99,duration_days:365},
    {level:3,name:'至尊会员',price:199,duration_days:3650}
  ];
  const config = configs.find(c => c.level === level);
  if (!config) return;
  
  const loadingModal = document.getElementById("loadingModal");
  const loadingText = document.getElementById("loadingText");
  loadingText.textContent = "正在创建支付订单...";
  loadingModal.classList.add("show");
  
  try {
    const tradeNo = "VIP" + Date.now() + Math.floor(Math.random() * 1000);
    
    const result = await createPaymentOrder({
      tradeNo,
      amount: config.price,
      title: `${config.name}开通`,
      attach: `VIP_${level}`
    });
    
    loadingModal.classList.remove("show");
    
    if (result.errcode !== 0 && result.errcode !== undefined) {
      return alert(result.errmsg || '创建支付订单失败');
    }
    
    const payModal = document.getElementById("payModal");
    const payBody = document.getElementById("payBody");
    const payConfirmBtn = document.getElementById("payConfirmBtn");
    
    payBody.innerHTML = `
      <p style="font-size:16px;font-weight:600;margin-bottom:16px">微信扫码支付</p>
      <p><strong>会员等级：</strong>${config.name}</p>
      <p style="margin-top:8px"><strong>支付金额：</strong><span style="color:#E53E3E;font-size:18px;font-weight:600">¥${config.price}</span></p>
      <p style="margin-top:8px"><strong>有效期：</strong>${config.duration_days}天</p>
      <p style="margin-top:8px"><strong>订单号：</strong>${tradeNo}</p>
      <div style="margin-top:16px;text-align:center">
        <img src="${result.url_qrcode}" alt="支付二维码" style="max-width:280px;width:100%;border-radius:8px" />
        <p style="margin-top:8px;color:#718096;font-size:13px">请使用微信扫码支付</p>
      </div>
    `;
    
    let paid = false;
    
    payConfirmBtn.onclick = () => {
      if (paid) {
        payModal.classList.remove("show");
        return;
      }
      alert("请扫码完成支付后点击确认");
    };
    
    payModal.classList.add("show");
    
    const checkPay = async () => {
      try {
        const queryRes = await fetch(`https://api.xunhupay.com/payment/query.html`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version: '1.1',
            appid: HUPIJIA_APP_ID,
            trade_order_id: tradeNo,
            time: Math.floor(Date.now() / 1000).toString(),
            nonce_str: Math.random().toString(36).substring(2, 14)
          })
        });
        const queryResult = await queryRes.json();
        
        if (queryResult.errcode === 0 && queryResult.status === 'OD') {
          paid = true;
          payModal.classList.remove("show");
          
          currentUser.member = { level: level };
          localStorage.setItem("gk_user", JSON.stringify(currentUser));
          updateUserArea();
          
          const successModal = document.getElementById("orderModal");
          const body = document.getElementById("orderBody");
          const copyBtn = document.getElementById("copyBtn");
          
          body.innerHTML = `
            <p style="color:#279E66;font-weight:600">✅ 支付成功，会员已开通</p>
            <p style="margin-top:12px"><strong>会员等级：</strong>${config.name}</p>
            <p style="margin-top:8px"><strong>支付金额：</strong>¥${config.price}</p>
            <p style="margin-top:8px"><strong>有效期：</strong>${config.duration_days}天</p>
            <p style="margin-top:12px;color:#718096;font-size:13px">您已成功开通${config.name}，可享受全场优惠</p>
          `;
          copyBtn.style.display = "none";
          successModal.classList.add("show");
          return true;
        }
      } catch(e) {}
      return false;
    };
    
    const interval = setInterval(async () => {
      const success = await checkPay();
      if (success) clearInterval(interval);
    }, 3000);
    
    setTimeout(() => clearInterval(interval), 120000);
    
  } catch(e) {
    loadingModal.classList.remove("show");
    alert("创建会员订单失败：" + e.message);
  }
}

window.onload = () => {
  loadGoods();
  loadMemberConfig();
  loadMonthlyUpdates();
  checkLogin();

  const params = new URLSearchParams(location.hash.slice(1));
  const tid = params.get("tid");
  if (tid) {
    tradeNo = tid;
    showOrder(tid);
  }

  const searchParams = new URLSearchParams(location.search);
  const inviteCode = searchParams.get("invite");
  if (inviteCode) {
    document.getElementById("regInviteCode").value = inviteCode;
    if (!currentUser) setTimeout(() => openLoginModal(), 500);
  }
};

function loadMonthlyUpdates() {
  try {
    const wrap = document.getElementById("monthlyList");
    const updates = [
      {month:'2026-07',title:'2026年7月时政热点汇总'},
      {month:'2026-06',title:'2026年6月时政热点汇总'},
      {month:'2026-05',title:'2026年5月时政热点汇总'}
    ];
    wrap.innerHTML = updates.map(item => `
      <div class="monthly-item" onclick="viewMonthly('${item.month}')">
        <div class="monthly-item-left">
          <span class="monthly-badge">${item.month}</span>
          <span class="monthly-title">${item.title}</span>
        </div>
        <span class="monthly-arrow">查看 →</span>
      </div>
    `).join("");
  } catch(e) {
    document.getElementById("monthlyList").innerHTML = `<div style="text-align:center;padding:40px;color:#A0AEC0">加载失败，请稍后刷新</div>`;
  }
}

function viewMonthly(month) {
  const modal = document.getElementById("monthlyModal");
  const title = document.getElementById("monthlyModalTitle");
  const body = document.getElementById("monthlyModalBody");

  title.textContent = "加载中...";
  body.innerHTML = "";
  modal.classList.add("show");

  if (!currentUser) {
    title.textContent = "请先登录";
    body.innerHTML = "<p>查看时政详情需要登录账号，请先登录。</p>";
    return;
  }

  title.textContent = `2026年${month.split('-')[1]}月时政热点汇总`;
  body.innerHTML = `<p>开发中：时政详情内容将在后续版本开通</p>`;
}

function closeMonthlyModal() {
  document.getElementById("monthlyModal").classList.remove("show");
}

function toggleFaq(el) {
  el.classList.toggle('active');
}

function toggleFaqChat() {
  document.getElementById('faqChatModal').classList.toggle('show');
}

function checkLogin() {
  const userData = localStorage.getItem("gk_user");
  if (userData) {
    try {
      currentUser = JSON.parse(userData);
      updateUserArea();
    } catch (e) {
      currentUser = null;
    }
  }
}

function updateUserArea() {
  const userArea = document.getElementById("userArea");
  const applyBtn = document.getElementById("applyDistBtn");
  const viewBtn = document.getElementById("viewDistBtn");
  const loginBtn = document.getElementById("loginDistBtn");
  
  if (currentUser) {
    const memberInfo = currentUser.member || {};
    
    userArea.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:14px;color:#163D8C">${currentUser.nickname || currentUser.phone}</span>
        ${memberInfo.level > 0 ? `<span style="background:#E67722;color:#fff;font-size:12px;padding:2px 8px;border-radius:10px">会员</span>` : ""}
        <button class="login-btn" style="background:#EDF2F7;color:#4A5568" onclick="showMyOrders()">📋 订单</button>
        <button class="login-btn" style="background:#EDF2F7;color:#4A5568" onclick="logout()">退出</button>
      </div>
    `;
    
    applyBtn.style.display = "inline-block";
    viewBtn.style.display = "none";
    loginBtn.style.display = "none";
  } else {
    userArea.innerHTML = `<button class="login-btn" onclick="openLoginModal()">登录 / 注册</button>`;
    applyBtn.style.display = "none";
    viewBtn.style.display = "none";
    loginBtn.style.display = "inline-block";
  }
}

function openLoginModal() {
  document.getElementById("loginModal").classList.add("show");
}

function closeLoginModal() {
  document.getElementById("loginModal").classList.remove("show");
}

function switchLoginTab(tab) {
  document.querySelectorAll(".login-tab").forEach(t => t.classList.remove("active"));
  if (event && event.target) event.target.classList.add("active");
  document.getElementById("loginForm").style.display = tab === "login" ? "block" : "none";
  document.getElementById("registerForm").style.display = tab === "register" ? "block" : "none";
  document.getElementById("resetForm").style.display = tab === "reset" ? "block" : "none";
}

function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone);
}

function doLogin() {
  const phone = document.getElementById("loginPhone").value;
  const password = document.getElementById("loginPassword").value;
  
  if (!phone || !password) return alert("请填写手机号和密码");
  if (!isValidPhone(phone)) return alert("请输入正确的手机号");
  
  const users = JSON.parse(localStorage.getItem("gk_users") || "[]");
  const user = users.find(u => u.phone === phone && u.password === password);
  
  if (!user) return alert("手机号或密码错误");
  
  currentUser = user;
  localStorage.setItem("gk_user", JSON.stringify(currentUser));
  updateUserArea();
  closeLoginModal();
  alert("登录成功");
}

function doRegister() {
  const phone = document.getElementById("regPhone").value;
  const password = document.getElementById("regPassword").value;
  const nickname = document.getElementById("regNickname").value;
  
  if (!phone || !password) return alert("请填写手机号和密码");
  if (!isValidPhone(phone)) return alert("请输入正确的手机号");
  if (password.length < 6) return alert("密码长度不能少于6位");
  
  const users = JSON.parse(localStorage.getItem("gk_users") || "[]");
  const exist = users.find(u => u.phone === phone);
  
  if (exist) return alert("该手机号已注册");
  
  const newUser = {
    id: Date.now(),
    phone: phone,
    password: password,
    nickname: nickname || phone,
    avatar: "",
    invite_code: "INV" + Math.random().toString(36).substr(2, 6).toUpperCase(),
    referrer_id: 0,
    member: { level: 0 }
  };
  
  users.push(newUser);
  localStorage.setItem("gk_users", JSON.stringify(users));
  
  alert("注册成功，请登录");
  switchLoginTab("login");
}

function doResetPwd() {
  const phone = document.getElementById("resetPhone").value;
  const newPassword = document.getElementById("resetPassword").value;
  
  if (!phone || !newPassword) return alert("请填写手机号和新密码");
  if (!isValidPhone(phone)) return alert("请输入正确的手机号");
  if (newPassword.length < 6) return alert("密码长度不能少于6位");
  
  const users = JSON.parse(localStorage.getItem("gk_users") || "[]");
  const userIndex = users.findIndex(u => u.phone === phone);
  
  if (userIndex === -1) return alert("该手机号未注册");
  
  users[userIndex].password = newPassword;
  localStorage.setItem("gk_users", JSON.stringify(users));
  
  alert("密码重置成功，请登录");
  switchLoginTab("login");
}

function logout() {
  localStorage.removeItem("gk_user");
  currentUser = null;
  updateUserArea();
  alert("已退出登录");
}

function applyDistributor() {
  if (!currentUser) {
    openLoginModal();
    return;
  }
  alert("开发中：分销功能将在后续版本开通");
}

function openDistModal() {
  if (!currentUser) {
    openLoginModal();
    return;
  }
  alert("开发中：分销中心将在后续版本开通");
}

function closeDistModal() {
  document.getElementById("distModal").classList.remove("show");
}

function showMyOrders() {
  const modal = document.getElementById("ordersModal");
  const body = document.getElementById("ordersBody");
  modal.classList.add("show");
  body.innerHTML = "<p style='text-align:center;color:#A0AEC0;padding:40px 0'>暂无订单</p>";
}

function closeOrdersModal() {
  document.getElementById("ordersModal").classList.remove("show");
}

function showOrder(tid) {
  const modal = document.getElementById("orderModal");
  const body = document.getElementById("orderBody");
  const copyBtn = document.getElementById("copyBtn");
  copyBtn.style.display = "none";

  body.innerHTML = "<p>❌ 未查询到该订单，请核对订单编号</p>";
  modal.classList.add("show");
}

function closeModal() {
  document.getElementById("orderModal").classList.remove("show");
  location.hash = "";
}

function openQueryModal() {
  document.getElementById("queryModal").classList.add("show");
}

function closeQueryModal() {
  document.getElementById("queryModal").classList.remove("show");
}

function manualQuery() {
  const tid = document.getElementById("tidInput").value.trim();
  if (!tid) return alert("请输入订单编号");
  closeQueryModal();
  showOrder(tid);
}

document.getElementById("copyBtn").addEventListener("click", async () => {
  const text = `网盘链接：${currentPanLink}  提取码：${currentPanCode}`;
  await navigator.clipboard.writeText(text);
  alert("复制成功，可直接粘贴使用");
});