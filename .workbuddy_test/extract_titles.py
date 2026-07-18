import re
import html

filepath = r"D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/bing_results.html"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Bing search result patterns
# Pattern 1: <h2><a class="..." href="...">Title</a></h2>
titles = re.findall(r'<h2[^>]*>\s*<a[^>]*>\s*(.*?)\s*</a>', content, re.DOTALL)
# Pattern 2: <a class="results_link" href="...">Title</a>
if not titles:
    titles = re.findall(r'class="results_link"[^>]*>\s*(.*?)\s*</a>', content, re.DOTALL)
# Pattern 3: generic h2 > a
if not titles:
    titles = re.findall(r'<h2[^>]*>.*?<a[^>]*>(.*?)</a>', content, re.DOTALL)

titles = [re.sub(r'<[^>]+>', '', t).strip() for t in titles]
titles = [t for t in titles if len(t) > 8 and not t.startswith('http')]
seen = set()
unique = []
for t in titles:
    if t not in seen:
        seen.add(t)
        unique.append(t)

print(f"Found {len(unique)} unique titles:")
for i, t in enumerate(unique[:20], 1):
    print(f"  {i}. {html.unescape(t[:150])}")
