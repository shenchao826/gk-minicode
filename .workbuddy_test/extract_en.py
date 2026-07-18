import re
import html

filepath = r"D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/bing_en.html"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

titles = re.findall(r'<h2[^>]*>\s*<a[^>]*>\s*(.*?)\s*</a>', content, re.DOTALL)
seen = set()
results = []
for t in titles:
    clean = re.sub(r'<[^>]+>', '', t).strip()
    if clean and len(clean) > 8 and clean not in seen and 'bing.com' not in clean and 'microsoft' not in clean.lower():
        seen.add(clean)
        results.append(html.unescape(clean))

print(f"Public servant exam prep results ({len(results)}):")
for i, t in enumerate(results[:15], 1):
    print(f"  {i}. {t[:200]}")
