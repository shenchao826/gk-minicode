import re, json

with open(r"D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/xhs_explore.html", "r", encoding="utf-8") as f:
    content = f.read()

# Extract full __INITIAL_STATE__
match = re.search(r'window\.__INITIAL_STATE__\s*=\s*(\{.*?\});\(function', content, re.DOTALL)
if match:
    json_str = match.group(1)
    print(f"JSON length: {len(json_str)}")
    
    # Try to find tags/note-related data
    tags = re.findall(r'"tags":\s*\[([^\]]+)\]', json_str)
    print(f"Tags arrays: {len(tags)}")
    for t in tags[:3]:
        print(t[:300])
    
    # Find all note cards
    notes = re.findall(r'"noteCard":\s*({[^}]+})', json_str)
    print(f"\nNoteCards: {len(notes)}")
    for n in notes[:5]:
        print(n[:500])
    
    # Find titles
    titles = re.findall(r'"title":\s*"([^"]+)"', json_str)
    print(f"\nTitles: {len(titles)}")
    for t in titles[:20]:
        if len(t) > 5 and '公' in t or '考' in t or '行测' in t or '舍' in t or '上岸' in t:
            print('  ★ ' + t[:150])
