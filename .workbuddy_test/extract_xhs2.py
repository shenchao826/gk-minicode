import re, json

with open(r"D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/xhs_explore.html", "r", encoding="utf-8") as f:
    content = f.read()

# Find __INITIAL_STATE__ more carefully
idx = content.find('__INITIAL_STATE__')
if idx > 0:
    # From the match point, find the JSON object
    start = content.find('{', idx)
    print(f"Start of JSON at: {start}")
    
    # Try to find end by counting braces
    depth = 0
    end = start
    for i in range(start, min(start + 2000000, len(content))):
        if content[i] == '{':
            depth += 1
        elif content[i] == '}':
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    
    json_str = content[start:end]
    print(f"JSON string length: {len(json_str)}")
    
    try:
        data = json.loads(json_str)
        
        # Look for note card data in various paths
        def find_notes(obj, path=""):
            if isinstance(obj, dict):
                for k, v in obj.items():
                    if k in ('noteCard', 'noteCards', 'notes', 'cards', 'feeds'):
                        print(f"\nFound at {path}.{k}: {type(v).__name__} with {len(v) if isinstance(v, (list, dict)) else 'N/A'} items")
                        if isinstance(v, list) and len(v) > 0:
                            print(f"  First item keys: {list(v[0].keys()) if isinstance(v[0], dict) else type(v[0])}")
                            if isinstance(v[0], dict):
                                for nk, nv in v[0].items():
                                    if isinstance(nv, str) and len(nv) > 0:
                                        print(f"    {nk}: {nv[:200]}")
                    else:
                        find_notes(v, f"{path}.{k}")
            elif isinstance(obj, list):
                for i, item in enumerate(obj[:5]):
                    find_notes(item, f"{path}[{i}]")
        
        find_notes(data)
        
        # Also look for tags
        tags = re.findall(r'"tags":\s*\[(.*?)\]', json_str)
        print(f"\nTags arrays: {len(tags)}")
        for t in tags[:3]:
            print(t[:300])
            
        # Look for titles with search
        titles = re.findall(r'"title"\s*:\s*"([^"]+)"', json_str)
        guokao_titles = [t for t in titles if '公' in t or '考' in t or '行测' in t or '舍' in t or '上岸' in t or '国考' in t or '编制' in t]
        print(f"\nTotal titles: {len(titles)}")
        print(f"Guokao-related titles: {len(guokao_titles)}")
        for t in guokao_titles[:15]:
            print(f"  - {t[:200]}")
            
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        # Try truncating and parsing
        print(f"Truncated JSON sample:")
        print(json_str[:500])
