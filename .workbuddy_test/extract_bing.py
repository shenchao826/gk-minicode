import re
import html

filepath = r"D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/bing_guokao2.html"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

titles = re.findall(r'<h2[^>]*>\s*<a[^>]*>\s*(.*?)\s*</a>', content, re.DOTALL)
descriptions = re.findall(r'<li[^>]*class="algo-SR_CompositeResponse__cardBody[^"]*"[^>]*>(.*?)</li>', content, re.DOTALL)

seen = set()
results = []
for t in titles:
    clean = re.sub(r'<[^>]+>', '', t).strip()
    if clean and len(clean) > 5 and clean not in seen:
        seen.add(clean)
        results.append(clean)

print(f"Bing '国考' 2026 热点 results ({len(results)}):")
for i, t in enumerate(results[:20], 1):
    print(f"  {i}. {html.unescape(t[:150])}")

# Also extract URLs  
urls = re.findall(r'<h2[^>]*>\s*<a[^>]*href="([^"]*)"', content, re.DOTALL)
urls = [u for u in urls if u and len(u) > 10 and 'bing.com' not in u and 'microsoft.com' not in u]
seen_u = set()
unique_urls = []
for u in urls:
    if u not in seen_u:
        seen_u.add(u)
        unique_urls.append(u)
print(f"\nRelated URLs ({len(unique_urls)}):")
for i, u in enumerate(unique_urls[:15], 1):
    print(f"  {i}. {u[:180]}")
