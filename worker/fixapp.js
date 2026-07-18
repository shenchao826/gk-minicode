const fs = require('fs');
const p = 'd:/Documents/Obsidian Vault/国考资料工具/gk-minicode/pages/js/main.js';
let c = fs.readFileSync(p, 'utf8');
const t = '\u8bf7\u626b\u7801\u5b8c\u6210\u652f\u4ed8\u540e\u70b9\u51fb\u786e\u8ba4';
const r = '\u8bf7\u5b8c\u6210\u652f\u4ed8\u540e\u70b9\u51fb\u786e\u8ba4';
if (c.includes(t)) {
  c = c.replace(t, r);
  fs.writeFileSync(p, c, 'utf8');
  console.log('updated');
} else {
  console.log('not found');
}
// Also add window.open after payModal.classList.add("show")
const w = 'payModal.classList.add("show");\n    \n    const checkPay';
const w2 = 'payModal.classList.add("show");\n    \n    window.open(res.data.payUrl, "_blank");\n    \n    const checkPay';
if (c.includes(w)) {
  c = c.replace(w, w2);
  fs.writeFileSync(p, c, 'utf8');
  console.log('added window.open');
} else {
  console.log('window.open anchor not found');
}
