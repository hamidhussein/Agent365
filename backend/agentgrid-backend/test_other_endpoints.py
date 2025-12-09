import requests

# Test health endpoint
print("Testing health endpoint...")
response = requests.get("http://localhost:8000/api/v1/health")
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")

# Test login endpoint (should fail but we'll see the error)
print("\nTesting login endpoint...")
response = requests.post(
    "http://localhost:8000/api/v1/auth/login",
    json={"email": "test@example.com", "password": "wrong"}
)
print(f"Status: {response.status_code}")
print(f"Response: {response.text}")
