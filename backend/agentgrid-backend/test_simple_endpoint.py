import requests

# Test the simple test endpoint
print("Testing /api/v1/auth/test endpoint...")
response = requests.post("http://localhost:8000/api/v1/auth/test")
print(f"Status: {response.status_code}")
print(f"Response: {response.text}")
