const fs = require('fs');
const p = 'd:/Documents/Obsidian Vault/国考资料工具/gk-minicode/worker/index.js';
let c = fs.readFileSync(p, 'utf8');

const target = '        await env.DB.transaction(async tx => {\r\n          const card = await tx.prepare("SELECT id FROM card WHERE goods_id=? AND is_used=0 LIMIT 1").bind(goodsId).first();\r\n          if (!card) throw new Error("no_card");\r\n          cardId = card.id;\r\n          await tx.prepare("UPDATE card SET is_used=1 WHERE id=?").bind(card.id).run();\r\n          await tx.prepare("INSERT INTO orders (trade_id,goods_id,card_id,user_id,referrer_id,pay_amount) VALUES (?,?,?,?,?,?)")\r\n            .bind(outTradeNo, goodsId, card.id, userId, referrerId, finalPrice).run();\r\n        });\r\n      } catch (e) {\r\n        if (e.message === "no_card") return json({code:-1,msg:"\u5546\u54c1\u5e93\u5b58\u4e0d\u8db3"});\r\n        return json({code:-1,msg:"\u521b\u5efa\u8ba2\u5355\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5"});\r\n      }';

const replacement = '        const cardRow = await env.DB.prepare("SELECT id FROM card WHERE goods_id=? AND is_used=0 LIMIT 1").bind(goodsId).first();\r\n        if (!cardRow) return json({code:-1,msg:"\u5546\u54c1\u5e93\u5b58\u4e0d\u8db3"});\r\n        cardId = cardRow.id;\r\n        await env.DB.prepare("UPDATE card SET is_used=1 WHERE id=?").bind(cardRow.id).run();\r\n        await env.DB.prepare("INSERT INTO orders (trade_id,goods_id,card_id,user_id,referrer_id,pay_amount) VALUES (?,?,?,?,?,?)")\r\n          .bind(outTradeNo, goodsId, cardRow.id, userId, referrerId, finalPrice).run();\r\n      } catch (e) {\r\n        return json({code:-1,msg:"\u521b\u5efa\u8ba2\u5355\u5931\u8d25:" + e.message});\r\n      }';

const found = c.indexOf(target);
console.log('transaction found at:', found);

if (found >= 0) {
  c = c.replace(target, replacement);
  fs.writeFileSync(p, c, 'utf8');
  console.log('done - file modified');
} else {
  console.log('target not found');
  // Show what's around the DB.transaction text
  const idx = c.indexOf('DB.transaction');
  if (idx >= 0) {
    console.log('context:', JSON.stringify(c.substring(idx, idx + 400)));
  } else {
    console.log('DB.transaction also not found');
  }
}
