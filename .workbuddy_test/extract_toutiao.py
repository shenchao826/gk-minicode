import re, json

with open(r"D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/toutiao.html", "r", encoding="utf-8") as f:
    content = f.read()

# Clean HTML-like escape codes
def clean(s):
    s = s.replace("&quot;", '"')
    s = s.replace("\\u003cem\\u003e", "<em>")
    s = s.replace("\\u003c/em\\u003e", "</em>")
    s = s.replace("<em>", "")
    s = s.replace("</em>", "")
    return s

# Articles
articles = re.findall(r'"title":"([^"]+)"', content)
print("=== TOUTIAO ARTICLES ===")
seen = set()
for a in articles:
    clean_a = clean(a)
    if clean_a and clean_a not in seen and len(clean_a) > 10:
        seen.add(clean_a)
        print(f"  - {clean_a[:200]}")

# Feeds
feeds = re.findall(r'"content":"(.*?)"', content)
print("\n=== TOUTIAO FEEDS ===")
for f in feeds:
    clean_f = clean(f)
    if clean_f and len(clean_f) > 20:
        print(f"  - {clean_f[:400]}")
        print()
