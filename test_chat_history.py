import sys
import os
from pathlib import Path

# Add backend to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))

from starlette.testclient import TestClient
# Now import from main as if we are in backend dir, or import backend.main?
# The issue is inside main.py it does "from routes import ...". 
# If we add backend to sys.path, "import routes" should work because backend/routes exists? 
# No, "from routes" looks for routes.py or routes package. backend/routes is a package.
# So if backend is in sys.path, "import routes" finds backend/routes.
try:
    from main import app
    from routes.chat_history_routes import get_current_user
except ImportError:
    # If that fails, try backend.main but we might need to patch main.py imports
    from backend.main import app
    from backend.routes.chat_history_routes import get_current_user

# Mock user
async def mock_get_current_user():
    return {"email": "test@iba-suk.edu.pk", "name": "Test User"}

app.dependency_overrides[get_current_user] = mock_get_current_user

client = TestClient(app)

def test_chat_history_flow():
    # 1. Create a new chat session
    print("\n1. Creating new chat session...")
    response = client.post("/api/chats")
    if response.status_code != 200:
        print(f"Failed to create chat: {response.text}")
    assert response.status_code == 200
    session_data = response.json()
    session_id = session_data["_id"]
    print(f"   Created Session ID: {session_id}")
    assert session_data["title"] == "New Chat"

    # 2. List chat sessions
    print("\n2. Listing chat sessions...")
    response = client.get("/api/chats")
    assert response.status_code == 200
    sessions = response.json()
    print(f"   Found {len(sessions)} sessions.")
    assert len(sessions) > 0
    # check if our session is there
    found = any(s["_id"] == session_id for s in sessions)
    assert found

    # 3. Fetch messages (should be empty)
    print("\n3. Fetching messages for session...")
    response = client.get(f"/api/chats/{session_id}/messages")
    assert response.status_code == 200
    messages = response.json()
    print(f"   Found {len(messages)} messages (expected 0).")
    assert len(messages) == 0

    # 4. Delete chat session
    print("\n4. Deleting chat session...")
    response = client.delete(f"/api/chats/{session_id}")
    assert response.status_code == 200
    print("   Deleted.")
    
    # 5. Verify deletion
    response = client.get("/api/chats")
    sessions = response.json()
    ids = [s["_id"] for s in sessions]
    assert session_id not in ids
    print("   Verified deletion.")

if __name__ == "__main__":
    try:
        test_chat_history_flow()
        print("\n✅ Chat History API Tests Passed!")
    except Exception as e:
        print(f"\n❌ Test Failed: {e}")
        exit(1)
