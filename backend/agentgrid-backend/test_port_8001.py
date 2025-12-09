import requests

# Test registration on port 8001
url = "http://localhost:8001/api/v1/auth/register"
data = {
    "email": "browser_test@example.com",
    "username": "browser_test",
    "password": "Password123!",
    "full_name": "Browser Test User"
}

print(f"Testing registration on port 8001...")
print(f"POST {url}")

try:
    response = requests.post(url, json=data, timeout=5)
    print(f"\n✓ Status Code: {response.status_code}")
    
    if response.status_code == 201:
        print("✓ Registration successful!")
        print(f"Response: {response.json()}")
    else:
        print(f"✗ Registration failed")
        print(f"Response: {response.text}")
        
except Exception as e:
    print(f"✗ Error: {e}")
