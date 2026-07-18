import re, html, json

files = {
    'Zhihu 行测舍弃': r'D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/zhihu_xc.html',
    'Bing 低粉高赞': r'D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/bing_lowfan.html',
}

def extract_bingo_links(content):
    parts = content.split('class="b_algo"')
    results = []
    for part in parts[1:20]:
        end_idx = part.find('</li>')
        if end_idx < 0: end_idx = part.find('<div')
        block = part[:end_idx] if end_idx > 0 else part
        
        links = re.findall(r'<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', block, re.DOTALL)
        descs = re.findall(r'<p[^>]*>(.*?)</p>', block, re.DOTALL)
        
        for url, raw in links:
            title = re.sub(r'<[^>]+>', '', raw).strip()
            if title and len(title) > 8 and 'bing' not in title.lower():
                desc = ''
                if descs:
                    desc = re.sub(r'<[^>]+>', '', descs[-1]).strip()[:300]
                results.append({'title': html.unescape(title), 'desc': html.unescape(desc), 'url': url})
    return results

def extract_zhihu(content):
    parts = re.findall(r'"data":(\{.*?\})(?=\s*,\s*"(target_|id_|type_)",|\s*\])', content, re.DOTALL)
    results = []
    for i, part in enumerate(parts[:15]):
        try:
            data = json.loads(part.replace(':undefined', ':null'))
            title = data.get('title', '')
            excerpt = data.get('excerpt', '')
            author = data.get('author', {}).get('name', '') if isinstance(data.get('author'), dict) else ''
            voteup = data.get('voteup_count', '')
            
            if title and any(kw in title for kw in ['行测', '舍弃', '放弃', '公考', '公考', '备考']):
                results.append({
                    'title': title,
                    'excerpt': str(excerpt)[:300],
                    'author': author,
                    'votes': voteup
                })
        except:
            pass
    
    # Fallback: extract titles from HTML
    if not results:
        titles = re.findall(r'"title":"([^"]*)"', content)
        excerpts = re.findall(r'"excerpt":"([^"]*)"', content)
        authors = re.findall(r'"name":"([^"]*)"', content)
        for i, t in enumerate(titles[:20]):
            if any(kw in t for kw in ['行测', '舍弃', '放弃', '公考', '备考']):
                results.append({
                    'title': t,
                    'excerpt': excerpts[i][:300] if i < len(excerpts) else '',
                    'author': authors[i] if i < len(authors) else ''
                })
    return results

for name, path in files.items():
    print(f"\n{'='*50}")
    print(f"=== {name} ===")
    print(f"{'='*50}")
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    results = []
    if 'Zhihu' in name:
        results = extract_zhihu(content)
    else:
        results = extract_bingo_links(content)
    
    print(f"Total: {len(results)} results")
    for i, r in enumerate(results[:10], 1):
        title = r.get('title', '')
        if title:
            print(f"\n  {i}. {title[:200]}")
            desc = r.get('desc', r.get('excerpt', ''))
            if desc:
                print(f"     {desc[:200]}")
            author = r.get('author', '')
            if author:
                print(f"     Author: {author[:100]}")
            votes = r.get('votes', '')
            if votes:
                print(f"     Votes: {votes}")
            url = r.get('url', '')
            if url:
                print(f"     URL: {url[:200]}")
