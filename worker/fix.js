const fs = require('fs');
const p = 'd:/Documents/Obsidian Vault/国考资料工具/gk-minicode/worker/index.js';
let c = fs.readFileSync(p, 'utf8');

const target = `      return json({code:0});
    }

    if (path === "/api/admin/goods" && request.method === "PUT") {`;

const replacement = `      return json({code:0});
    }

    // 初始化测试卡密（无需token，仅用于测试）
    if (path === "/api/init-test-cards") {
      const count = await env.DB.prepare("SELECT COUNT(*) as c FROM card").first();
      if (count && count.c > 0) {
        return json({code:0,msg:"卡密数据已存在，无需重复初始化"});
      }
      await initTestCards(env);
      return json({code:0,msg:"测试卡密初始化成功"});
    }

    if (path === "/api/admin/goods" && request.method === "PUT") {`;

c = c.replace(target, replacement);
fs.writeFileSync(p, c, 'utf8');
console.log('ok');
