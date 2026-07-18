import re, html

with open(r"D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/bing_final.html", "r", encoding="utf-8") as f:
    content = f.read()

# Split by b_algo markers
parts = content.split('class="b_algo"')
print(f"Total b_algo parts: {len(parts)}")

for i, part in enumerate(parts[1:], 1):  # skip first (before any b_algo)
    # Get the closing tag
    end_idx = part.find("</li>")
    if end_idx < 0:
        end_idx = part.find("<div")
    block = part[:end_idx] if end_idx > 0 else part
    
    # Extract title
    title_match = re.search(r'<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', block, re.DOTALL)
    desc_matches = re.findall(r'<p[^>]*>(.*?)</p>', block, re.DOTALL)
    
    if title_match:
        url = title_match.group(1)
        title_raw = title_match.group(2)
        title_clean = re.sub(r'<[^>]+>', '', title_raw).strip()
        
        if '考试' in title_clean or '公务员' in title_clean or '国考' in title_clean or '报名' in title_clean or '公告' in title_clean or '公考' in title_clean:
            print(f"\n--- Result {i} ---")
            print(f"Title: {html.unescape(title_clean)}")
            print(f"URL: {url[:150]}")
            for j, d in enumerate(desc_matches[:2]):
                desc_clean = re.sub(r'<[^>]+>', '', d).strip()
                if desc_clean:
                    print(f"Desc: {html.unescape(desc_clean[:250])}")
