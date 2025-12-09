import requests

# Login to get token
login_response = requests.post(
    "http://localhost:8000/api/v1/auth/login",
    json={"email": "creator@test.com", "password": "Test123456"}
)
token = login_response.json()["access_token"]
print(f"Got token: {token[:50]}...")

headers = {"Authorization": f"Bearer {token}"}

# Create agent 1 - Content Writer (creative category)
agent1_data = {
    "name": "Content Writer Pro",
    "description": "AI-powered content writer that creates engaging blog posts and articles with SEO optimization",
    "long_description": "This agent uses advanced language models to generate high-quality content for blogs, websites, and marketing materials.",
    "category": "creative",
    "tags": ["writing", "content", "blog"],
    "price_per_run": 10,
    "config": {
        "model": "gpt-4",
        "temperature": 0.7,
        "max_tokens": 2000,
        "timeout_seconds": 120,
        "required_inputs": [],
        "output_schema": {}
    },
    "capabilities": ["Blog post generation", "Article writing"],
    "demo_available": True
}

response1 = requests.post("http://localhost:8000/api/v1/agents", json=agent1_data, headers=headers)
print(f"\nAgent 1: {response1.status_code}")
if response1.status_code != 201:
    print(f"Error: {response1.text}")

# Create agent 2 - Data Analyst (analysis category)
agent2_data = {
    "name": "Data Analyst Assistant",
    "description": "Analyzes data sets and provides insights, visualizations, and recommendations for business decisions",
    "long_description": "This agent specializes in data analysis, helping you understand trends, patterns, and anomalies in your data.",
    "category": "analysis",
    "tags": ["data", "analysis", "insights"],
    "price_per_run": 15,
    "config": {
        "model": "gpt-4",
        "temperature": 0.3,
        "max_tokens": 3000,
        "timeout_seconds": 180,
        "required_inputs": [],
        "output_schema": {}
    },
    "capabilities": ["Data analysis", "Trend identification"],
    "demo_available": True
}

response2 = requests.post("http://localhost:8000/api/v1/agents", json=agent2_data, headers=headers)
print(f"Agent 2: {response2.status_code}")
if response2.status_code != 201:
    print(f"Error: {response2.text}")

# Create agent 3 - Research Assistant (research category)
agent3_data = {
    "name": "Research Assistant Pro",
    "description": "Conducts comprehensive research on any topic and provides detailed summaries with sources",
    "long_description": "An AI-powered research assistant that gathers information from multiple sources and synthesizes it into clear, actionable insights.",
    "category": "research",
    "tags": ["research", "information", "analysis"],
    "price_per_run": 12,
    "config": {
        "model": "gpt-4",
        "temperature": 0.5,
        "max_tokens": 3500,
        "timeout_seconds": 200,
        "required_inputs": [],
        "output_schema": {}
    },
    "capabilities": ["Research", "Information gathering", "Summary generation"],
    "demo_available": False
}

response3 = requests.post("http://localhost:8000/api/v1/agents", json=agent3_data, headers=headers)
print(f"Agent 3: {response3.status_code}")
if response3.status_code != 201:
    print(f"Error: {response3.text}")

# Verify agents were created
agents_response = requests.get("http://localhost:8000/api/v1/agents")
print(f"\n✅ Total agents in database: {agents_response.json()['total']}")
