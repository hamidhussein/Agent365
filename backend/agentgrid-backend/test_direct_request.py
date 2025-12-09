import requests
import sys

# Test if server is actually receiving requests
url = "http://localhost:8000/api/v1/auth/register"
data = {
    "email": "direct_test@example.com",
    "username": "direct_test",
    "password": "Password123!",
    "full_name": "Direct Test"
}

print(f"Sending POST request to {url}")
print(f"Data: {data}")

try:
    response = requests.post(url, json=data, timeout=5)
    print(f"\nStatus Code: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    print(f"Response Text: {response.text}")
    
    # Try to parse as JSON
    try:
        print(f"Response JSON: {response.json()}")
    except:
        print("Response is not JSON")
        
except requests.exceptions.ConnectionError as e:
    print(f"Connection Error: {e}")
    print("Is the server running on port 8000?")
except requests.exceptions.Timeout as e:
    print(f"Timeout Error: {e}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
