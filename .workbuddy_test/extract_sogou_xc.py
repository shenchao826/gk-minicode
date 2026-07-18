import re, html

with open(r'D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/sogou_xc.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Sogou uses specific class names for titles
titles = re.findall(r'class="tit[^"]*"[^>]*>(.*?)</a>', content, re.DOTALL)
descriptions = re.findall(r'class="txt-info[^"]*"[^>]*>(.*?)</div>', content, re.DOTALL)

seen = set()
for i, title_tag in enumerate(titles):
    clean = re.sub(r'<[^>]+>', '', title_tag).strip()
    if clean and len(clean) > 8 and 'sogou' not in clean.lower() and clean not in seen:
        seen.add(clean)
        desc = ''
        if i < len(descriptions):
            desc = re.sub(r'<[^>]+>', '', descriptions[i]).strip()[:300]
        print(f'TITLE: {html.unescape(clean)[:200]}')
        if desc:
            print(f'DESC: {html.unescape(desc)[:300]}')
        print('---')
        if len(seen) >= 15:
            break
