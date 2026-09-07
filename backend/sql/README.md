# SQL Scripts

SQL migration scripts for the Canary Evaluation Platform.

## How to Use

### Option 1: Automatic (Recommended)
```bash
cd backend
python init_db.py
```

### Option 2: Manual with psql
```bash
# Using Docker PostgreSQL
docker exec canary_postgres psql -U postgres -d canary_db -f /dev/stdin < sql/001_initial.sql

# Using local PostgreSQL
psql -U postgres -d canary_db -f sql/001_initial.sql
```

### Option 3: Using Alembic
```bash
cd backend
python -m alembic upgrade head
```

## Scripts

- `001_initial.sql` - Phase 1: Users and Google OAuth tables

## Verification

Check tables were created:
```bash
docker exec canary_postgres psql -U postgres -d canary_db -c "\dt"
```

You should see:
```
          List of relations
 Schema |       Name        | Type  | Owner
--------+-------------------+-------+-------
 public | google_identities | table | postgres
 public | users             | table | postgres
```
