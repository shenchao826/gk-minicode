let tradeNo = "";
let currentPanLink = "";
let currentPanCode = "";
let allGoods = [];
let currentCategory = "all";
let currentUser = null;
let payInterval = null;

function closePayModal() {
  document.getElementById('payModal').classList.remove('show');
  if (payInterval) { clearInterval(payInterval); payInterval = null; }
}

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

const apiPrefix = "/api"; // ponytail: use same-domain Pages Functions

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
    const res = await fetch(`${apiPrefix}/createorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goodsId, userId: currentUser.id, referrerId: currentUser.referrer_id || 0 })
    }).then(r => r.json());
    
    loadingModal.classList.remove("show");
    
    if (res.code !== 0) return alert(res.msg);
    
    tradeNo = res.data.tradeNo;
    
    const payModal = document.getElementById("payModal");
    const payBody = document.getElementById("payBody");
    const payConfirmBtn = document.getElementById("payConfirmBtn");
    
    payBody.innerHTML = `
        <p style="font-size:16px;font-weight:600;margin-bottom:16px">微信扫码支付</p>
        <p><strong>商品名称：</strong>${goods.title}</p>
        <p style="margin-top:8px"><strong>支付金额：</strong><span style="color:#E53E3E;font-size:18px;font-weight:600">¥${res.data.finalPrice.toFixed(2)}</span></p>
        <p style="margin-top:8px"><strong>订单号：</strong>${tradeNo}</p>
        <div style="margin-top:16px;text-align:center">
          <img src="${res.data.qrcodeUrl || 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=' + encodeURIComponent(res.data.payUrl)}" alt="支付二维码" style="max-width:280px;width:100%;border-radius:8px" />
          <p style="margin-top:8px;color:#718096;font-size:13px">请使用微信扫码支付</p>
        </div>
      `;
    
    let paid = false;
    
    payModal.classList.add("show");
    
    const checkPay = async (forceVerify) => {
      try {
        const orderRes = await fetch(`${apiPrefix}/order/${tradeNo}`).then(r => r.json());
        if (orderRes.code === 0 && orderRes.data && orderRes.data.status === 1) {
          return showPaySuccess(orderRes.data, goods);
        }
        // 本地未支付时，主动向虎皮椒查询
        if (forceVerify) {
          const verifyRes = await fetch(`${apiPrefix}/verify-payment`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({tradeNo})
          }).then(r=>r.json());
          if (verifyRes.code === 0 && verifyRes.data && verifyRes.data.paid) {
            return showPaySuccess(verifyRes.data.order, goods);
          }
        }
      } catch(e) {}
      return false;
    };
    
    function showPaySuccess(order, goods) {
      paid = true;
      payModal.classList.remove("show");
      currentPanLink = order.pan_link || "https://pan.baidu.com/s/1234567890abcdef";
      currentPanCode = order.pan_code || "gk" + goodsId;
      const m = document.getElementById("orderModal");
      const b = document.getElementById("orderBody");
      const c = document.getElementById("copyBtn");
      b.innerHTML = `
        <p style="color:#279E66;font-weight:600">✅ 支付成功，资料已解锁</p>
        <p style="margin-top:12px"><strong>商品名称：</strong>${goods.title}</p>
        <p style="margin-top:8px"><strong>支付金额：</strong>¥${Number(order.pay_amount).toFixed(2)}</p>
        <p style="margin-top:12px"><strong>网盘链接：</strong><a target="_blank" href="${currentPanLink}">${currentPanLink}</a></p>
        <p style="margin-top:8px"><strong>提取码：</strong>${currentPanCode}</p>
        <p style="margin-top:12px;color:#718096;font-size:13px">请妥善保存链接与提取码，链接失效可凭订单号申请补发</p>
      `;
      c.style.display = "block";
      m.classList.add("show");
      return true;
    }
    
    payConfirmBtn.onclick = async () => {
      if (paid) { payModal.classList.remove("show"); return; }
      const ok = await checkPay(true);
      if (!ok) alert("暂未检测到支付，请确认已扫码完成支付");
    };
    
    payInterval = setInterval(async () => {
      const success = await checkPay();
      if (success) { clearInterval(payInterval); payInterval = null; }
    }, 3000);
    
    setTimeout(() => { if (payInterval) { clearInterval(payInterval); payInterval = null; } }, 120000);
    
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
    const res = await fetch(`${apiPrefix}/member/buy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id, level, referrerId: currentUser.referrer_id || 0 })
    }).then(r => r.json());
    
    loadingModal.classList.remove("show");
    
    if (res.code !== 0) return alert(res.msg);
    
    tradeNo = res.data.tradeNo;
    
    const payModal = document.getElementById("payModal");
    const payBody = document.getElementById("payBody");
    const payConfirmBtn = document.getElementById("payConfirmBtn");
    
    payBody.innerHTML = `
      <p style="font-size:16px;font-weight:600;margin-bottom:16px">微信扫码支付</p>
      <p><strong>会员等级：</strong>${config.name}</p>
      <p style="margin-top:8px"><strong>支付金额：</strong><span style="color:#E53E3E;font-size:18px;font-weight:600">¥${res.data.price}</span></p>
      <p style="margin-top:8px"><strong>有效期：</strong>${config.duration_days}天</p>
      <p style="margin-top:8px"><strong>订单号：</strong>${tradeNo}</p>
      <div style="margin-top:16px;text-align:center">
        <img src="${res.data.payUrl}" alt="支付二维码" style="max-width:280px;width:100%;border-radius:8px" />
        <p style="margin-top:8px;color:#718096;font-size:13px">请使用微信扫码支付</p>
      </div>
    `;
    
    let paid = false;
    
    payModal.classList.add("show");
    
    const checkPay = async (forceVerify) => {
      try {
        const orderRes = await fetch(`${apiPrefix}/order/${tradeNo}`).then(r => r.json());
        if (orderRes.code === 0 && orderRes.data && orderRes.data.status === 1) {
          return showMemberSuccess(orderRes.data);
        }
        if (forceVerify) {
          const verifyRes = await fetch(`${apiPrefix}/verify-payment`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({tradeNo})
          }).then(r=>r.json());
          if (verifyRes.code === 0 && verifyRes.data && verifyRes.data.paid) {
            return showMemberSuccess(verifyRes.data.order);
          }
        }
      } catch(e) {}
      return false;
    };
    
    function showMemberSuccess(order) {
      paid = true;
      payModal.classList.remove("show");
      currentUser.member = { level: level };
      localStorage.setItem("gk_user", JSON.stringify(currentUser));
      updateUserArea();
      const m = document.getElementById("orderModal");
      const b = document.getElementById("orderBody");
      const c = document.getElementById("copyBtn");
      b.innerHTML = `
        <p style="color:#279E66;font-weight:600">✅ 支付成功，会员已开通</p>
        <p style="margin-top:12px"><strong>会员等级：</strong>${config.name}</p>
        <p style="margin-top:8px"><strong>支付金额：</strong>¥${res.data.price}</p>
        <p style="margin-top:8px"><strong>有效期：</strong>${config.duration_days}天</p>
        <p style="margin-top:12px;color:#718096;font-size:13px">您已成功开通${config.name}，可享受全场优惠</p>
      `;
      c.style.display = "none";
      m.classList.add("show");
      return true;
    }
    
    payConfirmBtn.onclick = async () => {
      if (paid) { payModal.classList.remove("show"); return; }
      const ok = await checkPay(true);
      if (!ok) alert("暂未检测到支付，请确认已扫码完成支付");
    };
    
    payInterval = setInterval(async () => {
      const success = await checkPay();
      if (success) { clearInterval(payInterval); payInterval = null; }
    }, 3000);
    
    setTimeout(() => { if (payInterval) { clearInterval(payInterval); payInterval = null; } }, 120000);
    
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
    
    // 检查分销员状态
    fetch(`${apiPrefix}/distributor/info?userId=${currentUser.id}`).then(r => r.json()).then(res => {
      if (res.code === 0) {
        applyBtn.style.display = "none";
        viewBtn.style.display = "inline-block";
        loginBtn.style.display = "none";
      } else {
        applyBtn.style.display = "inline-block";
        viewBtn.style.display = "none";
        loginBtn.style.display = "none";
      }
    }).catch(() => {
      applyBtn.style.display = "inline-block";
      viewBtn.style.display = "none";
      loginBtn.style.display = "none";
    });
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

  const loadingModal = document.getElementById("loadingModal");
  const loadingText = document.getElementById("loadingText");
  loadingText.textContent = "正在登录...";
  loadingModal.classList.add("show");

  fetch(`${apiPrefix}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password })
  }).then(r => r.json()).then(res => {
    loadingModal.classList.remove("show");
    if (res.code === 0) {
      currentUser = res.data;
      localStorage.setItem("gk_user", JSON.stringify(currentUser));
      updateUserArea();
      closeLoginModal();
      alert("登录成功");
    } else {
      alert(res.msg);
    }
  }).catch(e => {
    loadingModal.classList.remove("show");
    alert("登录失败：" + e.message);
  });
}

function doRegister() {
  const phone = document.getElementById("regPhone").value;
  const password = document.getElementById("regPassword").value;
  const nickname = document.getElementById("regNickname").value;
  const inviteCode = document.getElementById("regInviteCode").value.trim();

  if (!phone || !password) return alert("请填写手机号和密码");
  if (!isValidPhone(phone)) return alert("请输入正确的手机号");
  if (password.length < 6) return alert("密码长度不能少于6位");

  const loadingModal = document.getElementById("loadingModal");
  const loadingText = document.getElementById("loadingText");
  loadingText.textContent = "正在注册...";
  loadingModal.classList.add("show");

  let referrerId = 0;
  if (inviteCode) {
    // 先验证邀请码
    fetch(`${apiPrefix}/referrer/check?code=${encodeURIComponent(inviteCode)}`).then(r => r.json()).then(res => {
      if (res.code === 0) {
        referrerId = res.data.userId;
        submitRegister(phone, password, nickname, referrerId);
      } else {
        loadingModal.classList.remove("show");
        alert("邀请码无效或分销员状态异常");
      }
    }).catch(() => {
      loadingModal.classList.remove("show");
      alert("验证邀请码失败");
    });
  } else {
    submitRegister(phone, password, nickname, 0);
  }
}

function submitRegister(phone, password, nickname, referrerId) {
  fetch(`${apiPrefix}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password, nickname, referrerId })
  }).then(r => r.json()).then(res => {
    loadingModal.classList.remove("show");
    if (res.code === 0) {
      alert("注册成功，请登录");
      switchLoginTab("login");
    } else {
      alert(res.msg);
    }
  }).catch(e => {
    loadingModal.classList.remove("show");
    alert("注册失败：" + e.message);
  });
}

function doResetPwd() {
  const phone = document.getElementById("resetPhone").value;
  const newPassword = document.getElementById("resetPassword").value;

  if (!phone || !newPassword) return alert("请填写手机号和新密码");
  if (!isValidPhone(phone)) return alert("请输入正确的手机号");
  if (newPassword.length < 6) return alert("密码长度不能少于6位");

  const loadingModal = document.getElementById("loadingModal");
  const loadingText = document.getElementById("loadingText");
  loadingText.textContent = "正在重置密码...";
  loadingModal.classList.add("show");

  fetch(`${apiPrefix}/reset-pwd`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, newPassword })
  }).then(r => r.json()).then(res => {
    loadingModal.classList.remove("show");
    if (res.code === 0) {
      alert("密码重置成功，请登录");
      switchLoginTab("login");
    } else {
      alert(res.msg);
    }
  }).catch(e => {
    loadingModal.classList.remove("show");
    alert("重置失败：" + e.message);
  });
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
  const loadingModal = document.getElementById("loadingModal");
  const loadingText = document.getElementById("loadingText");
  loadingText.textContent = "正在申请分销员...";
  loadingModal.classList.add("show");

  fetch(`${apiPrefix}/distributor/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: currentUser.id })
  }).then(r => r.json()).then(res => {
    loadingModal.classList.remove("show");
    if (res.code === 0) {
      alert("申请成功！您已成为分销员");
      updateUserArea();
      openDistModal();
    } else {
      alert(res.msg);
    }
  }).catch(e => {
    loadingModal.classList.remove("show");
    alert("申请失败：" + e.message);
  });
}

function openDistModal() {
  if (!currentUser) {
    openLoginModal();
    return;
  }
  const modal = document.getElementById("distModal");
  const infoDiv = document.getElementById("distInfo");
  const ordersDiv = document.getElementById("distOrders");
  const withdrawDiv = document.getElementById("distWithdraw");
  
  infoDiv.innerHTML = "<p style='text-align:center;color:#A0AEC0'>加载中...</p>";
  ordersDiv.innerHTML = "";
  withdrawDiv.style.display = "none";
  modal.classList.add("show");

  fetch(`${apiPrefix}/distributor/info?userId=${currentUser.id}`).then(r => r.json()).then(res => {
    if (res.code !== 0) {
      infoDiv.innerHTML = `<p style='text-align:center;color:#E53E3E'>${res.msg}</p>`;
      document.getElementById("applyDistBtn").style.display = "inline-block";
      document.getElementById("viewDistBtn").style.display = "none";
      return;
    }
    const d = res.data;
    const siteDomain = location.origin;
    const shareLink = `${siteDomain}/?invite=${d.invite_code}`;
    
    infoDiv.innerHTML = `
      <div class="dist-row"><span>分销状态：</span><span id="distStatus">${d.status === 1 ? '✅ 已通过' : (d.status === 0 ? '⏳ 审核中' : '❌ 已拒绝')}</span></div>
      <div class="dist-row"><span>专属邀请码：</span><span id="distCode">${d.invite_code}</span></div>
      <div class="dist-row"><span>佣金比例：</span><span id="distRate">${(d.commission_rate * 100).toFixed(0)}%</span></div>
      <div class="dist-row"><span>累计佣金：</span><span id="distTotal">¥${d.total_commission.toFixed(2)}</span></div>
      <div class="dist-row"><span>可提现余额：</span><span id="distAvailable">¥${d.available_commission.toFixed(2)}</span></div>
      <div class="dist-row"><span>邀请人数：</span><span id="distReferral">${d.referralCount}</span></div>
      <div class="dist-row"><span>专属分享链接：</span><span id="distLink" style="font-size:12px;word-break:break-all;cursor:pointer;color:#163D8C" onclick="copyDistLink('${shareLink}')">${shareLink}</span></div>
    `;
    
    if (d.recentOrders && d.recentOrders.length > 0) {
      ordersDiv.style.display = "block";
      ordersDiv.innerHTML = d.recentOrders.map(o => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid #EDF2F0">
          <div style="flex:1">
            <div style="font-weight:600;font-size:13px">${o.goods_title || '资料'}</div>
            <div style="font-size:11px;color:#718096;margin-top:2px">订单：${o.order_id}</div>
            <div style="font-size:11px;color:#718096">用户：${o.user_phone || '-'}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:13px;color:#279E66">¥${o.commission_amount.toFixed(2)}</div>
            <div style="font-size:11px;color:#718096">${o.status === 1 ? '已结算' : '待结算'}</div>
          </div>
        </div>
      `).join("");
    } else {
      ordersDiv.style.display = "none";
    }
    
    if (d.available_commission >= 50) {
      withdrawDiv.style.display = "block";
    }
  }).catch(e => {
    infoDiv.innerHTML = `<p style='text-align:center;color:#E53E3E'>加载失败：${e.message}</p>`;
  });
}

function closeDistModal() {
  document.getElementById("distModal").classList.remove("show");
}

function copyDistLink(link) {
  navigator.clipboard.writeText(link).then(() => {
    alert("分享链接已复制到剪贴板");
  }).catch(() => {
    alert("复制失败，请手动复制");
  });
}

function doWithdraw() {
  if (!currentUser) {
    openLoginModal();
    return;
  }
  const amount = document.getElementById("withdrawAmount").value;
  if (!amount || Number(amount) < 50) {
    return alert("请输入至少50元的提现金额");
  }
  
  const loadingModal = document.getElementById("loadingModal");
  const loadingText = document.getElementById("loadingText");
  loadingText.textContent = "正在提交提现申请...";
  loadingModal.classList.add("show");
  
  fetch(`${apiPrefix}/distributor/withdraw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: currentUser.id, amount: Number(amount) })
  }).then(r => r.json()).then(res => {
    loadingModal.classList.remove("show");
    if (res.code === 0) {
      alert("提现申请已提交");
      document.getElementById("withdrawAmount").value = "";
      openDistModal(); // 刷新
    } else {
      alert(res.msg);
    }
  }).catch(e => {
    loadingModal.classList.remove("show");
    alert("提交失败：" + e.message);
  });
}

function showMyOrders() {
  const modal = document.getElementById("ordersModal");
  const body = document.getElementById("ordersBody");
  modal.classList.add("show");
  body.innerHTML = "<p style='text-align:center;color:#A0AEC0;padding:40px 0'>加载中...</p>";

  if (!currentUser) {
    body.innerHTML = "<p style='text-align:center;color:#A0AEC0;padding:40px 0'>请先登录</p>";
    return;
  }

  fetch(`${apiPrefix}/myorders?userId=${currentUser.id}`).then(r=>r.json()).then(res => {
    if (res.code !== 0 || !res.data || res.data.length === 0) {
      body.innerHTML = "<p style='text-align:center;color:#A0AEC0;padding:40px 0'>暂无订单</p>";
      return;
    }
    body.innerHTML = res.data.map(o => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid #E2E8F0">
        <div style="flex:1">
          <div style="font-weight:600;font-size:14px">${o.goods_title || '资料'}</div>
          <div style="font-size:12px;color:#718096;margin-top:4px">订单号：${o.trade_id}</div>
          <div style="font-size:12px;color:#718096">金额：¥${Number(o.pay_amount).toFixed(2)}</div>
          <div style="font-size:12px;color:#718096">${o.create_at}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:13px;${o.status === 1 ? 'color:#279E66' : 'color:#A0AEC0'}">${o.status === 1 ? '✅ 已支付' : '待支付'}</div>
          <button class="buy-btn" style="padding:4px 12px;font-size:12px;margin-top:6px" onclick="closeOrdersModal();showOrder('${o.trade_id}')">查看</button>
        </div>
      </div>
    `).join("");
  }).catch(() => {
    body.innerHTML = "<p style='text-align:center;color:#E53E3E;padding:40px 0'>加载失败，请刷新重试</p>";
  });
}

function closeOrdersModal() {
  document.getElementById("ordersModal").classList.remove("show");
}

function showOrder(tid) {
  const modal = document.getElementById("orderModal");
  const body = document.getElementById("orderBody");
  const copyBtn = document.getElementById("copyBtn");
  copyBtn.style.display = "none";

  body.innerHTML = "<p>⏳ 正在查询订单...</p>";
  modal.classList.add("show");

  fetch(`${apiPrefix}/order/${tid}`).then(r=>r.json()).then(res => {
    if (res.code !== 0 || !res.data) {
      body.innerHTML = "<p>❌ 未查询到该订单，请核对订单编号</p>";
      return;
    }
    const o = res.data;
    if (o.status !== 1) {
      body.innerHTML = `<p>❌ 订单未支付（状态：${o.status === 0 ? '待支付' : '未知'}）</p>`;
      return;
    }
    currentPanLink = o.pan_link || "";
    currentPanCode = o.pan_code || "";
    body.innerHTML = `
      <p style="color:#279E66;font-weight:600">✅ 支付成功，资料已解锁</p>
      <p style="margin-top:12px"><strong>商品名称：</strong>${o.goods_title || '资料'}</p>
      <p style="margin-top:8px"><strong>支付金额：</strong>¥${Number(o.pay_amount).toFixed(2)}</p>
      <p style="margin-top:8px"><strong>订单编号：</strong>${o.trade_id}</p>
      <p style="margin-top:12px"><strong>网盘链接：</strong><a target="_blank" href="${currentPanLink}">${currentPanLink}</a></p>
      <p style="margin-top:8px"><strong>提取码：</strong>${currentPanCode}</p>
      <p style="margin-top:12px;color:#718096;font-size:13px">请妥善保存链接与提取码，链接失效可凭订单号申请补发</p>
    `;
    if (currentPanLink) copyBtn.style.display = "block";
  }).catch(() => {
    body.innerHTML = "<p>❌ 查询失败，请检查网络后重试</p>";
  });
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
// deploy: 20260717230939
