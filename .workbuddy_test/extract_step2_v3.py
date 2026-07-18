import re, html

def extract_bingo_links_en(content):
    """Extract Bing results with English locale (better for Chinese keyword matching)"""
    parts = content.split('class="b_algo"')
    results = []
    for part in parts[1:30]:
        end_idx = part.rfind('</li>')
        if end_idx < 0: end_idx = part.rfind('<div')
        block = part[:end_idx] if end_idx > 0 else part
        
        links = re.findall(r'<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', block, re.DOTALL)
        descs = re.findall(r'<p[^>]*>(.*?)</p>', block, re.DOTALL)
        
        for url, raw in links:
            title = re.sub(r'<[^>]+>', '', raw).strip()
            if title and len(title) > 10:
                desc = ''
                if descs:
                    desc = re.sub(r'<[^>]+>', '', descs[-1]).strip()[:400]
                results.append({
                    'title': html.unescape(title), 
                    'desc': html.unescape(desc), 
                    'url': url
                })
    return results

def extract_zhihu(content):
    """Extract Zhihu search results"""
    results = []
    
    # Try JSON patterns
    json_blocks = re.findall(r'"title"\s*:\s*"([^"]+)"', content)
    excerpts = re.findall(r'"excerpt"\s*:\s*"([^"]*)"', content)
    authors = re.findall(r'"name"\s*:\s*"([^"]*)"', content)
    
    for i, title in enumerate(json_blocks):
        if any(kw in title for kw in ['行测', '舍弃', '公考', '公考', '上岸', '备考', '申论']):
            results.append({
                'title': title,
                'excerpt': excerpts[i][:300] if i < len(excerpts) else '',
                'author': authors[i] if i < len(authors) else ''
            })
    
    return results

print("="*60)
print("=== ZHIHU 行测舍弃 ===")
print("="*60)
with open(r'D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/zhihu_xc.html', 'r', encoding='utf-8') as f:
    zhihu_content = f.read()

zhihu_results = extract_zhihu(zhihu_content)
print(f"Total: {len(zhihu_results)} results")
for i, r in enumerate(zhihu_results[:10], 1):
    print(f"\n  {i}. {r['title'][:200]}")
    if r['excerpt']:
        print(f"     {r['excerpt'][:300]}")
    if r['author']:
        print(f"     Author: {r['author'][:100]}")

print("\n" + "="*60)
print("=== BING 行测舍弃 (en-US locale) ===")
print("="*60)
with open(r'D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/bing_detailed.html', 'r', encoding='utf-8') as f:
    bing_content = f.read()

bing_results = extract_bingo_links_en(bing_content)
print(f"Total: {len(bing_results)} results")
for i, r in enumerate(bing_results[:15], 1):
    title = r['title']
    if any(kw in title for kw in ['行测', '舍弃', '放弃', '公考', '上岸', '备考', '申论']):
        print(f"\n  {i}. {title[:200]}")
        if r['desc']:
            print(f"     {r['desc'][:300]}")
        print(f"     URL: {r['url'][:150]}")
