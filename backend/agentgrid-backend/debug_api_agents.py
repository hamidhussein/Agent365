import requests
import json

try:
    response = requests.get("http://localhost:8001/api/v1/agents")
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(json.dumps(data, indent=2))
    else:
        print(response.text)
except Exception as e:
    print(f"Error: {e}")
