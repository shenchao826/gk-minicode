import os
import re
import asyncio
from playwright.async_api import async_playwright

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        @page {{
            size: A4;
            margin: 2cm;
        }}
        
        body {{
            font-family: "SimSun", "Microsoft YaHei", serif;
            font-size: 12pt;
            line-height: 1.8;
            color: #333;
            margin: 0;
            padding: 0;
        }}
        
        .container {{
            max-width: 210mm;
            margin: 0 auto;
            padding: 2cm;
        }}
        
        h1 {{
            font-size: 24pt;
            font-weight: bold;
            text-align: center;
            margin-bottom: 1.5cm;
            color: #000;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        }}
        
        h2 {{
            font-size: 16pt;
            font-weight: bold;
            margin-top: 1cm;
            margin-bottom: 0.5cm;
            color: #000;
        }}
        
        h3 {{
            font-size: 14pt;
            font-weight: bold;
            margin-top: 0.8cm;
            margin-bottom: 0.3cm;
        }}
        
        h4 {{
            font-size: 12pt;
            font-weight: bold;
            margin-top: 0.5cm;
            margin-bottom: 0.2cm;
        }}
        
        p {{
            margin: 0.3cm 0;
            text-indent: 2em;
        }}
        
        ul, ol {{
            margin: 0.3cm 0;
            padding-left: 1.5em;
        }}
        
        li {{
            margin: 0.2cm 0;
        }}
        
        li ul, li ol {{
            margin: 0.1cm 0;
            padding-left: 1em;
        }}
        
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 0.5cm 0;
            font-size: 11pt;
        }}
        
        th, td {{
            border: 1px solid #000;
            padding: 0.3cm;
            text-align: left;
            vertical-align: top;
        }}
        
        th {{
            background-color: #f0f0f0;
            font-weight: bold;
        }}
        
        tr:nth-child(even) {{
            background-color: #fafafa;
        }}
        
        blockquote {{
            border-left: 4px solid #333;
            padding-left: 0.5cm;
            margin: 0.5cm 0;
            color: #666;
            font-style: italic;
        }}
        
        code {{
            font-family: "Courier New", monospace;
            background-color: #f5f5f5;
            padding: 0.1cm 0.2cm;
            border-radius: 3px;
            font-size: 11pt;
        }}
        
        pre {{
            background-color: #f5f5f5;
            padding: 0.5cm;
            border-radius: 5px;
            overflow-x: auto;
            font-family: "Courier New", monospace;
            font-size: 10pt;
            line-height: 1.5;
        }}
        
        pre code {{
            background: none;
            padding: 0;
        }}
        
        hr {{
            border: none;
            border-top: 1px solid #ccc;
            margin: 1cm 0;
        }}
        
        strong {{
            font-weight: bold;
        }}
        
        em {{
            font-style: italic;
        }}
        
        @media print {{
            body {{
                font-size: 11pt;
            }}
            
            h1 {{
                font-size: 22pt;
            }}
            
            h2 {{
                font-size: 15pt;
            }}
            
            h3 {{
                font-size: 13pt;
            }}
            
            .container {{
                padding: 0;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        {content}
    </div>
</body>
</html>
"""

def markdown_to_html(md_content):
    html = md_content
    
    html = re.sub(r'^# (.+)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
    html = re.sub(r'^#### (.+)$', r'<h4>\1</h4>', html, flags=re.MULTILINE)
    
    html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)
    html = re.sub(r'_(.+?)_', r'<em>\1</em>', html)
    
    html = re.sub(r'^- (.+)$', r'<ul><li>\1</li></ul>', html, flags=re.MULTILINE)
    html = re.sub(r'</ul>\n<ul>', '', html)
    
    html = re.sub(r'^(\d+)\. (.+)$', r'<ol><li>\2</li></ol>', html, flags=re.MULTILINE)
    html = re.sub(r'</ol>\n<ol>', '', html)
    
    html = re.sub(r'^\|(.+)\|$', lambda m: process_table(m.group(1)), html, flags=re.MULTILINE)
    
    html = re.sub(r'```(\w*)\n([\s\S]*?)```', r'<pre><code>\2</code></pre>', html)
    html = re.sub(r'`([^`]+)`', r'<code>\1</code>', html)
    
    html = re.sub(r'^> (.+)$', r'<blockquote>\1</blockquote>', html, flags=re.MULTILINE)
    
    html = re.sub(r'^---$', r'<hr>', html, flags=re.MULTILINE)
    
    lines = html.split('\n')
    processed_lines = []
    for line in lines:
        if line.strip() and not line.startswith('<'):
            processed_lines.append(f'<p>{line}</p>')
        else:
            processed_lines.append(line)
    html = '\n'.join(processed_lines)
    
    html = html.replace('\n\n', '\n')
    
    return html.strip()

def process_table(row_content):
    cells = [cell.strip() for cell in row_content.split('|')]
    if all(cell == '-' * len(cell) for cell in cells):
        return ''
    return f'<tr><td>{"</td><td>".join(cells)}</td></tr>'

def wrap_table(html):
    html = html.replace('<tr>', '<table>\n<tr>', 1)
    if '<table>' in html and '</table>' not in html:
        html = html + '\n</table>'
    return html

def convert_md_to_html(md_path):
    with open(md_path, 'r', encoding='utf-8') as f:
        md_content = f.read()
    
    title = os.path.splitext(os.path.basename(md_path))[0]
    html_content = markdown_to_html(md_content)
    html_content = wrap_table(html_content)
    
    html = HTML_TEMPLATE.format(title=title, content=html_content)
    
    html_path = md_path.replace('.md', '.html')
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print(f"HTML generated: {html_path}")
    return html_path

async def html_to_pdf(html_path, pdf_path):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        await page.goto(f"file:///{html_path}", wait_until="networkidle")
        
        await page.pdf(
            path=pdf_path,
            format="A4",
            print_background=True,
            prefer_css_page_size=True,
            margin={
                "top": "2cm",
                "right": "2cm",
                "bottom": "2cm",
                "left": "2cm"
            }
        )
        
        await browser.close()
        print(f"PDF generated: {pdf_path}")

async def main():
    materials_dir = r"d:\Documents\Obsidian Vault\国考资料工具\gk-minicode\materials"
    
    md_files = []
    for root, dirs, files in os.walk(materials_dir):
        for file in files:
            if file.endswith('.md'):
                md_files.append(os.path.join(root, file))
    
    print(f"Found {len(md_files)} markdown files")
    
    for md_path in md_files:
        print(f"\nProcessing: {md_path}")
        html_path = convert_md_to_html(md_path)
        pdf_path = md_path.replace('.md', '.pdf')
        
        await html_to_pdf(html_path, pdf_path)
    
    print(f"\nConversion complete! Processed {len(md_files)} files.")

if __name__ == "__main__":
    asyncio.run(main())