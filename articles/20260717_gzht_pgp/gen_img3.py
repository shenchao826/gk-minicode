import urllib.request, json, time

API_KEY = 'sk-RXtklur4saoQMaRuEtADWYXMSqE8EN1q1t5oIRJz2nVoPTyS'
HEADERS = {'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}
data = {
    'model': 'agnes-image-2.1-flash',
    'prompt': 'Minimalist flat illustration of a lone white knight chess piece facing an army of black pieces. Blue amber muted tones professional style.',
    'size': '1024x768'
}

ok = False
for i in range(5):
    try:
        req = urllib.request.Request(
            'https://apihub.agnes-ai.com/v1/images/generations',
            data=json.dumps(data).encode(),
            headers=HEADERS
        )
        resp = urllib.request.urlopen(req, timeout=180)
        result = json.loads(resp.read())
        url = result['data'][0]['url']
        print(f'Image 3 URL: {url}')
        ok = True
        break
    except Exception as e:
        print(f'Attempt {i+1}: {e} - retrying in 60s...')
        time.sleep(60)

if not ok:
    print('Failed after 5 attempts')
