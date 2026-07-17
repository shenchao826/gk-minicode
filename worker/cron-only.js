export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(generateMonthlyUpdate(env));
  }
};

async function generateMonthlyUpdate(env) {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = prevMonth.getFullYear();
  const month = String(prevMonth.getMonth() + 1).padStart(2, '0');
  const monthKey = `${year}-${month}`;

  const exist = await env.DB.prepare("SELECT id FROM monthly_updates WHERE month=?").bind(monthKey).first();
  if (exist) {
    console.log(`月度时政 ${monthKey} 已存在，跳过`);
    return;
  }

  if (!env.DEEPSEEK_API_KEY) {
    console.error("未配置 DEEPSEEK_API_KEY，无法生成月度时政");
    return;
  }

  const systemPrompt = `你是一名公考时政资料编辑，负责整理公务员考试时政热点。

【红线规则 - 必须严格遵守】
1. 只整理公开新闻报道和官方发布的内容，绝不编造任何政策、数据、会议
2. 不涉及敏感政治话题评论，不议论政策导向
3. 禁用词汇：押题、真题、绝密、内部、命中、预测、泄漏
4. 保持客观中立，只陈述事实，不做主观评价
5. 不评论领导人个人，只整理政策要点和工作部署
6. 只整理公考可考的知识点，剔除娱乐、体育等无关新闻
7. 内容来源限定：人民日报、新华社、央视新闻、政府官网公开信息
8. 涉及法律法规只引用正式发布内容，不解读立法意图
9. 涉及经济数据只引用国家统计局等官方发布，不添加分析预测

【输出格式】
输出纯HTML（不含html/body标签），结构如下：
<div class="monthly-section"><h2>一、重要会议与政策</h2>
  <div class="topic"><h3>考点标题</h3><p class="topic-content">核心内容</p><p class="exam-tip">🔥 考试角度：考查方向提示</p></div>
</div>
板块包含：重要会议与政策、科技与经济成就、民生与社会热点、新法新规、国际要闻
每个板块至少2个考点，总共15-20个考点。`;

  const userPrompt = `请整理${year}年${month}月的时政高频考点汇总。
要求：
1. 每个考点包含标题、核心内容、考试角度提示
2. 内容精炼，适合公考备考速记
3. 总字数3000-5000字
4. 直接输出HTML，不要markdown标记
5. 如该月无重大时政，可适当补充近期持续性热点`;

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 8000
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`DeepSeek API 错误: ${response.status}`, errText);
    return;
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || '';

  if (!content) {
    console.error("DeepSeek 返回空内容");
    return;
  }

  const bannedWords = ['押题', '真题', '绝密', '内部', '命中', '预测', '泄漏'];
  let safeContent = content;
  for (const word of bannedWords) {
    safeContent = safeContent.replace(new RegExp(word, 'g'), '★');
  }

  const title = `${year}年${month}月时政高频考点汇总`;

  await env.DB.prepare("INSERT INTO monthly_updates (month,title,content) VALUES (?,?,?)")
    .bind(monthKey, title, safeContent).run();

  console.log(`月度时政 ${monthKey} 生成成功`);
}