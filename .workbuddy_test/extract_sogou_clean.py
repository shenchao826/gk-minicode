import re, html

with open(r'D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/sogou_xc.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Get all content blocks
blocks = re.findall(r'>([^<]{30,500})</a>', content)
interesting = [b for b in blocks if any(kw in b for kw in ['行测', '公考', '舍弃', '上岸', '备考', '公务员', '国考', '申论', '分数'])]
print(f'Interesting long blocks: {len(interesting)}')
for i, b in enumerate(interesting[:20]):
    print(f'{i+1}. {html.unescape(b[:200])}')

# Also extract description paragraphs  
descs = re.findall(r'(?:txt-info|desc|abstract)[^>]*>([^<]+)', content, re.IGNORECASE)
for d in descs[:10]:
    clean = d.strip()
    if len(clean) > 20 and any(kw in clean for kw in ['行测', '公考', '舍弃', '上岸', '备考']):
        print(f'  DESC: {html.unescape(clean[:200])}')
