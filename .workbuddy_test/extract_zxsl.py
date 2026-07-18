import re
import html

filepath = r"D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/bing_zxsl2.html"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Try extracting both titles and descriptions
titles = re.findall(r'<h2[^>]*>\s*<a[^>]*>\s*(.*?)\s*</a>', content, re.DOTALL)
descs = re.findall(r'<p[^>]*class="algo-description[^"]*"[^>]*>(.*?)</p>', content, re.DOTALL)

seen = set()
results = []
for t in titles:
    clean = re.sub(r'<[^>]+>', '', t).strip()
    if clean and len(clean) > 5 and clean not in seen:
        seen.add(clean)
        results.append(('title', html.unescape(clean)))

for d in descs:
    clean = re.sub(r'<[^>]+>', '', d).strip()
    if clean and len(clean) > 10:
        clean_clean = re.sub(r'\s+', ' ', clean)
        if clean_clean not in seen:
            seen.add(clean_clean)
            results.append(('desc', html.unescape(clean_clean[:250])))

print(f"行测申论备考搜索结果 ({len(results)} items):")
for i, (kind, t) in enumerate(results[:20], 1):
    print(f"  [{kind}] {i}. {t[:200]}")
