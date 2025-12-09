import sys
import os
from fastapi.testclient import TestClient

# Add project root to path
sys.path.append(os.getcwd())

from app.main import app

client = TestClient(app)

def test_register_endpoint():
    try:
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "testclient_user@example.com",
                "username": "testclient_user",
                "password": "Password123!",
                "full_name": "Test Client User"
            }
        )
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.text}")
    except Exception as e:
        print("Exception occurred during request:")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_register_endpoint()
