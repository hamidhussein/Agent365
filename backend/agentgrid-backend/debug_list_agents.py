import requests
import json

def debug_list_agents():
    url = "http://localhost:8001/api/v1/agents"
    try:
        response = requests.get(url)
        print(f"Status Code: {response.status_code}")
        if response.status_code != 200:
            print("Error Response:")
            print(response.text)
        else:
            print("Success. Agents found:")
            data = response.json()
            print(f"Total: {data.get('total')}")
            for agent in data.get('items', []):
                print(f"- {agent.get('name')} ({agent.get('id')})")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    debug_list_agents()
