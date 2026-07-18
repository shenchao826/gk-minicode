import re
import html

filepath = r"D:/Documents/Obsidian Vault/国考资料工具/gk-minicode/.workbuddy_test/sogou_results.html"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Try multiple patterns to extract titles
patterns = [
    r'class="tit[^"]*">\s*(.*?)\s*</a>',
    r'class="txtline[^"]*">\s*(.*?)\s*</a>',
    r'href="[^"]*"\s*>(.*?)\s*</a>',
]

for pat in patterns:
    matches = re.findall(pat, content, re.DOTALL)
    matches = [re.sub(r'<[^>]+>', '', m).strip() for m in matches]
    matches = [m for m in matches if len(m) > 5]
    if matches:
        print(f"Pattern matched with {len(matches)} results:")
        for i, m in enumerate(matches[:15], 1):
            print(f"  {i}. {html.unescape(m[:150])}")
        break
else:
    print("No titles found. File size:", len(content))
    # Show snippet of what we got
    print("Content snippet:", content[500:2000])
