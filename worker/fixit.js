const fs = require('fs');
const p = 'd:/Documents/Obsidian Vault/国考资料工具/gk-minicode/worker/index.js';
let c = fs.readFileSync(p, 'utf8');

const target = '      return json({code:0});\r\n    }\r\n\r\n    if (path === "/api/admin/goods" && request.method === "PUT") {';

const replacement = '      return json({code:0});\r\n    }\r\n\r\n    // init test cards\r\n    if (path === "/api/init-test-cards") {\r\n      const count = await env.DB.prepare("SELECT COUNT(*) as c FROM card").first();\r\n      if (count && count.c > 0) {\r\n        return json({code:0,msg:"card data exists"});\r\n      }\r\n      await initTestCards(env);\r\n      return json({code:0,msg:"test cards initialized"});\r\n    }\r\n\r\n    if (path === "/api/admin/goods" && request.method === "PUT") {';

const found = c.indexOf(target);
console.log('found at:', found);

if (found >= 0) {
  c = c.replace(target, replacement);
  fs.writeFileSync(p, c, 'utf8');
  console.log('done - file modified');
} else {
  console.log('target not found in file');
  // Debug: show context around first occurrence of "return json"
  const idx = c.indexOf('return json({code:0})');
  if (idx >= 0) {
    console.log('context:', JSON.stringify(c.substring(idx, idx + 200)));
  }
}
