#!/usr/bin/env python3
"""Add password_reset_required column to users table"""
from sqlalchemy import text
from app.db.database import SessionLocal

db = SessionLocal()

try:
    # Check if column already exists
    result = db.execute(text("""
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='users' AND column_name='password_reset_required'
        )
    """))

    column_exists = result.scalar()

    if column_exists:
        print("[OK] Column 'password_reset_required' already exists")
    else:
        print("[ADD] Adding 'password_reset_required' column...")
        db.execute(text("""
            ALTER TABLE users ADD COLUMN password_reset_required BOOLEAN DEFAULT FALSE NOT NULL
        """))
        db.commit()
        print("[OK] Column added successfully!")

except Exception as e:
    print(f"[ERROR] {str(e)}")
    db.rollback()
finally:
    db.close()
