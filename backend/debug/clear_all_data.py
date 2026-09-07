#!/usr/bin/env python3
"""Clear all recordings, evaluations, and R2 data"""
import sys
from pathlib import Path

# Add backend directory to path so we can import app
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.db.database import SessionLocal
from app.core.config import settings
from app.services.r2_service import R2Service

db = SessionLocal()
r2_service = R2Service()

try:
    print("="*50)
    print("CLEARING DATABASE AND R2 DATA")
    print("="*50)

    # Database cleanup
    print("\n[DB] Clearing evaluation scores...")
    db.execute(text("DELETE FROM evaluation_scores"))
    print("[DB] Cleared evaluation scores")

    print("[DB] Clearing evaluations...")
    db.execute(text("DELETE FROM evaluations"))
    print("[DB] Cleared evaluations")

    print("[DB] Clearing recordings...")
    db.execute(text("DELETE FROM recordings"))
    print("[DB] Cleared recordings")

    print("[DB] Clearing birds...")
    db.execute(text("DELETE FROM birds"))
    db.commit()
    print("[DB] Cleared birds")

    # R2 cleanup
    print("\n[R2] Clearing all objects from bucket...")
    response = r2_service.s3_client.list_objects_v2(Bucket=settings.r2_bucket_name)

    if 'Contents' in response:
        deleted_count = 0
        for obj in response['Contents']:
            r2_service.s3_client.delete_object(Bucket=settings.r2_bucket_name, Key=obj['Key'])
            deleted_count += 1
            print(f"[R2] Deleted: {obj['Key']}")
        print(f"[R2] Deleted {deleted_count} objects from R2")
    else:
        print("[R2] R2 bucket is already empty")

    print("\n" + "="*50)
    print("SUCCESS: All data cleared!")
    print("="*50)

except Exception as e:
    print(f"\n[ERROR] {str(e)}")
    db.rollback()
    import traceback
    traceback.print_exc()
finally:
    db.close()
