import sys
import asyncio
from pathlib import Path

# Add project root to sys.path
proj_root = Path(r'd:\siba-chatbot-fyp')
if str(proj_root) not in sys.path:
    sys.path.append(str(proj_root))
# Add rag folder too
rag_root = proj_root / "rag"
if str(rag_root) not in sys.path:
    sys.path.append(str(rag_root))

from rag.graph.classifier import classify_query
from rag.graph.timetable_lookup import search_timetable

async def verify():
    test_queries = [
        "show me the classes of Dr. Ismail?",
        "what classes does Dr. Ismail have today?",
        "where is the class of dr ismail on Friday?"
    ]
    
    print("=" * 60)
    for q in test_queries:
        print(f"TESTING: {q}")
        cat = await classify_query(q)
        print(f"CATEGORY: {cat}")
        
        if cat == "Timetable":
            res = search_timetable(q)
            if res:
                print(f"RESULT: Found {len(res.splitlines())} lines of data.")
                print(f"RESULT PREVIEW: {res[:100]}...")
            else:
                print("RESULT: FAILURE (Empty)")
        else:
            print("RESULT: FAILURE (Wrong Category)")
        print("-" * 60)

if __name__ == "__main__":
    asyncio.run(verify())
