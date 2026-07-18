import re, html, json

files = {
    'Bing 国考2026': r'D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/bing_step2.html',
    'Bing 行测舍弃': r'D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/bing_zxsh2.html',
    'Sogou 国考2026': r'D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/sogou_step2.html',
    'Sogou 低粉高赞': r'D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/sogou_lowfan2.html',
    'XHS 行测舍弃': r'D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/xhs_step2.html',
    'Toutiao 国考备考': r'D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/toutiao_step2.html',
}

def extract_bingo_links(content):
    """Extract Bing b_algo links"""
    parts = content.split('class="b_algo"')
    results = []
    for part in parts[1:]:
        end = part.find('</li>')
        if end < 0: end = part.find('<div')
        block = part[:end] if end > 0 else part
        
        titles = re.findall(r'<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', block, re.DOTALL)
        descs = re.findall(r'<p[^>]*>(.*?)</p>', block, re.DOTALL)
        
        for url, raw in titles:
            title = re.sub(r'<[^>]+>', '', raw).strip()
            if title and len(title) > 8 and 'bing' not in title.lower() and 'microsoft' not in title.lower():
                desc = ''
                if descs:
                    desc = re.sub(r'<[^>]+>', '', descs[-1]).strip()[:300]
                results.append({'title': html.unescape(title), 'desc': html.unescape(desc), 'url': url})
        if parts.index(part) >= 15: break
    return results

def extract_sogou_links(content):
    """Extract Sogou result links"""
    # Sogou uses class="tit" for titles
    tit_patterns = re.findall(r'class="tit[^"]*"[^>]*>(.*?)</a>', content, re.DOTALL)
    descs = re.findall(r'class="fparam[^"]*"[^>]*>(.*?)</span>', content, re.DOTALL)
    
    results = []
    for i, tit in enumerate(tit_patterns):
        clean = re.sub(r'<[^>]+>', '', tit).strip()
        if clean and len(clean) > 8 and 'sogou' not in clean.lower():
            desc = ''
            if i < len(descs):
                desc = re.sub(r'<[^>]+>', '', descs[i]).strip()[:300]
            results.append({'title': html.unescape(clean), 'desc': html.unescape(desc)})
    return results

def extract_xhs_links(content):
    """Extract XHS feed data"""
    start = content.find('{', content.find('__INITIAL_STATE__'))
    if start < 0: return []
    end_marker = content.find('</script>', start)
    if end_marker < 0: end_marker = start + 60000
    json_section = content[start:end_marker]
    fixed = json_section.replace(':undefined', ':null')
    try:
        data = json.loads(fixed)
    except:
        return []
    
    feeds = data.get('feed', {}).get('feeds', [])
    results = []
    for feed in feeds:
        nc = feed.get('noteCard', {})
        title = nc.get('displayTitle', '')
        user = nc.get('user', {})
        uname = ''
        if isinstance(user, dict):
            uname = user.get('nickname', user.get('nickName', ''))
        if title:
            results.append({'title': title, 'user': uname})
    return results

def extract_toutiao_links(content):
    """Extract Toutiao JSON data"""
    results = []
    # Try to find article data in embedded JSON
    articles = re.findall(r'"title":"([^"]*)"', content)
    authors = re.findall(r'"nickname":"([^"]*)"', content)
    digests = re.findall(r'"digest":"([^"]*)"', content)
    
    for i, title in enumerate(articles[:15]):
        author = authors[i] if i < len(authors) else ''
        digest = digests[i] if i < len(digests) else ''
        results.append({'title': title, 'author': author, 'digest': digest[:200]})
    
    # Also look for content data
    titles2 = re.findall(r'"data":\{[^}]*"title":"([^"]*)"', content)
    for t in titles2[:10]:
        if t not in [r['title'] for r in results]:
            results.append({'title': t})
            
    return results

print("="*80)
for name, path in files.items():
    print(f"\n{'='*40}")
    print(f"=== {name} ===")
    print(f"{'='*40}")
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    results = []
    if 'Bing' in name:
        results = extract_bingo_links(content)
    elif 'Sogou' in name:
        results = extract_sogou_links(content)
    elif 'XHS' in name:
        results = extract_xhs_links(content)
    elif 'Toutiao' in name:
        results = extract_toutiao_links(content)
    
    print(f"Total: {len(results)} results")
    for i, r in enumerate(results[:10], 1):
        title = r.get('title', '')
        if title:
            print(f"\n  {i}. {title[:200]}")
            desc = r.get('desc', r.get('digest', ''))
            if desc:
                print(f"     {desc[:200]}")
            author = r.get('author', r.get('user', ''))
            if author:
                print(f"     Author: {author[:100]}")
