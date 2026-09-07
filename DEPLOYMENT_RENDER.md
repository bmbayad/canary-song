# Canary Evaluation Platform - Render Deployment Guide

**Platform**: Render (render.com)  
**Status**: Step-by-step deployment walkthrough  
**Last Updated**: 2026-09-07

This guide covers deploying the complete canary evaluation platform to Render, including:
- PostgreSQL database
- FastAPI backend web service
- React frontend web service
- Environment configuration
- Database migrations
- Verification & troubleshooting

---

## Prerequisites

Before starting, ensure you have:
- ✅ Render account (render.com) - create at https://render.com
- ✅ GitHub account with this repo pushed
- ✅ Cloudflare R2 account with bucket and API keys
- ✅ Git installed locally
- ✅ Code committed and pushed to main branch

---

## Phase 1: Create PostgreSQL Database on Render

### Step 1.1: Create PostgreSQL Instance

1. Log into [render.com](https://render.com)
2. Click **"New +"** → Select **"PostgreSQL"**
3. Fill in the form:
   - **Name**: `canary-evaluation-db`
   - **Database**: `canary_db`
   - **User**: `canary_user`
   - **Region**: Choose closest to your location (e.g., `us-east`)
   - **PostgreSQL Version**: `15` (latest stable)
   - **Plan**: `Standard` (for production) or `Free` (for testing - limited)

4. Click **"Create Database"**
5. **Wait 2-3 minutes** for database to be created

### Step 1.2: Copy Database Connection Details

Once created, Render shows:
- **Host**: `dpg-xxxxx-a.oregon-postgres.render.com`
- **Port**: `5432`
- **Database**: `canary_db`
- **User**: `canary_user`
- **Password**: `[shown once, copy it now]`

**Save these credentials** - you'll need them for backend environment variables.

### Step 1.3: Create Connection String

Combine the credentials into a single `DATABASE_URL`:

```
postgresql://canary_user:[PASSWORD]@dpg-xxxxx-a.oregon-postgres.render.com:5432/canary_db
```

Replace `[PASSWORD]` with the actual password shown by Render.

**Keep this string safe** - it will be added as an environment variable.

---

## Phase 2: Deploy Backend Web Service

### Step 2.1: Prepare Backend Code

Before deploying, your backend needs:

#### 2.1a: Create `render.yaml` (optional but recommended)

In the repo root, create a file named `render.yaml`:

```yaml
# This helps Render auto-detect configuration
# But we'll configure manually for more control

services:
  - type: web
    name: canary-backend
    env: python
    plan: standard
    buildCommand: cd backend && pip install -r requirements.txt
    startCommand: cd backend && gunicorn main:app
```

#### 2.1b: Create `runtime.txt` in `backend/`

```
python-3.11.6
```

This tells Render which Python version to use.

#### 2.1c: Verify `requirements.txt` exists

In `backend/`, ensure `requirements.txt` has all dependencies:

```
fastapi
uvicorn
sqlalchemy
alembic
psycopg2-binary
python-multipart
google-auth-oauthlib
google-auth-httplib2
google-api-python-client
boto3
python-jose
passlib
bcrypt
python-dotenv
apscheduler
```

### Step 2.2: Create Backend Web Service on Render

1. Click **"New +"** → Select **"Web Service"**
2. Connect your GitHub repo:
   - Click **"Connect GitHub"**
   - Select **this repository** (`canary-song`)
   - Click **"Connect"**

3. Fill in the form:
   - **Name**: `canary-backend`
   - **Environment**: `Python 3`
   - **Region**: Same as database (`us-east`)
   - **Branch**: `main`
   - **Build Command**: `cd backend && pip install -r requirements.txt && alembic upgrade head`
   - **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Standard` (for production)

4. Click **"Advanced"** and scroll to **"Environment"**
5. Add the following environment variables:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | `postgresql://canary_user:[PASSWORD]@dpg-xxxxx...` |
   | `SECRET_KEY` | Generate random string (e.g., `openssl rand -hex 32`) |
   | `ALGORITHM` | `HS256` |
   | `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` |
   | `R2_ACCESS_KEY_ID` | Your Cloudflare R2 API key |
   | `R2_SECRET_ACCESS_KEY` | Your Cloudflare R2 API secret |
   | `R2_BUCKET_NAME` | `canary-recordings` |
   | `R2_ENDPOINT_URL` | `https://[account-id].r2.cloudflarestorage.com` |
   | `GOOGLE_OAUTH_CLIENT_ID` | Your Google OAuth client ID |
   | `GOOGLE_OAUTH_CLIENT_SECRET` | Your Google OAuth client secret |
   | `ENVIRONMENT` | `production` |

6. Click **"Create Web Service"**

### Step 2.3: Monitor Backend Deployment

1. Render automatically builds and deploys
2. Click on the service → view **"Logs"** tab
3. Watch for:
   - Build progress (`pip install`, `alembic upgrade`)
   - `WARNING: deployment...` messages (normal)
   - **Success message**: `Uvicorn running on 0.0.0.0:PORT`

4. Once deployed, Render shows your backend URL: `https://canary-backend.onrender.com`

### Step 2.4: Test Backend

```bash
curl https://canary-backend.onrender.com/auth/me
# Should return 401 (unauthorized) - this is expected, means backend is running
```

If you get a 500 error, check the logs for database connection issues or missing environment variables.

---

## Phase 3: Deploy Frontend Web Service

### Step 3.1: Prepare Backend CORS Configuration

**CRITICAL**: The backend currently has CORS hardcoded to localhost. Before deploying the frontend, update it for Render URLs.

#### 3.1a: Update Backend CORS

Edit `backend/app/main.py`:

```python
# BEFORE (localhost only)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# AFTER (localhost + Render production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Local development
        "http://localhost:3001",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3001",
        # Production on Render
        "https://canary-frontend.onrender.com",  # Update with your actual frontend URL
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
```

**Replace** `canary-frontend.onrender.com` with your actual Render frontend URL (from Step 3.2).

#### 3.1b: Commit CORS Update

```bash
git add backend/app/main.py
git commit -m "chore: add Render frontend URL to CORS allow_origins"
git push origin main
```

### Step 3.2: Prepare Frontend Code

#### 3.1a: Update API URL

In `frontend/src/context/AuthContext.tsx`, update the API_URL:

```typescript
// BEFORE (local development)
const API_URL = 'http://localhost:8000'

// AFTER (production Render)
const API_URL = 'https://canary-backend.onrender.com'
```

#### 3.1b: Create `render.yaml` for Frontend

In the repo root (if you haven't already), add frontend section:

```yaml
services:
  - type: web
    name: canary-frontend
    env: node
    buildCommand: cd frontend && npm install && npm run build
    startCommand: npm run preview
    staticSite: true
    buildDir: frontend/dist
```

#### 3.1c: Commit Changes

```bash
git add frontend/src/context/AuthContext.tsx
git commit -m "chore: update API URL for Render deployment"
git push origin main
```

### Step 3.2: Create Frontend Web Service on Render

1. Click **"New +"** → Select **"Static Site"** (for React)
2. Connect your GitHub repo (already connected)
3. Fill in the form:
   - **Name**: `canary-frontend`
   - **Environment**: `Node`
   - **Region**: Same as backend
   - **Branch**: `main`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/dist`

4. Click **"Create Static Site"**

### Step 3.3: Monitor Frontend Deployment

1. Frontend doesn't need environment variables (API URL is baked into build)
2. Check **"Logs"** for build progress
3. Once deployed, Render shows: `https://canary-frontend.onrender.com`

---

## Phase 4: Initialize Database

### Step 4.1: Run Migrations

Migrations run automatically during backend deployment (in the Build Command), but verify:

1. Log into backend service on Render
2. Go to **"Shell"** tab (if available in your plan)
3. Run:

```bash
cd backend && alembic upgrade head
```

If no shell access, migrations already ran during `docker build`.

### Step 4.2: Initialize Default Data

The backend has an `init_db.py` script that creates:
- Default bird types
- Admin account (optional)

If using the shell:

```bash
cd backend && python scripts/init_db.py
```

If no shell access, you'll need to:
- Create a one-time backend container to run init, then delete it
- OR manually create bird types in PostgreSQL (advanced)

---

## Phase 5: Configure Custom Domain (Optional)

### Step 5.1: Add Custom Domain

1. Go to backend service → **"Settings"** tab
2. Scroll to **"Custom Domain"**
3. Enter your domain (e.g., `api.canary-eval.com`)
4. Add DNS CNAME record to your DNS provider pointing to Render

Repeat for frontend with domain like `canary-eval.com`

---

## Phase 6: Set Up SSL/HTTPS (Automatic)

Render automatically provides SSL certificates. No action needed.

Verify:
```bash
curl -I https://canary-backend.onrender.com
# Should show SSL certificate info
```

---

## Phase 7: Verification Checklist

### 7.1: Backend Health Check

```bash
curl -X GET https://canary-backend.onrender.com/auth/me
# Expected: 401 Unauthorized (token required)

curl -X POST https://canary-backend.onrender.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'
# Expected: 201 Created (with token)
```

### 7.2: Frontend Connectivity

1. Open `https://canary-frontend.onrender.com` in browser
2. Try to register/login
3. Should connect to backend successfully
4. If not, check:
   - API_URL is correct in `AuthContext.tsx`
   - CORS is enabled on backend (FastAPI should have default CORS)
   - Backend is running

### 7.3: Database Connectivity

From Render backend shell:
```bash
cd backend && python -c "from app.db.database import engine; engine.connect(); print('DB OK')"
```

Expected: `DB OK`

### 7.4: R2 Connectivity

Upload a test file to R2:
```bash
cd backend && python -c "
from app.services.r2_service import R2Service
r2 = R2Service()
r2.upload_file(b'test', 'test.txt')
print('R2 OK')
"
```

Expected: `R2 OK`

---

## Phase 8: Monitoring & Logs

### 8.1: Access Logs

- **Backend Logs**: Service → "Logs" tab
- **Database Logs**: Database → "Events" tab
- **Frontend Build Logs**: Service → "Logs" tab

### 8.2: Enable Health Checks (Optional)

Render can auto-restart services if they crash:

1. Backend service → "Settings"
2. Scroll to "Health Check URL"
3. Enter: `/auth/me`
4. Render will periodically check the backend is alive

---

## Phase 9: Troubleshooting

### Issue: Backend shows 500 error

**Likely causes**:
- Database not connected (check `DATABASE_URL`)
- Migrations failed
- Missing environment variables

**Fix**:
1. Check backend logs: "Something went wrong"
2. Verify all env vars are set (Section 2.2)
3. Manually run migrations in backend shell

### Issue: Frontend can't connect to backend

**Likely causes**:
- API_URL wrong in AuthContext
- **CORS not configured for Render URLs** ← Most common!
- Backend not responding

**Fix**:
1. **Check CORS configuration** (most likely cause):
   - Verify `backend/app/main.py` has your Render frontend URL in `allow_origins`
   - Example: `https://canary-frontend.onrender.com`
   - If missing, update it, commit, and re-deploy backend

2. Verify API_URL in `AuthContext.tsx` points to correct backend
3. Check if `curl https://[backend-url]/auth/me` works from terminal
4. Check backend logs for CORS errors (should show 401 if working)

### Issue: Database won't connect

**Likely causes**:
- `DATABASE_URL` format wrong
- Network security group not allowing connections
- Database not created yet

**Fix**:
1. Copy-paste `DATABASE_URL` exactly as shown by Render
2. Ensure password doesn't contain special characters (if it does, URL-encode it)
3. Wait 2-3 minutes for database to fully initialize

### Issue: R2 credentials not working

**Likely causes**:
- API keys expired
- Wrong bucket name
- Wrong endpoint URL

**Fix**:
1. Generate new R2 API token from Cloudflare dashboard
2. Verify bucket name matches environment variable
3. Check R2 endpoint URL format: `https://[account-id].r2.cloudflarestorage.com`

---

## Phase 10: Post-Deployment Checklist

- [ ] Backend service is running (green checkmark on Render)
- [ ] Frontend service is running
- [ ] Database is created and migrations ran
- [ ] Can register a new user
- [ ] Can log in with credentials
- [ ] Can upload a bird
- [ ] Can upload a recording (video to R2)
- [ ] Video plays on evaluation page
- [ ] Admin can create judges
- [ ] Judge can log in and see queue
- [ ] Judge can evaluate a recording
- [ ] Participant can view results

---

## Phase 11: Environment Variables Reference

### Backend Environment Variables

```
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Authentication
SECRET_KEY=<random-32-char-hex>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Cloudflare R2
R2_ACCESS_KEY_ID=<your-r2-key>
R2_SECRET_ACCESS_KEY=<your-r2-secret>
R2_BUCKET_NAME=canary-recordings
R2_ENDPOINT_URL=https://[account-id].r2.cloudflarestorage.com

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=<your-oauth-client-id>
GOOGLE_OAUTH_CLIENT_SECRET=<your-oauth-client-secret>

# Deployment
ENVIRONMENT=production
```

### Frontend Environment Variables

Frontend build-time only (no runtime env vars):
- API URL baked into `AuthContext.tsx` at build time

---

## Phase 12: Scaling & Performance

### Database
- **Free tier**: 1 GB storage, limited connections
- **Standard**: Production-grade, auto-backups
- Upgrade anytime in Render dashboard

### Backend
- **Free tier**: Auto-sleeps after 15 min inactivity
- **Standard**: Always on, 750 hours/month included
- Upgrade to Standard for production

### Frontend
- Static site hosting: Always fast, CDN included
- No scaling needed (static content)

---

## Phase 13: Backup & Recovery

### Database Backups

Render provides automatic daily backups (Standard plan):

1. Database → "Settings"
2. Scroll to "Backups"
3. View backup history
4. Can restore from any backup

### Code Backup

Your GitHub repo IS your backup:
- Every deployment is tied to a git commit
- Roll back by re-deploying an older commit
- Render has no deletion history; GitHub does

---

## Phase 14: Production Hardening (After Deployment)

Once deployed and working:

### 14.1: Enable HTTPS Only
- Render does this automatically
- All traffic is HTTPS

### 14.2: Set Strong Secrets
- Replace `SECRET_KEY` with strong value
- Rotate R2 API keys periodically

### 14.3: Monitor Error Logs
- Set up alerts in Render dashboard
- Check logs daily for errors

### 14.4: Set Up Log Retention
- Render keeps 30 days of logs (Standard plan)
- Export important logs elsewhere if needed

### 14.5: Regular Database Backups
- Render auto-backups daily
- Test restore procedure monthly

---

## Quick Reference: Service URLs

| Service | URL | Status |
|---------|-----|--------|
| Backend API | `https://canary-backend.onrender.com` | Check `/auth/me` |
| Frontend | `https://canary-frontend.onrender.com` | Open in browser |
| Database | Render Dashboard | Check "Events" |

---

## Support & Additional Resources

- **Render Docs**: https://render.com/docs
- **Render Support**: https://support.render.com
- **FastAPI Docs**: https://fastapi.tiangolo.com/deployment/concepts/
- **React Build**: https://vitejs.dev/guide/build.html

---

## Version History

| Version | Date       | Changes |
|---------|------------|---------|
| 1.0     | 2026-09-07 | Initial deployment guide |

---

**Questions?** Check the troubleshooting section or review your Render dashboard logs.
