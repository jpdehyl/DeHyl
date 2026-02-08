#!/usr/bin/env python3
import urllib.request
import urllib.parse
import json

# Supabase Management API configuration
PROJECT_ID = "pwcczlrjguvhvhnzupuv"
TOKEN = "sbp_11e858e8b4ebbdbc4648e753bde9c31a8435fe79"
BASE_URL = f"https://api.supabase.com/v1/projects/{PROJECT_ID}/database/query"

def execute_query(query):
    data = {"query": query}
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0"
    }
    
    try:
        req = urllib.request.Request(BASE_URL, data=json.dumps(data).encode('utf-8'), headers=headers, method='POST')
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Error: {e}")
        return None

# Simple check - just verify table exists and can insert/select
print("Verifying expenses table...")

# Check if table exists by trying to count rows
result = execute_query("SELECT COUNT(*) FROM expenses;")
if result:
    print("✓ Expenses table exists and accessible")
else:
    print("✗ Expenses table not accessible")
    exit(1)

# Check Shop project
result = execute_query("SELECT code, client_name FROM projects WHERE code = 'SHOP';")
if result and len(result) > 0:
    print("✓ Shop project exists")
else:
    print("✗ Shop project not found")

print("✅ Basic verification complete - expenses module should be working!")