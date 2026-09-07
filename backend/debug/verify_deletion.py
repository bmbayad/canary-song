#!/usr/bin/env python3
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings
from app.services.r2_service import R2Service
from sqlalchemy import text
from app.db.database import SessionLocal

recording_id = "73c16c74-c260-4df6-9de0-d76f25dd1f32"

print(f"Checking status of recording: {recording_id}\n")

# Check R2
r2_service = R2Service()
response = r2_service.s3_client.list_objects_v2(Bucket=settings.r2_bucket_name)
total_objects = response.get('KeyCount', 0)
print(f"[R2] Total objects in bucket: {total_objects}")

found_in_r2 = False
if 'Contents' in response:
    for obj in response['Contents']:
        if recording_id in obj['Key']:
            print(f"  [FOUND in R2] {obj['Key']}")
            found_in_r2 = True

if not found_in_r2:
    print(f"  [NOT FOUND in R2] Recording file is gone ✓")

# Check Database
db = SessionLocal()
result = db.execute(
    text("SELECT id, storage_key, status FROM recordings WHERE id = :rid"),
    {"rid": recording_id}
)
row = result.fetchone()

print(f"\n[Database]")
if row:
    print(f"  [FOUND in DB] Recording still exists:")
    print(f"    ID: {row[0]}")
    print(f"    Storage Key: {row[1]}")
    print(f"    Status: {row[2]}")
else:
    print(f"  [NOT FOUND in DB] Recording deleted ✓")

db.close()

# Summary
print(f"\n{'='*50}")
if not found_in_r2 and not row:
    print("SUCCESS: Recording fully deleted from R2 and database ✓✓✓")
elif found_in_r2 and row:
    print("FAILURE: Recording still exists in both R2 and database")
elif found_in_r2:
    print("PARTIAL: Recording deleted from database but still in R2")
else:
    print("PARTIAL: Recording deleted from R2 but still in database")
