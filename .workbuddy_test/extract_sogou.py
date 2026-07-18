import re
import html

filepath = r"D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/sogou_zxsl.html"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

print(f"File size: {len(content)}")

# Sogou patterns
patterns = [
    (r'class="tit[^"]*">\s*(.*?)\s*</a>', 'tit'),
    (r'class="txtline[^"]*">\s*(.*?)\s*</a>', 'txtline'),
    (r'class="f[0-9]*[^"]*">\s*(.*?)\s*</a>', 'flex'),
    (r'<a[^>]*class="[^"]*"[^>]*href="[^"]*">(.*?)</a>', 'generic_a'),
]

all_titles = []
for pat, name in patterns:
    matches = re.findall(pat, content, re.DOTALL)
    matches = [re.sub(r'<[^>]+>', '', m).strip() for m in matches]
    matches = [m for m in matches if len(m) > 5 and 'sogou' not in m.lower()]
    all_titles.extend(matches)

seen = set()
unique = []
for t in all_titles:
    clean = html.unescape(t)
    if clean not in seen:
        seen.add(clean)
        unique.append(clean)

print(f"Total unique Sogou titles ({len(unique)}):")
for i, t in enumerate(unique[:20], 1):
    print(f"  {i}. {t[:200]}")

# Also show snippets
snippets = re.findall(r'class="txt-info[^"]*"[^>]*>(.*?)</div>', content, re.DOTALL)
if snippets:
    print(f"\nSnippets:")
    for i, s in enumerate(snippets[:5], 1):
        clean = re.sub(r'<[^>]+>', '', s).strip()
        print(f"  {i}. {html.unescape(clean[:300])}")
