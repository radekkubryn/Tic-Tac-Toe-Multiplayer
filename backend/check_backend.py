import http.client
import sys
import os

def check_local():
    port = int(os.getenv("PORT", 8080))
    print(f"Checking local backend on port {port}...")
    
    try:
        conn = http.client.HTTPConnection("localhost", port)
        conn.request("GET", "/health-check-fastapi")
        res = conn.getresponse()
        data = res.read().decode()
        
        print(f"Status: {res.status}")
        print(f"Headers: {res.getheaders()}")
        print(f"Body: {data}")
        
        if res.status == 200 and "FastAPI" in data:
            print("\nSUCCESS: Backend is running and reachable locally!")
        else:
            print("\nFAILURE: Unexpected response from backend.")
            
    except Exception as e:
        print(f"\nERROR: Could not connect to backend: {e}")
        print("Make sure the uvicorn process is running.")

if __name__ == "__main__":
    check_local()
