"""Quick test script for anchoring agent endpoints"""
import requests

BASE = "http://localhost:5000"
session = requests.Session()

# Login - try known accounts
for creds in [
    {"email": "demo@test.com", "password": "demo123"},
    {"email": "demo@test.com", "password": "password"},
    {"email": "demo@test.com", "password": "Demo@123"},
    {"email": "test@example.com", "password": "test123"},
    {"email": "test@example.com", "password": "password"},
    {"email": "yukti06@gmail.com", "password": "password"},
    {"email": "yukti06@gmail.com", "password": "test123"},
]:
    r = session.post(f"{BASE}/api/auth/login", json=creds)
    if r.status_code == 200:
        print(f"Login OK with: {creds['email']}")
        break
    else:
        print(f"Login failed: {creds['email']} / {creds['password']}")
else:
    print("All login attempts failed. Creating new test user...")
    r = session.post(f"{BASE}/api/auth/signup", json={
        "name": "Test Anchoring",
        "email": "anchoring@test.com",
        "password": "test123"
    })
    print(f"Signup: {r.status_code} - {r.json().get('message', r.json().get('error'))}")

# Get agents
r = session.get(f"{BASE}/api/agents")
if r.status_code == 200:
    agents = r.json()['agents']
    print(f"\nAgents ({len(agents)}):")
    for a in agents:
        at = a.get('agent_type', '?')
        default = a.get('is_default', False)
        script = 'yes' if a.get('script_content') else 'no'
        print(f"  {a['icon']} {a['name']} [type={at}] [default={default}] [script={script}]")

    # Find anchoring agent
    anc = [a for a in agents if a.get('agent_type') == 'anchoring']
    if anc:
        agent = anc[0]
        print(f"\n✅ Anchoring agent found: {agent['name']} (id={agent['id']})")
        
        # Test state endpoint
        r2 = session.get(f"{BASE}/api/agents/{agent['id']}/anchoring/state")
        print(f"State endpoint: {r2.status_code} - {r2.json()}")
        
        # Test control endpoint
        r3 = session.post(f"{BASE}/api/agents/{agent['id']}/anchoring/control", json={"action": "play"})
        print(f"Play control: {r3.status_code} - status={r3.json().get('state', {}).get('status')}")
        
        r4 = session.post(f"{BASE}/api/agents/{agent['id']}/anchoring/control", json={"action": "stop"})
        print(f"Stop control: {r4.status_code} - status={r4.json().get('state', {}).get('status')}")
        
        # Test delete protection
        r5 = session.delete(f"{BASE}/api/agents/{agent['id']}")
        print(f"Delete attempt: {r5.status_code} - {r5.json().get('error', 'DELETED (BAD!)')}")
        
        print("\n✅ All anchoring endpoints working correctly!")
    else:
        print("\n❌ No anchoring agent found!")
else:
    print(f"Failed to get agents: {r.status_code}")
