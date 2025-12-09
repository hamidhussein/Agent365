import requests

# Login to get token
login_response = requests.post(
    "http://localhost:8000/api/v1/auth/login",
    json={"email": "creator@test.com", "password": "Test123456"}
)
token = login_response.json()["access_token"]
print(f"Got token")

headers = {"Authorization": f"Bearer {token}"}

# Get all agents (including pending_review)
all_agents_response = requests.get(
    "http://localhost:8000/api/v1/agents?creator_id=0c4060c6-a895-4176-b4b2-a758b1b6a9f3",  # creator user ID
    headers=headers
)
print(f"Agents for creator: {all_agents_response.json()}")

# Update each agent to ACTIVE status
agent_ids = []
if all_agents_response.status_code == 200:
    agents_data = all_agents_response.json().get('data', [])
    print(f"\nFound {len(agents_data)} agents")
    
    for agent in agents_data:
        agent_id = agent['id']
        agent_ids.append(agent_id)
        
        # Update to ACTIVE
        update_response = requests.patch(
            f"http://localhost:8000/api/v1/agents/{agent_id}",
            json={"status": "active"},
            headers=headers
        )
        print(f"Updated agent {agent['name']}: {update_response.status_code}")

# Verify agents are now visible
print("\n--- Checking public agent list ---")
public_response = requests.get("http://localhost:8000/api/v1/agents")
print(f"Total public agents: {public_response.json()['total']}")
print(f"Agents: {[a['name'] for a in public_response.json().get('data', [])]}")
