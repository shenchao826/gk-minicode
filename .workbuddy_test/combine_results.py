import re
import html

files = [
    r"D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/bing_exam.html",
    r"D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/bing_shang'an.html",
]

for filepath in files:
    print(f"\n=== {filepath.split('/')[-1]} ===")
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    titles = re.findall(r'<h2[^>]*>\s*<a[^>]*>\s*(.*?)\s*</a>', content, re.DOTALL)
    seen = set()
    results = []
    for t in titles:
        clean = re.sub(r'<[^>]+>', '', t).strip()
        if clean and len(clean) > 5 and clean not in seen:
            seen.add(clean)
            results.append(html.unescape(clean))
    for i, t in enumerate(results[:15], 1):
        print(f"  {i}. {t[:200]}")
