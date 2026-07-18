import re
import html

filepath = r"D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/sogou_sheet3.html"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Sogou result patterns
links = re.findall(r'class="tit[^"]*">\s*(.*?)\s*</a>', content, re.DOTALL)
descriptions = re.findall(r'class="txt-info[^"]*">\s*(.*?)\s*</div>', content, re.DOTALL)

results = []
for i, l in enumerate(links):
    clean = re.sub(r'<[^>]+>', '', l).strip()
    desc = ''
    if i < len(descriptions):
        desc = re.sub(r'<[^>]+>', '', descriptions[i]).strip()[:400]
    if clean and len(clean) > 5 and '搜狗' not in clean and 'sogou' not in l.lower():
        results.append((html.unescape(clean), html.unescape(desc)))

print(f"Sogou 公考行测舍弃 results ({len(results)}):")
for i, (title, desc) in enumerate(results[:20], 1):
    print(f"\n  {i}. {title}")
    if desc:
        print(f"     {desc[:300]}")
