import re, html

with open(r"D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/recruit2026.html", "r", encoding="utf-8") as f:
    content = f.read()

parts = content.split('class="b_algo"')
print(f"Total b_algo parts: {len(parts)}")

keywords = ['国考', '报考', '报名', '竞争', '热度', '最热', '岗位', '人数', '招录', '热点']

for i, part in enumerate(parts[1:], 1):
    end_idx = part.find("</li>")
    if end_idx < 0:
        end_idx = part.find("<div")
    block = part[:end_idx] if end_idx > 0 else part
    
    all_links = re.findall(r'<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', block, re.DOTALL)
    all_descs = re.findall(r'<p[^>]*>(.*?)</p>', block, re.DOTALL)
    
    has_kw = False
    combined = ""
    for url, raw in all_links:
        combined += " " + re.sub(r'<[^>]+>', '', raw).strip()
    for d in all_descs:
        combined += " " + re.sub(r'<[^>]+>', '', d).strip()
    
    for kw in keywords:
        if kw in combined:
            has_kw = True
            break
    
    if has_kw:
        print(f"\n--- Result {i} ---")
        for url, raw in all_links:
            title_clean = re.sub(r'<[^>]+>', '', raw).strip()
            if title_clean and len(title_clean) > 5:
                print(f"  TITLE: {html.unescape(title_clean[:200])}")
                print(f"  URL: {url[:150]}")
        for d in all_descs:
            desc_clean = re.sub(r'<[^>]+>', '', d).strip()
            if desc_clean:
                print(f"  DESC: {html.unescape(desc_clean[:300])}")
