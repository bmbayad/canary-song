# Backend Setup Guide

## Quick Start

### 1. Start PostgreSQL
```bash
docker-compose up -d postgres
```

### 2. Create Python Environment
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure Environment
```bash
cp .env.example .env
```

### 4. Initialize Database
```bash
python init_db.py
```

You should see:
```
🔄 Initializing database...
✅ Database initialized successfully!

Tables created:
  - users
  - google_identities

You can now start the backend:
  uvicorn app.main:app --reload --port 8000
```

### 5. Start Backend
```bash
uvicorn app.main:app --reload --port 8000
```

API available at: http://localhost:8000
API Docs at: http://localhost:8000/docs

---

## Testing

### Run Tests
```bash
pytest tests/test_auth.py -v
```

### Test API Endpoints
1. Visit http://localhost:8000/docs
2. Try POST /auth/register
3. Try POST /auth/login
4. Try GET /auth/me (with Bearer token)

---

## Troubleshooting

**"relation 'users' does not exist"**
- Run: `python init_db.py`

**"Cannot connect to postgres"**
- Check: `docker-compose ps`
- Restart: `docker-compose down && docker-compose up -d postgres`

**Port 8000 already in use**
- Use different port: `uvicorn app.main:app --reload --port 8001`

---

## Database

- Tables created by: `init_db.py` (uses SQLAlchemy models)
- No manual SQL needed
- Migrations available in: `migrations/versions/`

For advanced migrations:
```bash
alembic upgrade head     # Apply migrations
alembic revision --autogenerate -m "Description"  # Create new migration
alembic downgrade -1     # Rollback last migration
```
