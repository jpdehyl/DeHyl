#!/usr/bin/env python3
import urllib.request
import urllib.parse
import json
import sys

# Supabase Management API configuration
PROJECT_ID = "pwcczlrjguvhvhnzupuv"
TOKEN = "sbp_11e858e8b4ebbdbc4648e753bde9c31a8435fe79"
BASE_URL = f"https://api.supabase.com/v1/projects/{PROJECT_ID}/database/query"

def execute_query(query):
    data = {
        "query": query
    }
    
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    try:
        req = urllib.request.Request(
            BASE_URL, 
            data=json.dumps(data).encode('utf-8'),
            headers=headers,
            method='POST'
        )
        
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
            
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"Error: {e.code} {e.reason}")
        print(f"Details: {error_body}")
        return None
    except Exception as e:
        print(f"Unexpected error: {e}")
        return None

# Check if expenses table exists and get its structure
print("1. Checking expenses table structure...")
result = execute_query("""
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = 'expenses' 
    ORDER BY ordinal_position;
""")

if result:
    print("✓ Expenses table structure:")
    for row in result:
        # Handle both array and object responses
        if isinstance(row, dict):
            column_name = row.get('column_name')
            data_type = row.get('data_type')
            is_nullable = row.get('is_nullable')
            column_default = row.get('column_default')
        else:
            column_name = row[0] if len(row) > 0 else "unknown"
            data_type = row[1] if len(row) > 1 else "unknown"
            is_nullable = row[2] if len(row) > 2 else "unknown"
            column_default = row[3] if len(row) > 3 else None
            
        nullable = "NULL" if is_nullable == "YES" else "NOT NULL"
        default = f" DEFAULT {column_default}" if column_default else ""
        print(f"  - {column_name}: {data_type} {nullable}{default}")
else:
    print("✗ Could not fetch expenses table structure")

# Check if indexes exist
print("\n2. Checking indexes...")
result = execute_query("""
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename = 'expenses';
""")

if result:
    print("✓ Expenses table indexes:")
    for row in result:
        print(f"  - {row[0]}: {row[1]}")
else:
    print("✗ Could not fetch expenses indexes")

# Check if Shop project exists
print("\n3. Checking Shop project...")
result = execute_query("""
    SELECT id, code, client_name, description 
    FROM projects 
    WHERE code = 'SHOP';
""")

if result:
    print("✓ Shop project found:")
    for row in result:
        print(f"  - ID: {row[0]}")
        print(f"  - Code: {row[1]}")
        print(f"  - Client: {row[2]}")
        print(f"  - Description: {row[3]}")
else:
    print("✗ Shop project not found")

print("\n4. Checking if table is ready for data...")
result = execute_query("""
    INSERT INTO expenses (
        description, 
        amount, 
        expense_date, 
        category, 
        project_id
    ) VALUES (
        'Test expense', 
        100.50, 
        CURRENT_DATE, 
        'materials', 
        '8649bd23-6948-4ec6-8dc8-4c58c8a25016'
    ) RETURNING id;
""")

if result:
    expense_id = result[0][0]
    print(f"✓ Test expense created with ID: {expense_id}")
    
    # Clean up test data
    cleanup = execute_query(f"DELETE FROM expenses WHERE id = '{expense_id}';")
    if cleanup:
        print("✓ Test expense cleaned up")
else:
    print("✗ Could not create test expense")

print("\n✅ Migration verification complete!")