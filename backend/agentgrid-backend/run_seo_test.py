import requests
import json
import time

# Configuration
BASE_URL = "http://localhost:8001/api/v1"
SEO_AGENT_ID = "787b599f-c8b9-42bf-affd-7fbd23a3add3"
USER_EMAIL = "testclient_user@example.com"
USER_PASSWORD = "Password123!"

# Inputs provided by user
INPUTS = {
    "url": "https://berniq.aero",
    "max_pages": 4,
    "openai_api_key": "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",
    "generate_pdf": False
}

def run_seo_test():
    session = requests.Session()

    # 1. Login
    print("Logging in...")
    login_resp = session.post(f"{BASE_URL}/auth/login", json={
        "email": USER_EMAIL,
        "password": USER_PASSWORD
    })
    
    if login_resp.status_code != 200:
        print(f"Login failed: {login_resp.text}")
        return

    print("Login successful.")
    
    # Extract token and set header
    token = login_resp.json().get("access_token")
    if token:
        session.headers.update({"Authorization": f"Bearer {token}"})
    else:
        print("Warning: No access_token found in login response. Relying on cookies.")

    # 2. Execute Agent
    print(f"Executing SEO Agent ({SEO_AGENT_ID})...")
    start_time = time.time()
    
    # Note: The backend expects { inputs: { ... } } or flat { ... } depending on our fix.
    # We implemented unwrapping, so sending flat inputs should work, but let's send wrapped just to be safe/standard.
    # Actually, let's send flat as per the fix we verified.
    
    exec_resp = session.post(f"{BASE_URL}/agents/{SEO_AGENT_ID}/execute", json=INPUTS)
    
    if exec_resp.status_code != 200:
        print(f"Execution failed: {exec_resp.status_code}")
        print(exec_resp.text)
        return

    duration = time.time() - start_time
    print(f"Execution completed in {duration:.2f} seconds.")
    
    result = exec_resp.json()
    
    # 3. Display Results
    print("\n=== SEO AUDIT RESULTS ===")
    outputs = result.get("outputs", {})
    
    summary = outputs.get("summary", {})
    print("\n[Summary Metrics]")
    print(json.dumps(summary, indent=2))
    
    recommendations = outputs.get("recommendations", [])
    print("\n[Top Recommendations]")
    for i, rec in enumerate(recommendations[:3]): # Show top 3
        print(f"{i+1}. [{rec.get('priority')}] {rec.get('issue')}")
        print(f"   Recommendation: {rec.get('recommendation')}")
    
    # pages = outputs.get("pages", [])
    # print(f"\n[Pages Crawled: {len(pages)}]")
    # for p in pages:
    #     print(f"- {p.get('url')} (Score: {p.get('seo_score')})")

if __name__ == "__main__":
    run_seo_test()
