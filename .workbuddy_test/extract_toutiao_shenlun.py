import re, html

with open(r'D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/toutiao_shenlun.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Toutiao results embedded in JSON
# Try to extract article titles and summaries
articles = re.findall(r'"title":"([^"]+)"', content)
authors = re.findall(r'"nickname":"([^"]+)"', content)
digests = re.findall(r'"digest":"([^"]*)"', content)

print(f"Found {len(articles)} articles on Toutiao:")
seen = set()
for i, title in enumerate(articles[:30]):
    digest = digests[i] if i < len(digests) else ''
    author = authors[i] if i < len(authors) else ''
    
    if title not in seen and any(kw in title for kw in ['申论', '公考', '国考', '行测', '备考', '上岸']):
        seen.add(title)
        print(f"\n  Title: {title[:200]}")
        if digest:
            print(f"  Digest: {digest[:200]}")
        if author:
            print(f"  Author: {author[:100]}")

# Also try tags
tags = re.findall(r'"tags":\[([^\]]+)\]', content)
print(f"\nTags arrays found: {len(tags)}")
for t in tags[:5]:
    print(f'  {t[:200]}')
