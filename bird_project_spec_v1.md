# Canary Evaluation Platform - Specification v1
**Last Updated: 2026-09-07**  
**Status: Production (Phase 8 Complete)**

This specification documents the final implemented design of the canary evaluation platform, including architecture decisions, key lessons learned, and critical design patterns that must be followed.

---

## 1. Overview & Principles

### Purpose
A web platform where canary owners (participants) create bird profiles, upload song recordings, and have certified judges evaluate those recordings using a standardized scoring system.

### Core Design Philosophy
- **Simplicity over features**: No payments, brackets, rankings, leaderboards, or AI scoring
- **Immutable audit trails**: All evaluations are historical snapshots—never deleted, never modified
- **Server-side enforcement**: All business rules live in backend; frontend is never a security boundary
- **Blind judging**: Judges see other judges' scores only AFTER submitting their own
- **Voluntary participation**: Judges pick recordings from a queue; no pre-assignments
- **Media isolation**: MP4s stored in Cloudflare R2 (not PostgreSQL); presigned URLs for secure access

### User Roles
- **Participant**: Creates birds, uploads recordings, views evaluation results
- **Judge**: Views queue, evaluates recordings by selecting them (voluntary), sees own history
- **Admin**: Manages bird types, scoring configurations, judge accounts, system settings

---

## 2. Critical Design Decisions & Lessons Learned

### 2.1 Evaluation Status Display
**Lesson Learned**: There are only TWO terminal states for recording evaluation status—*Pending Evaluation* or *Evaluated by X judges*. Never show "In Progress" at the recording level.

**Why**: Judges voluntarily pick recordings (not assigned). The system doesn't know how many will eventually evaluate each recording. Showing "In Progress" implies a fixed pool of judges and is confusing when judges are self-selected.

**Implementation**:
- Recording evaluation status = `Pending Evaluation` (no one submitted yet) or `Evaluated by X judges` (X = submitted_count + unable_count)
- Never combine counts incorrectly: `total_evaluated = submitted_count + unable_to_evaluate_count` (NOT `submitted_count + unable_count + something_else`)
- Back-end formula: `completed_count = submitted_count` (only scores), `unable_count = unable_to_evaluate_count`. Frontend sums them.

**Where displayed**: MyRecordingsPage, MyEvaluationsPage, BirdRecordingsPage, EvaluationDetailPage

### 2.2 Judge Evaluation History (Resume Pattern)
**Lesson Learned**: Judges who start but don't finish an evaluation need a way to resume. Show "In Progress" evaluations ONLY in the judge's personal evaluation history, labeled as "Resume" to indicate they can click to continue.

**Why**: Once a judge clicks "Start", an Evaluation record is created → recording disappears from queue (judge has existing evaluation). If we hide "In Progress" from history, the judge can't find/resume it anywhere.

**Implementation**:
- Judge Evaluation History shows: Completed, Unable to Evaluate, **In Progress** (labeled "Resume")
- Clicking "Resume" badge navigates back to score-entry page with the evaluation ID
- Scoring configuration must be re-fetched when resuming (not passed in URL state)
- Backend `/evaluations/{recordingId}/start` returns scoring configuration; called again when resuming to fetch config

**Key**: "In Progress" is for personal history only. Recording-level status never shows "In Progress".

### 2.3 "Unable to Evaluate" is Completion
**Lesson Learned**: When a judge marks a recording "Unable to Evaluate" (poor quality, etc.), it counts as a **completed evaluation**. It's not pending, not in-progress—it's done.

**Why**: The judge made a final decision. The recording has received an evaluation (even if not a score). It's part of the evaluation history permanently.

**Implementation**:
- `unable_to_evaluate_count` is part of total evaluated judges
- Display: "Evaluated by 1 judge" if 1 judge submitted OR 1 judge marked unable
- No separate tracking needed; it's a completed evaluation state

### 2.4 Blind Judging Enforcement
**Lesson Learned**: Blind judging (judges can't see others' scores before submitting) must be enforced server-side in the evaluation GET endpoint, not on the frontend.

**Why**: Frontend filtering is not security. The API must always return only the current judge's own evaluation, never reveal others' scores until after submission.

**Implementation**:
- `GET /evaluations/{evaluation_id}` returns full detail only if `judge_id == current_user_id`
- Evaluation scores visible only after `submitted_at` is set
- API endpoint checks authorization before any data exposure

### 2.5 Soft-Delete Pattern for Birds
**Lesson Learned**: Birds are never hard-deleted. Instead, they transition to "Archived" status to preserve audit trails of all evaluations.

**Design**:
- Bird with no recordings → can be deleted (hard delete)
- Bird with recordings → cannot be deleted; instead user must "Stop Judging" to archive it
- Archived birds appear in a separate "Archived Birds" section
- All evaluation history for archived birds remains accessible

**User Flow**:
1. Click "Delete" on bird without recordings → confirmation, permanent delete
2. Click "Stop Judging" on bird with recordings → modal explains what happens → moves to Archived section
3. Archived birds are read-only; new recordings cannot be uploaded

### 2.6 Presigned URL Security for Media
**Lesson Learned**: R2 presigned URLs expire after **1 hour**. When participants view evaluation results and the recording has expired, show a clear message: *"Recording expired - media no longer available"*

**Why**: Balances security (expiration) with UX (1 hour is enough for viewing). Media is kept for 14 days in R2, but URLs are short-lived.

**Implementation**:
- Backend generates presigned URL on-demand with `Expires-In: 3600`
- URL included in every evaluation endpoint response
- Frontend checks if URL is accessible; if 404, show "recording expired" message
- Judges always get fresh URLs when they enter score-entry page

### 2.7 Session Expiration & Token Refresh
**Lesson Learned**: JWT tokens expire. When a token expires mid-session, the frontend must automatically refresh it without user intervention.

**Implementation**:
- Response interceptor in AuthContext catches 401 errors
- Calls `POST /auth/refresh` to get a new token
- Retries the original request with new token
- If refresh fails, clear session and redirect to login
- Queue any requests that arrive during refresh, retry after getting new token

**Backend**:
- Added `POST /auth/refresh` endpoint that validates current token and issues new one
- Uses `get_current_user` dependency to validate caller still has valid JWT

### 2.8 Password Reset on First Login
**Lesson Learned**: Judges with temporary passwords must reset on first login. This is mandatory, not optional.

**Implementation**:
- Admin creates judge with temporary password "TempPassword123!"
- `POST /auth/login` succeeds, returns token with `password_reset_required: true`
- Frontend ProtectedRoute checks this flag; if true, redirects to `/reset-password`
- After reset, flag is cleared and user can proceed normally
- Uses `POST /auth/reset-password` endpoint (requires old + new password)

---

## 3. Data Model

### 3.1 Users
```
User
├── id (UUID)
├── email (unique)
├── password_hash (Argon2)
├── first_name, last_name, display_name
├── role (Participant | Judge | Admin)
├── status (Active | Inactive | Suspended)
├── password_reset_required (Boolean) ← judges on first login
├── preferred_language (en | ar | fr | es)
├── timezone, country_region, phone
├── created_at, updated_at, last_login_at
```

### 3.2 Birds
```
Bird
├── id (UUID)
├── participant_id (FK → User)
├── bird_type_id (FK → BirdType, immutable)
├── name
├── leg_band_number (unique within participant)
├── status (Active | Archived)  ← soft-delete via archive
├── created_at, updated_at
```

### 3.3 Recordings
```
Recording
├── id (UUID)
├── bird_id (FK → Bird)
├── bird_type_id (FK → BirdType, denormalized)
├── storage_key (path in R2)
├── original_filename
├── file_size, duration, media_type
├── status (Completed | Pending)
├── uploaded_at, expires_at
```

### 3.4 Evaluations
```
Evaluation
├── id (UUID)
├── recording_id (FK → Recording)
├── judge_id (FK → User)
├── status (In Progress | Submitted | Unable to Evaluate)
├── total_score (int, null until submitted)
├── comments (text, optional)
├── unable_to_evaluate_reason (text, only if status=Unable)
├── started_at, submitted_at
```

### 3.5 Evaluation Scores (Immutable Snapshots)
```
EvaluationScore
├── id (UUID)
├── evaluation_id (FK → Evaluation)
├── category_id (FK → ScoringCategory)
├── score (int)
├── category_name_snapshot (text) ← frozen at submission time
├── minimum_points_snapshot, maximum_points_snapshot (int)
```

**Key**: Snapshots store the category definition (name, min/max) at submission time. If scoring categories change later, old evaluations remain valid with their historical snapshot data.

### 3.6 Scoring Configuration
```
ScoringConfiguration
├── id (UUID)
├── name (e.g., "Standard Canary Scoring")
├── description
├── created_at

ScoringCategory
├── id (UUID)
├── scoring_configuration_id (FK)
├── name (e.g., "Melody Quality")
├── description
├── minimum_points (int, typically 1)
├── maximum_points (int, typically 10)
├── display_order (int)
```

---

## 4. API Endpoints (Critical Behavior)

### 4.1 Authentication
- `POST /auth/register` → TokenResponse (email + password)
- `POST /auth/login` → TokenResponse + user with `password_reset_required` flag
- `POST /auth/google` → TokenResponse (Google OAuth via id_token)
- `GET /auth/me` → UserResponse (get current user, used by refresh mechanism)
- `POST /auth/reset-password` → UserResponse (old_password + new_password, clears flag)
- `POST /auth/refresh` → TokenResponse (refresh expired JWT)

### 4.2 Judge Queue (Voluntary Selection)
- `GET /evaluations/queue` → List of available recordings for this judge
  - Filters: status = Completed, not expired, judge has no existing evaluation
  - Returns: recording details + presigned video URL
  - **Never** returns recordings this judge already evaluated

### 4.3 Evaluation Lifecycle
- `POST /evaluations/{recordingId}/start` → StartEvaluationResponse (creates Evaluation record + returns scoring config)
- `POST /evaluations/{evaluationId}/submit` → success (sets status=Submitted, records scores)
- `POST /evaluations/{evaluationId}/unable-to-evaluate` → success (sets status=Unable, records reason)

### 4.4 Evaluation Results
- `GET /evaluations/results` → List all evaluation summaries for participant/judge
  - Participant sees: all their recordings with evaluation counts + average scores
  - Judge sees: all recordings they've evaluated
- `GET /evaluations/recordings/{recordingId}/results` → Participant sees detailed evaluation results for one recording
  - Returns: all judge evaluations (blind: individual scores hidden until participant submitted, aggregate score visible)
  - Includes presigned video URL

### 4.5 Judge Evaluation History
- `GET /evaluations` → Judge's own evaluation history
  - Shows: Submitted, Unable to Evaluate, In Progress
  - In Progress entries are clickable to resume

---

## 5. Frontend Architecture

### 5.1 Authentication Flow
1. User logs in → receives JWT token + user object (with `password_reset_required` flag)
2. Token stored in localStorage
3. Every API request includes token in `Authorization: Bearer` header (request interceptor)
4. On 401 response → interceptor calls `/auth/refresh` → retries request with new token
5. If refresh fails → clear token + redirect to login

### 5.2 Protected Routes
- All routes except `/login` and `/register` require ProtectedRoute wrapper
- ProtectedRoute checks:
  1. Is user authenticated (has token)?
  2. If `password_reset_required: true` → redirect to `/reset-password` (mandatory first login reset)
  3. Otherwise, allow access

### 5.3 View Toggle Pattern (Card/List)
Applied consistently across: My Birds, My Recordings

- Card view: Grid layout, full details, visual hierarchy
- List view: Compact single-row per item, less visual clutter
- Toggle buttons in header; toggle state persists in component
- All functionality identical in both views (no data loss)

### 5.4 Search/Filter
Applied consistently across: My Recordings

- Real-time search as user types
- Filters by: bird name, band number, file name (case-insensitive)
- Results grouped by bird (maintains hierarchy)

### 5.5 Sticky Video Player
Score entry page with video playback:
- 2-column layout: 80% recording info left, 20% video + actions right
- Video player sticky-positioned (stays visible while scrolling form)
- Full-screen not needed; inline viewing sufficient

---

## 6. Backend Architecture

### 6.1 Database
- **PostgreSQL** (single instance, not replicated)
- Migrations via Alembic
- All tables have created_at, updated_at timestamps
- Foreign keys with ON DELETE CASCADE where appropriate (e.g., bird → recordings)

### 6.2 Media Storage
- **Cloudflare R2** for MP4 video files
- One file per recording (original upload only, no transcoding)
- Presigned download URLs generated on-demand (1-hour expiry)
- Cleanup job: delete expired files after 14-day retention period
- Deletion verified by checking 404 responses (not exception-based)

### 6.3 Authentication & Security
- JWT tokens issued on login/register
- Token payload: `sub` = user_id
- Token validation via `get_current_user` dependency (used on all protected endpoints)
- Password hashing: Argon2 (via passlib)
- Role-based access control: all endpoints check `current_user.role` server-side

### 6.4 Error Handling
- All business logic errors raise HTTPException with 400/401/403/404 status + detail message
- No bare exceptions; always return structured error responses
- Client interprets detail message and displays to user

### 6.5 Scoring Configuration Snapshots
- When judge submits evaluation, each score includes frozen snapshots:
  - category_name_snapshot
  - minimum/maximum_points_snapshot
- If admin changes category definitions later, historical evaluations remain valid
- New evaluations use new configuration

---

## 7. Deployment & Operations

### 7.1 Environment Setup
```
.env (backend):
DATABASE_URL=postgresql://...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
```

### 7.2 Database Migrations
```bash
cd backend
alembic upgrade head  # Run all pending migrations
```

### 7.3 Initial Data
```bash
python scripts/init_db.py  # Create default bird types, admin account
```

### 7.4 Scheduled Tasks
- APScheduler runs cleanup job every 24 hours
- Deletes recordings past retention window (14 days)
- Verifies deletion in R2 before marking as deleted

---

## 8. Testing & Validation

### 8.1 Manual Testing Checklist
Before shipping:
- [ ] Judge can pick recording from queue, evaluate, submit/unable
- [ ] Judge can resume unfinished evaluation from history
- [ ] Participant sees "Evaluated by X judges" (correct count)
- [ ] Participant can view evaluation results with video
- [ ] Bird archive workflow: has recordings → "Stop Judging" → moves to Archived
- [ ] Bird delete: no recordings → Delete button works
- [ ] Token refresh works: leave session 30min, return, page still loads
- [ ] Password reset: judge gets temp password, forced reset on first login
- [ ] Video expires after 14 days: "Recording expired" message shown

### 8.2 Known Issues Fixed in v1
1. ✅ Token expiration → fixed with refresh interceptor
2. ✅ Double-counted "Unable" evaluations → fixed formula: `completed_count = submitted_count`
3. ✅ "In Progress" confusing at recording level → only show in judge history
4. ✅ Recording stuck on "Loading config" when resuming → fetch scoring config on-demand
5. ✅ Bird deletion not preserving history → soft-delete via archive
6. ✅ R2 file deletion appearing to fail → fixed 404 handling in object_exists()

---

## 9. Known Limitations & Future Considerations

### 9.1 Current Limitations
- No real-time notifications (judges don't know when their evaluation is being reviewed)
- No bulk operations (upload multiple recordings at once)
- Scoring configuration is global (can't have per-bird-type customization yet)
- No evaluation reassignment (once a judge starts, they're the only evaluator for that record)

### 9.2 Potential Improvements (Future)
- Webhook notifications when evaluation complete
- Batch recording upload
- Per-judge "assignments" if business rules change
- Export evaluation results (CSV/PDF)
- Audio playback in browser (MP3 uploads)

---

## 10. Troubleshooting Guide

### Q: Judge can't find a recording they started but didn't finish
**A**: Check Judge Evaluation History. It's listed with "Resume" badge. Click to continue.

### Q: Evaluation count shows "2" but only 1 judge evaluated
**A**: Likely counting error. Verify backend formula: `completed_count = submitted_count` (NOT `submitted + unable`). If using old code, fix backend.

### Q: Judge sees "Invalid authentication credentials" after leaving site
**A**: Token expired. The app should auto-refresh. If error persists, clear localStorage and re-login.

### Q: Participant can't view recording on results page
**A**: Recording expired (14 days passed). Show "Recording expired - media no longer available" message. No fix needed; working as designed.

### Q: Bird can't be deleted
**A**: Bird has recordings. Click "Stop Judging" (Archive) instead. Hard-delete only works for birds with zero recordings.

---

## 11. Code Structure

### Backend (`backend/app/`)
```
api/routes/
├── auth.py          # Login, register, token refresh, password reset
├── birds.py         # CRUD birds, archive endpoint
├── evaluations.py   # Queue, start, submit, results endpoints
├── admin.py         # Admin: manage judges, bird types, scoring

services/
├── user_service.py
├── bird_service.py
├── evaluation_service.py
├── scoring_service.py
├── r2_service.py    # Presigned URLs, R2 operations
├── recording_service.py
├── admin_service.py

models/
├── user.py
├── bird.py
├── recording.py
├── evaluation.py
├── scoring.py

schemas/
├── user.py
├── bird.py
├── evaluation.py
├── scoring.py

core/
├── security.py      # Argon2 hashing, JWT creation
├── deps.py          # Dependency injection (get_current_user, get_db)

db/
├── database.py      # SQLAlchemy engine, session factory
```

### Frontend (`frontend/src/`)
```
context/
├── AuthContext.tsx  # User state, JWT token, API client, refresh logic

pages/
├── LoginPage.tsx
├── RegisterPage.tsx
├── ResetPasswordPage.tsx
├── DashboardPage.tsx
├── MyBirdsPage.tsx            # Card/List view toggle
├── MyRecordingsPage.tsx         # Card/List view, search filter
├── MyEvaluationsPage.tsx
├── JudgeQueuePage.tsx
├── ScoreEntryPage.tsx           # Video + scoring, resume logic
├── JudgeEvaluationHistoryPage.tsx
├── AdminJudgesPage.tsx

App.tsx             # Routes, ProtectedRoute, password_reset_required check
```

---

## 12. Glossary

- **Blind Judging**: Judges can't see other judges' scores until they submit their own
- **Presigned URL**: Temporary download URL from R2 that expires (1 hour default)
- **Soft Delete**: Mark as archived instead of deleting (preserve history)
- **Snapshot**: Frozen copy of scoring category definition at evaluation submission time
- **Resume**: Continue an in-progress evaluation from where judge left off
- **Unable to Evaluate**: Judge marks recording unsuitable (poor quality) instead of scoring it
- **Token Refresh**: Automatically get a new JWT when current one expires

---

## 13. Version History

| Version | Date       | Status      | Key Changes |
|---------|------------|-------------|-------------|
| v1      | 2026-09-07 | Production  | Initial comprehensive spec from Phase 8 implementation |

---

**Last Reviewed**: 2026-09-07  
**Author**: Based on Phase 8 implementation  
**Next Review**: When major architecture changes occur
