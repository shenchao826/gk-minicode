import re
import html

files = {
    "bing_recruit.html": "公务员招考2026",
    "bing_zhonggong.html": "国考公告2026报名",
    "bing_mix.html": "公务员考试",
}

for fname, label in files.items():
    print(f"\n{'='*60}")
    print(f"=== {label} ===")
    print('='*60)
    
    filepath = rf"D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/{fname}"
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    titles = re.findall(r'<h2[^>]*>\s*<a[^>]*>\s*(.*?)\s*</a>', content, re.DOTALL)
    descs = re.findall(r'<span[^>]*class="algo-site-description[^"]*"[^>]*>(.*?)</span>', content, re.DOTALL)
    
    seen = set()
    for i, t in enumerate(titles):
        clean = re.sub(r'<[^>]+>', '', t).strip()
        if clean and len(clean) > 5 and clean not in seen and 'bing' not in clean.lower() and 'microsoft' not in clean.lower():
            seen.add(clean)
            desc = ''
            if i < len(descs):
                desc = re.sub(r'<[^>]+>', '', descs[i]).strip()[:300]
            print(f"\n[{html.unescape(clean)}]")
            if desc:
                print(html.unescape(desc)[:300])
            # Extract URL from h2 anchor
            url_match = re.search(rf'<h2[^>]*>\s*<a[^>]*href="([^"]*)"', t)
            if url_match:
                print(f"URL: {url_match.group(1)}")
