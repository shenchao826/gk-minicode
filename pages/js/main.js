let tradeNo = "";
const apiPrefix = "/api";
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
    {level:1,name:'普通会员',price:39.9,duration_days:90,discount:0.95,benefits:'全场95折优惠\n免费查看时政月度更新\n资料永久有效'},
    {level:2,name:'VIP会员',price:99,duration_days:365,discount:0.9,benefits:'全场9折优惠\n免费查看时政月度更新\n优先获取资料更新\n专属客服支持'},
    {level:3,name:'至尊会员',price:199,duration_days:3650,discount:0.85,benefits:'全场85折优惠\n免费查看时政月度更新\n免费获取全站资料\n专属客服支持\n优先体验新功能'}
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

async function buy(goodsId) {
  if (!currentUser) {
    openLoginModal();
    return;
  }
  
  const res = await fetch(`${apiPrefix}/createorder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goodsId, userId: currentUser.id })
  }).then(r => r.json());
  if (res.code !== 0) return alert(res.msg);
  tradeNo = res.data.tradeNo;
  window.location.href = res.data.payUrl;
}

async function buyMember(level) {
  if (!currentUser) {
    openLoginModal();
    return;
  }
  
  const res = await fetch(`${apiPrefix}/member/buy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: currentUser.id, level })
  }).then(r => r.json());
  if (res.code !== 0) return alert(res.msg);
  tradeNo = res.data.tradeNo;
  window.location.href = res.data.payUrl;
}

window.onload = async () => {
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

// ====== 月度时政更新 ======

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

async function viewMonthly(month) {
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

  const res = await fetch(`${apiPrefix}/monthly-update/${month}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: currentUser.id })
  }).then(r => r.json());

  if (res.code !== 0 || !res.data) {
    title.textContent = "查看失败";
    body.innerHTML = `<p>${res.msg || "未找到该月时政内容"}</p>`;
    return;
  }

  title.textContent = res.data.title;
  body.innerHTML = res.data.content || "<p>暂无内容，请开通会员后查看完整时政汇总。</p>";
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
    const distInfo = currentUser.distributor || null;
    
    userArea.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:14px;color:#163D8C">${currentUser.nickname || currentUser.phone}</span>
        ${memberInfo.level > 0 ? `<span style="background:#E67722;color:#fff;font-size:12px;padding:2px 8px;border-radius:10px">会员</span>` : ""}
        <button class="login-btn" style="background:#EDF2F7;color:#4A5568" onclick="showMyOrders()">📋 订单</button>
        <button class="login-btn" style="background:#EDF2F7;color:#4A5568" onclick="logout()">退出</button>
      </div>
    `;
    
    if (distInfo) {
      applyBtn.style.display = "none";
      viewBtn.style.display = "inline-block";
      loginBtn.style.display = "none";
    } else {
      applyBtn.style.display = "inline-block";
      viewBtn.style.display = "none";
      loginBtn.style.display = "none";
    }
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

async function doLogin() {
  const phone = document.getElementById("loginPhone").value;
  const password = document.getElementById("loginPassword").value;
  
  if (!phone || !password) return alert("请填写手机号和密码");
  if (!isValidPhone(phone)) return alert("请输入正确的手机号");
  
  const res = await fetch(`${apiPrefix}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password })
  }).then(r => r.json());
  
  if (res.code !== 0) return alert(res.msg);
  
  currentUser = res.data;
  localStorage.setItem("gk_user", JSON.stringify(currentUser));
  updateUserArea();
  closeLoginModal();
  alert("登录成功");
}

async function doRegister() {
  const phone = document.getElementById("regPhone").value;
  const password = document.getElementById("regPassword").value;
  const nickname = document.getElementById("regNickname").value;
  const inviteCode = document.getElementById("regInviteCode").value;
  
  if (!phone || !password) return alert("请填写手机号和密码");
  if (!isValidPhone(phone)) return alert("请输入正确的手机号");
  if (password.length < 6) return alert("密码长度不能少于6位");
  
  let referrerId = 0;
  if (inviteCode) {
    const checkRes = await fetch(`${apiPrefix}/referrer/check?code=${inviteCode}`).then(r => r.json());
    if (checkRes.code === 0) {
      referrerId = checkRes.data.userId;
    } else {
      return alert("邀请码无效");
    }
  }
  
  const res = await fetch(`${apiPrefix}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password, nickname, referrerId })
  }).then(r => r.json());
  
  if (res.code !== 0) return alert(res.msg);
  
  alert("注册成功，请登录");
  switchLoginTab("login");
}

async function doResetPwd() {
  const phone = document.getElementById("resetPhone").value;
  const newPassword = document.getElementById("resetPassword").value;
  
  if (!phone || !newPassword) return alert("请填写手机号和新密码");
  if (!isValidPhone(phone)) return alert("请输入正确的手机号");
  if (newPassword.length < 6) return alert("密码长度不能少于6位");
  
  const res = await fetch(`${apiPrefix}/reset-pwd`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, newPassword })
  }).then(r => r.json());
  
  if (res.code !== 0) return alert(res.msg);
  
  alert("密码重置成功，请登录");
  switchLoginTab("login");
}

function logout() {
  localStorage.removeItem("gk_user");
  currentUser = null;
  updateUserArea();
  alert("已退出登录");
}

async function applyDistributor() {
  if (!currentUser) return;
  
  const res = await fetch(`${apiPrefix}/distributor/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: currentUser.id })
  }).then(r => r.json());
  
  if (res.code !== 0) return alert(res.msg);
  
  if (res.data) {
    currentUser.member = res.data.user ? { level: res.data.user.member_level } : currentUser.member;
    currentUser.distributor = res.data.distributor;
    localStorage.setItem("gk_user", JSON.stringify(currentUser));
  }
  alert(res.msg);
  updateUserArea();
}

async function openDistModal() {
  if (!currentUser) return;
  
  const [infoRes, ordersRes] = await Promise.all([
    fetch(`${apiPrefix}/distributor/info`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({userId:currentUser.id}) }).then(r=>r.json()),
    fetch(`${apiPrefix}/distributor/orders?userId=${currentUser.id}`).then(r=>r.json())
  ]);
  
  if (infoRes.code !== 0) return alert(infoRes.msg);
  
  const data = infoRes.data;
  document.getElementById("distStatus").textContent = data.status === 1 ? "已通过" : (data.status === 0 ? "审核中" : "已拒绝");
  document.getElementById("distCode").textContent = data.invite_code || "-";
  document.getElementById("distRate").textContent = (data.commission_rate * 100) + "%";
  document.getElementById("distTotal").textContent = "¥" + data.total_commission.toFixed(2);
  document.getElementById("distAvailable").textContent = "¥" + data.available_commission.toFixed(2);
  document.getElementById("distReferral").textContent = data.referralCount || 0;
  
  const inviteLink = data.invite_code ? `${location.origin}/?invite=${data.invite_code}` : "-";
  document.getElementById("distLink").textContent = inviteLink;
  document.getElementById("distLink").title = "点击复制";
  
  // 订单列表
  const ordersBody = document.getElementById("distOrders");
  if (ordersRes.data && ordersRes.data.length > 0) {
    ordersBody.innerHTML = `<div style="font-size:13px;color:#718096;padding:8px 0">最近订单</div>` + ordersRes.data.slice(0,10).map(o => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:13px;border-bottom:1px solid #F7FAFC">
        <span style="color:#4A5568">${o.user_phone || "用户"}</span>
        <span style="color:#718096;font-size:12px">¥${o.pay_amount?.toFixed(2) || "0.00"}</span>
        <span style="color:#279E66">¥${o.commission_amount.toFixed(2)}</span>
      </div>
    `).join("");
  } else {
    ordersBody.innerHTML = `<div style="text-align:center;color:#A0AEC0;padding:12px 0;font-size:13px">暂无分销订单</div>`;
  }
  
  document.getElementById("distWithdraw").style.display = data.status === 1 && data.available_commission >= 50 ? "block" : "none";
  document.getElementById("distModal").classList.add("show");
}

function copyDistLink() {
  const text = document.getElementById("distLink").textContent;
  if (!text || text === "-") return;
  navigator.clipboard.writeText(text).then(() => alert("链接已复制，可直接分享给好友"));
}

function closeDistModal() {
  document.getElementById("distModal").classList.remove("show");
}

async function doWithdraw() {
  const amount = parseFloat(document.getElementById("withdrawAmount").value);
  
  if (!amount || amount < 50) return alert("最低提现金额为50元");
  
  const res = await fetch(`${apiPrefix}/distributor/withdraw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: currentUser.id, amount })
  }).then(r => r.json());
  
  if (res.code !== 0) return alert(res.msg);
  
  alert(res.msg);
  document.getElementById("withdrawAmount").value = "";
  openDistModal();
}

async function showMyOrders() {
  const modal = document.getElementById("ordersModal");
  const body = document.getElementById("ordersBody");
  modal.classList.add("show");
  body.innerHTML = "<p style='text-align:center;color:#A0AEC0'>加载中...</p>";

  const res = await fetch(`${apiPrefix}/myorders?userId=${currentUser.id}`).then(r => r.json());
  if (res.code !== 0 || !res.data || res.data.length === 0) {
    body.innerHTML = "<p style='text-align:center;color:#A0AEC0;padding:40px 0'>暂无订单</p>";
    return;
  }

  body.innerHTML = res.data.map(o => `
    <div class="order-row" onclick="showOrder('${o.trade_id}')" style="cursor:pointer;padding:12px;border-bottom:1px solid #E2E8F0;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-weight:600;font-size:14px">${o.goods_title || "商品"}</div>
        <div style="font-size:12px;color:#718096;margin-top:4px">¥${o.pay_amount.toFixed(2)}</div>
        <div style="font-size:11px;color:#A0AEC0;margin-top:2px">${o.create_at}</div>
      </div>
      <span style="font-size:13px;padding:2px 10px;border-radius:10px;${o.status===1?'background:#C6F6D5;color:#22543D':'background:#FEEBC8;color:#744210'}">${o.status===1?'已支付':'未支付'}</span>
    </div>
  `).join("");
}

function closeOrdersModal() {
  document.getElementById("ordersModal").classList.remove("show");
}

async function showOrder(tid) {
  const res = await fetch(`${apiPrefix}/order/${tid}`).then(r => r.json());
  const modal = document.getElementById("orderModal");
  const body = document.getElementById("orderBody");
  const copyBtn = document.getElementById("copyBtn");
  copyBtn.style.display = "none";

  if (!res.data) {
    body.innerHTML = "<p>❌ 未查询到该订单，请核对订单编号</p>";
  } else if (res.data.status === 0) {
    body.innerHTML = `
      <p>⏳ 订单已创建，等待付款</p>
      <p style="margin-top:8px">完成支付后刷新本页面即可自动获取资料</p>
    `;
  } else {
    currentPanLink = res.data.pan_link;
    currentPanCode = res.data.pan_code;
    body.innerHTML = `
      <p style="color:#279E66;font-weight:600">✅ 支付成功，资料已解锁</p>
      <p style="margin-top:12px"><strong>商品名称：</strong>${res.data.goods_title || "会员开通"}</p>
      <p style="margin-top:8px"><strong>支付金额：</strong>¥${res.data.pay_amount.toFixed(2)}</p>
      ${res.data.pan_link ? `<p style="margin-top:12px"><strong>网盘链接：</strong><a target="_blank" href="${currentPanLink}">${currentPanLink}</a></p>` : ""}
      ${res.data.pan_code ? `<p style="margin-top:8px"><strong>提取码：</strong>${currentPanCode}</p>` : ""}
      <p style="margin-top:12px;color:#718096;font-size:13px">请妥善保存链接与提取码，链接失效可凭订单号申请补发</p>
    `;
    if (res.data.pan_link) copyBtn.style.display = "block";
  }
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

async function manualQuery() {
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