import urllib.request, json, time

API_KEY = 'sk-RXtklur4saoQMaRuEtADWYXMSqE8EN1q1t5oIRJz2nVoPTyS'
HEADERS = {'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}
OUT_DIR = 'd:/Documents/Obsidian Vault/国考资料工具/gk-minicode/articles/20260717_gzht_pgp/xiaohongshu/images'

prompts = [
    ('xhs_cover1.png', 'A minimalist infographic poster background. Split scene. Left side: wide busy highway with dozens of tiny silhouettes of people walking in a crowd moving forward. Right side: narrow quiet corridor with one confident person walking toward a bright light. Dramatic contrast between crowded and peaceful. Professional flat illustration style. Blue and amber color palette. Clean white background.'),
    ('xhs_data_bars.png', 'Clean bar chart visualization. Two vertical bars side by side on white background. Left bar: very tall, red-to-orange gradient, visually representing high number. Right bar: very short, green gradient, visually representing low number. Simple modern infographic style. Numbers not needed in image.'),
    ('xhs_flowchart.png', 'Three connected circles in a horizontal flow. Circle 1: magnifying glass icon. Circle 2: funnel icon. Circle 3: trophy icon. Connected by curved arrows flowing left to right. Soft blue and orange color palette on clean white background. Minimalist flat design.'),
    ('xhs_cover_warning.png', 'Three vertical rectangular warning badges arranged diagonally. Each badge is a rounded rectangle with a different icon: first has a stop/halt icon, second has a question mark icon, third has a danger/caution icon. Red and orange tones. Clean flat vector art style, white background.'),
]

for idx, (filename, prompt) in enumerate(prompts):
    max_retries = 5
    success = False
    for attempt in range(max_retries):
        try:
            data = {'model': 'agnes-image-2.1-flash', 'prompt': prompt, 'size': '1024x1024'}
            req = urllib.request.Request(
                'https://apihub.agnes-ai.com/v1/images/generations',
                data=json.dumps(data).encode(),
                headers=HEADERS
            )
            resp = urllib.request.urlopen(req, timeout=180)
            result = json.loads(resp.read())
            url = result['data'][0]['url']
            
            # Download
            img_req = urllib.request.Request(url)
            img_resp = urllib.request.urlopen(img_req, timeout=60)
            filepath = OUT_DIR + '/' + filename
            with open(filepath, 'wb') as f:
                f.write(img_resp.read())
            print(f'[OK] {filename} from {url}')
            success = True
            break
        except Exception as e:
            if attempt < max_retries - 1:
                print(f'  Retrying {filename} ({attempt+1}/{max_retries}): {e}')
                time.sleep(60)
            else:
                print(f'  FAILED {filename} after {max_retries} attempts: {e}')
