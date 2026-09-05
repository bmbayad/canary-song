### System Architecture Specification: Canary Evaluation Platform

### 1. System Overview & Technology Stack

* **Frontend:** React with TypeScript.
* **Backend:** FastAPI (Python).
* **Database:** PostgreSQL (for relational data).
* **Storage:** Cloudflare R2 (for media file storage).

### 2. Infrastructure & Deployment

* **React Frontend:** Deployed as a static site on **Render**.
* **FastAPI Backend:** Deployed as a web service on **Render**.
* **Database & Storage:** Hosted PostgreSQL instance and a Cloudflare R2 bucket.
* **Configuration:** All secrets, credentials, and connection strings must be managed strictly via **environment variables**.

### 3. Core Architectural Rules

* **Server-Side Enforcement:** All business rules, authentication, and role-based permissions must be validated and enforced on the backend server, never trusted blindly from the client.
* **Media Separation:** Never store media blobs directly in PostgreSQL. Route files to Cloudflare R2 and store only the reference URLs in the database.
* **Evaluation Integrity:** 

  * Prevent duplicate evaluations (one evaluation per recording, per judge).
  * Enforce **blind judging**: a judge cannot view scores from other judges for a recording until their own evaluation for that recording is submitted.
  * Preserved History: If an administrator modifies scoring categories or point limits, historical evaluation scores must remain unchanged.

### 4. Media Retention System

* **Timeline:** Default **14-day retention** period.
* **Configuration:** Retention window must be globally configurable via admin settings.
* **Lifecycle:** 

  * Frontend must calculate and display a visible countdown timer for expiring media.
  * An automated background worker must handle deletion.
  * **Important:** Deleting expired media files from R2 must **not** delete the written evaluation text or numerical score history from PostgreSQL.

### 5. Role-Based Navigation & UI Mapping

### Participant Flow

* **Navigation:** Straightforward, tab-based navigation.
* **Mapped Screens:** 

  * **Dashboard / My Birds:** CRUD operations for bird profiles.
  * **Upload Recording:** Direct multi-part upload interface tied to a specific bird ID.
  * **My Evaluations:** List view parsing recording status codes, expiration countdowns, and individual judge score summaries.

### Judge Flow

* **Navigation:** Unified queue access with clear status filtering.
* **Mapped Screens:** 

  * **Judging Queue:** Reads from a shared pool of available recordings (no explicit assignments).
  * **Score Entry Screen:** Features a built-in media player, dynamic scoring input fields mapped to active categories, and a blocking text area requirement if the "Unable to Evaluate" flag is checked.

### Administrator Flow

* **Navigation:** Restrictive route guards blocking non-admin tokens.
* **Mapped Screens:** Judge account creation, scoring schema tables (name and range bounds), and retention timeline inputs.

### 6. Relational Data Model

The database schema must support the following primary entities and relationships: 

* **Users:** Credentials, roles (Participant, Judge, Administrator), and notification preferences.
* **Birds:** Belongs to a Participant; stores identification metadata (band/cage numbers).
* **Recordings:** Belongs to a Bird; tracks the R2 object key, upload timestamp, and status.
* **Scoring Categories:** Global configurations specifying category names and minimum/maximum point scales.
* **Judge Evaluations:** Relates a Judge to a Recording; contains raw scores matching the category snapshot, text comments, or "Unable to Evaluate" error flags.
* **Admin Settings:** Key-value system configurations, primarily holding the active retention window length.

### 7. API Design Blueprint

A RESTful API utilizing JSON payloads for all requests and responses. Every endpoint must implement strict validation, standard HTTP status codes, error messaging, and authorization checks: 

* /api/auth/* — User registration, login, and token generation.
* /api/birds/* — Participant-owned CRUD actions for bird profiles.
* /api/recordings/* — Upload handlers, countdown metadata, and media access wrappers.
* /api/queue/* — Shared, unassigned listings optimized for Judge role queries.
* /api/evaluations/* — Blind entry posting, validation loops, and status transition workflows.
* /api/admin/* — Configuration updates, judge provisioning, and scoring system alterations.