#!/usr/bin/env python3
import urllib.request
import urllib.parse
import json
import time
import sys

# Supabase Management API configuration
PROJECT_ID = "pwcczlrjguvhvhnzupuv"
TOKEN = "sbp_11e858e8b4ebbdbc4648e753bde9c31a8435fe79"
BASE_URL = f"https://api.supabase.com/v1/projects/{PROJECT_ID}/database/query"

# Read the migration file
migration_file = "/home/ubuntu/dehyl/supabase/migrations/00019_expenses.sql"
try:
    with open(migration_file, 'r') as f:
        migration_sql = f.read()
except Exception as e:
    print(f"Error reading migration file: {e}")
    sys.exit(1)

# Split into individual statements (skip comments and empty lines)
statements = []
current_statement = []
for line in migration_sql.split('\n'):
    line = line.strip()
    if line and not line.startswith('--'):
        current_statement.append(line)
        if line.endswith(';'):
            statements.append(' '.join(current_statement))
            current_statement = []

print(f"Found {len(statements)} SQL statements to execute")

# Execute each statement separately to avoid Cloudflare rate limiting
for i, statement in enumerate(statements, 1):
    print(f"\nExecuting statement {i}/{len(statements)}...")
    print(f"Statement: {statement[:100]}...")
    
    # Prepare the request
    data = {
        "query": statement
    }
    
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    # Make the request
    try:
        req = urllib.request.Request(
            BASE_URL, 
            data=json.dumps(data).encode('utf-8'),
            headers=headers,
            method='POST'
        )
        
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            print(f"✓ Statement {i} executed successfully")
            
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"✗ Error executing statement {i}: {e.code} {e.reason}")
        print(f"Error details: {error_body}")
        if "already exists" not in error_body.lower():
            sys.exit(1)
    except Exception as e:
        print(f"✗ Unexpected error executing statement {i}: {e}")
        sys.exit(1)
    
    # Wait 1 second between statements to avoid rate limiting
    if i < len(statements):
        time.sleep(1)

print(f"\n✓ Migration applied successfully! All {len(statements)} statements executed.")