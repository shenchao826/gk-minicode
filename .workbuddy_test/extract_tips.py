import re
import html

filepath = r"D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/bing_tips.html"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

titles = re.findall(r'<h2[^>]*>\s*<a[^>]*>\s*(.*?)\s*</a>', content, re.DOTALL)
seen = set()
results = []
descs = re.findall(r'<span[^>]*class="algo-site-description[^"]*"[^>]*>(.*?)</span>', content, re.DOTALL)

for t in titles:
    clean = re.sub(r'<[^>]+>', '', t).strip()
    if clean and len(clean) > 5 and clean not in seen:
        seen.add(clean)
        results.append(('title', html.unescape(clean)))

for d in descs:
    clean = re.sub(r'<[^>]+>', '', d).strip()
    if clean and len(clean) > 10 and clean not in seen:
        seen.add(clean)
        results.append(('desc', html.unescape(clean[:200])))

print(f"公考备考 tips 搜索结果 ({len(results)} items):")
for i, (kind, t) in enumerate(results[:30], 1):
    print(f"  [{kind}] {i}. {t[:200]}")
