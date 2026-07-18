const fs = require('fs');
const p = 'd:/Documents/Obsidian Vault/国考资料工具/gk-minicode/pages/js/main.js';
let c = fs.readFileSync(p, 'utf8');

const oldText = '      payBody.innerHTML = `\n        <p style="font-size:16px;font-weight:600;margin-bottom:16px">微信扫码支付</p>\n        <p><strong>商品名称：</strong>${goods.title}</p>\n        <p style="margin-top:8px"><strong>支付金额：</strong><span style="color:#E53E3E;font-size:18px;font-weight:600">¥${res.data.finalPrice.toFixed(2)}</span></p>\n        <p style="margin-top:8px"><strong>订单号：</strong>${tradeNo}</p>\n        <div style="margin-top:16px;text-align:center">\n          <img src="${res.data.qrcodeUrl || res.data.payUrl}" alt="支付二维码" style="max-width:280px;width:100%;border-radius:8px" />\n          <p style="margin-top:8px;color:#718096;font-size:13px">请使用微信扫码支付</p>\n        </div>\n      `;\n    \n    let paid = false;\n    \n    payConfirmBtn.onclick = () => {\n      if (paid) {\n        payModal.classList.remove("show");\n        return;\n      }\n      alert("请扫码完成支付后点击确认");\n    };\n    \n    payModal.classList.add("show");';

const newText = '      payBody.innerHTML = `\n        <p style="font-size:16px;font-weight:600;margin-bottom:16px">微信扫码支付</p>\n        <p><strong>商品名称：</strong>${goods.title}</p>\n        <p style="margin-top:8px"><strong>支付金额：</strong><span style="color:#E53E3E;font-size:18px;font-weight:600">¥${res.data.finalPrice.toFixed(2)}</span></p>\n        <p style="margin-top:8px"><strong>订单号：</strong>${tradeNo}</p>\n        <div style="margin-top:16px;text-align:center">\n          <img src="${res.data.qrcodeUrl || \'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=\' + encodeURIComponent(res.data.payUrl)}" alt="支付二维码" style="max-width:280px;width:100%;border-radius:8px" />\n          <p style="margin-top:8px;color:#718096;font-size:13px">请使用微信扫码支付</p>\n          <p style="margin-top:6px;color:#E53E3E;font-size:13px">支付完成后点击确认按钮</p>\n          <a href="${res.data.payUrl}" target="_blank" style="display:inline-block;margin-top:12px;padding:10px 24px;background:#07C160;color:#fff;border-radius:6px;text-decoration:none;font-size:15px">点此打开支付页面</a>\n        </div>\n      `;\n    \n    let paid = false;\n    \n    payConfirmBtn.onclick = () => {\n      if (paid) {\n        payModal.classList.remove("show");\n        return;\n      }\n      alert("请完成支付后点击确认");\n    };\n    \n    payModal.classList.add("show");\n    \n    // 在新窗口打开支付页面\n    window.open(res.data.payUrl, \'_blank\');';

const found = c.indexOf(oldText);
console.log('found at:', found);

if (found >= 0) {
  c = c.replace(oldText, newText);
  fs.writeFileSync(p, c, 'utf8');
  console.log('done - file modified');
} else {
  console.log('target not found');
}
