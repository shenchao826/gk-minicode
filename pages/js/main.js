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

const apiPrefix = "https://gk-api.13365616616.workers.dev/api";

async function buy(goodsId) {
  if (!currentUser) {
    openLoginModal();
    return;
  }
  try {
    const res = await fetch(`${apiPrefix}/createorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goodsId, userId: currentUser.id })
    }).then(r => r.json());
    if (res.code !== 0) return alert(res.msg);
    tradeNo = res.data.tradeNo;
    window.location.href = res.data.payUrl;
  } catch(e) {
    alert("创建订单失败：" + e.message);
  }
}

async function buyMember(level) {
  if (!currentUser) {
    openLoginModal();
    return;
  }
  try {
    const res = await fetch(`${apiPrefix}/member/buy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id, level })
    }).then(r => r.json());
    if (res.code !== 0) return alert(res.msg);
    tradeNo = res.data.tradeNo;
    window.location.href = res.data.payUrl;
  } catch(e) {
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