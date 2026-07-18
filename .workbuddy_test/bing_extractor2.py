import re, html

with open(r"D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/bing_final.html", "r", encoding="utf-8") as f:
    content = f.read()

# Split by b_algo markers
parts = content.split('class="b_algo"')
print(f"Total b_algo parts: {len(parts)}")

for i, part in enumerate(parts[1:], 1):
    end_idx = part.find("</li>")
    if end_idx < 0:
        end_idx = part.find("<div")
    block = part[:end_idx] if end_idx > 0 else part
    
    # Extract ALL titles (not just the first)
    all_links = re.findall(r'<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', block, re.DOTALL)
    all_descs = re.findall(r'<p[^>]*>(.*?)</p>', block, re.DOTALL)
    
    print(f"\n--- Result {i} ---")
    for url, raw_title in all_links:
        title_clean = re.sub(r'<[^>]+>', '', raw_title).strip()
        if title_clean and len(title_clean) > 5:
            print(f"  LINK: {html.unescape(title_clean)[:150]}")
            print(f"        URL: {url[:100]}")
    for d in all_descs:
        desc_clean = re.sub(r'<[^>]+>', '', d).strip()
        if desc_clean:
            print(f"  DESC: {html.unescape(desc_clean)[:200]}")
