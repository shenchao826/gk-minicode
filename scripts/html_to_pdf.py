import asyncio
from playwright.async_api import async_playwright
import os

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
    materials_dir = r"d:\Documents\Obsidian Vault\国考资料工具\gk-minicode\materials\01_岗位报考筛选专区"
    
    files_to_convert = [
        ("报考流程指南包/国考报考全流程指南.html", "报考流程指南包/国考报考全流程指南.pdf"),
        ("报考流程指南包/国考报考避雷指南.html", "报考流程指南包/国考报考避雷指南.pdf"),
        ("智能筛选Excel模板（可直接输入条件自动筛岗）/智能筛选Excel模板设计说明.html", "智能筛选Excel模板（可直接输入条件自动筛岗）/智能筛选Excel模板设计说明.pdf")
    ]
    
    for html_rel, pdf_rel in files_to_convert:
        html_path = os.path.join(materials_dir, html_rel)
        pdf_path = os.path.join(materials_dir, pdf_rel)
        
        if os.path.exists(html_path):
            print(f"Converting: {html_path}")
            await html_to_pdf(html_path, pdf_path)
        else:
            print(f"File not found: {html_path}")

if __name__ == "__main__":
    asyncio.run(main())