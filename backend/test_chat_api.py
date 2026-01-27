import sys
import os
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import app

client = TestClient(app)

def test_chat_memory():
    session_id = "test_session_123"
    
    # First message
    response1 = client.post("/api/chat", json={
        "message": "Hi , my name is Uzair.",
        "session_id": session_id
    })
    assert response1.status_code == 200
    print("Response 1:", response1.json())
    
    # Second message asking for name
    response2 = client.post("/api/chat", json={
        "message": "What is my name?",
        "session_id": session_id
    })
    assert response2.status_code == 200
    print("Response 2:", response2.json())
    
    # Check if memory works
    assert "Uzair" in response2.json()["response"]

if __name__ == "__main__":
    try:
        test_chat_memory()
        print("Test passed!")
    except Exception as e:
        print(f"Test failed: {e}")
