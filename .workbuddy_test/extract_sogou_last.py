import re, html

with open(r'D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/sogou_last_article.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Sogou structure: find all links inside results area
# First find the main results container
results_idx = content.find('class="results"')
if results_idx >= 0:
    results_section = content[results_idx:results_idx+300000]
else:
    results_section = content[:300000]

# Extract all link-title pairs
links = re.findall(r'<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', results_section, re.DOTALL)
interesting = []
for url, text in links:
    clean = re.sub(r'<[^>]+>', '', text).strip()
    if clean and len(clean) > 10 and 'sogou' not in url.lower() and 'javascript' not in url.lower() and 'img' not in url.lower():
        interesting.append((clean, url[:200]))

seen = set()
found = 0
for title, url in interesting:
    if title not in seen and any(kw in title for kw in ['国考', '公考', '行测', '申论', '舍弃', '上岸']):
        seen.add(title)
        print(f'{found+1}. {html.unescape(title[:200])}')
        found += 1
        if found >= 20:
            break

if found == 0:
    print('(No relevant results found in Sogou links)')
    # Show all interesting titles
    for i, (t, u) in enumerate(interesting[:10], 1):
        clean = re.sub(r'<[^>]+>', '', t).strip()
        if clean and len(clean) > 10:
            print(f'{i}. {html.unescape(clean[:150])}')
