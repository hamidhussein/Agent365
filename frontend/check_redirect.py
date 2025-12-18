import requests

try:
    response = requests.head("http://localhost:3000/agents", allow_redirects=False)
    print(f"Status Code: {response.status_code}")
    print(f"Headers: {response.headers}")
    if response.status_code in [301, 302, 307, 308]:
        print(f"Redirect Location: {response.headers.get('Location')}")
except Exception as e:
    print(f"Error: {e}")
