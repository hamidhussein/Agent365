import requests
import uuid

BASE_URL = "http://localhost:8000/api/v1"

def test_review_flow():
    # 1. Register User
    email = f"test_user_{uuid.uuid4()}@example.com"
    password = "Password123!"
    user_data = {
        "email": email,
        "username": f"user_{uuid.uuid4()}",
        "full_name": "Test User",
        "password": password
    }
    
    print(f"Registering user: {email}")
    resp = requests.post(f"{BASE_URL}/auth/register", json=user_data)
    if resp.status_code != 201:
        print(f"Registration failed: {resp.status_code} - {resp.text}")
        return
    
    print("User registered. Logging in...")
    # 2. Login to get token
    login_data = {
        "email": email,
        "password": password
    }
    resp = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        return

    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Create an Agent (needed to review)
    agent_data = {
        "name": "Test Agent",
        "description": "A test agent",
        "category": "automation",
        "price_per_run": 1.0,
        "config": {},
        "capabilities": ["test"],
        "status": "active" 
    }
    
    print("Creating agent...")
    resp = requests.post(f"{BASE_URL}/agents/", json=agent_data, headers=headers)
    if resp.status_code not in [200, 201]:
        print(f"Agent creation failed: {resp.text}")
        return
        
    agent_id = resp.json()["id"]
    print(f"Agent created: {agent_id}")
    
    # 4. Create a Review
    review_data = {
        "agent_id": agent_id,
        "rating": 5.0,
        "title": "Great Agent!",
        "comment": "This agent works perfectly."
    }
    
    print("Creating review...")
    resp = requests.post(f"{BASE_URL}/reviews/", json=review_data, headers=headers)
    if resp.status_code != 200:
        print(f"Review creation failed: {resp.text}")
        return
        
    review = resp.json()
    print(f"Review created: {review['id']}")
    
    # 5. Get Reviews
    print("Fetching reviews...")
    resp = requests.get(f"{BASE_URL}/reviews/?agent_id={agent_id}", headers=headers)
    reviews = resp.json()
    print(f"Found {len(reviews)} reviews")
    
    assert len(reviews) > 0
    assert reviews[0]["title"] == "Great Agent!"
    print("Verification Successful!")

if __name__ == "__main__":
    test_review_flow()
