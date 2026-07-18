import re, html

with open(r"D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/bing_xcsheet.html", "r", encoding="utf-8") as f:
    content = f.read()

parts = content.split('class="b_algo"')
keywords = ['舍弃', '行测', '策略', '放弃', '时间', '做题顺序', '优先', '技巧', '经验', '上岸']

results = []
for i, part in enumerate(parts[1:], 1):
    end_idx = part.find("</li>")
    if end_idx < 0:
        end_idx = part.find("<div")
    block = part[:end_idx] if end_idx > 0 else part
    
    all_links = re.findall(r'<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', block, re.DOTALL)
    all_descs = re.findall(r'<p[^>]*>(.*?)</p>', block, re.DOTALL)
    
    combined = ""
    for url, raw in all_links:
        combined += " " + re.sub(r'<[^>]+>', '', raw).strip()
    for d in all_descs:
        combined += " " + re.sub(r'<[^>]+>', '', d).strip()
    
    kw_count = sum(1 for kw in keywords if kw in combined)
    if kw_count >= 2:
        results.append((kw_count, i, all_links, all_descs, combined))

print(f"Relevant results ({len(results)}):")
for score, num, links, descs, combined in sorted(results, key=lambda x: -x[0])[:15]:
    print(f"\n--- #{num} (matched {score} keywords) ---")
    for url, raw in links:
        title_clean = re.sub(r'<[^>]+>', '', raw).strip()
        if title_clean and len(title_clean) > 5:
            print(f"  TITLE: {html.unescape(title_clean[:200])}")
            print(f"  URL: {url[:150]}")
    for d in descs:
        desc_clean = re.sub(r'<[^>]+>', '', d).strip()
        if desc_clean:
            print(f"  DESC: {html.unescape(desc_clean[:300])}")
