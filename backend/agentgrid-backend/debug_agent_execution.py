import requests
import json

AGENT_ID = "00000000-0000-0000-0000-000000000001"
URL = f"http://localhost:8001/api/v1/agents/{AGENT_ID}/execute"

payload = {
    "inputs": {
        "message": "Hello Debugger"
    }
}

try:
    # We need to be authenticated to run an agent usually, or maybe not for the echo agent if price is 0?
    # But the echo agent price is 1.0 now.
    # So we need a user token.
    
    # First, login to get token
    login_url = "http://localhost:8001/api/v1/auth/login"
    login_data = {
        "email": "testclient_user@example.com",
        "password": "Password123!"
    }
    
    session = requests.Session()
    # Use json= for LoginRequest
    login_resp = session.post(login_url, json=login_data)
    
    if login_resp.status_code != 200:
        print(f"Login Failed: {login_resp.status_code} {login_resp.text}")
        # Try registering if login fails (maybe DB was reset and user gone)
        register_url = "http://localhost:8001/api/v1/auth/register"
        reg_data = {
            "email": "testclient_user@example.com",
            "username": "testclient_user",
            "password": "Password123!",
            "full_name": "Test Client User"
        }
        reg_resp = requests.post(register_url, json=reg_data)
        print(f"Register Status: {reg_resp.status_code}")
        if reg_resp.status_code != 201:
             print(f"Register Failed: {reg_resp.text}")
        
        # Login again
        login_resp = session.post(login_url, json=login_data)
        if login_resp.status_code != 200:
             print("Login failed after registration attempt.")
             exit(1)

    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"Executing Agent {AGENT_ID}...")
    response = requests.post(URL, json=payload, headers=headers)
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Success!")
        print(json.dumps(response.json(), indent=2))
    else:
        print("Failed!")
        with open("error.log", "w") as f:
            f.write(response.text)
        print("Error written to error.log")

except Exception as e:
    print(f"Error: {e}")
