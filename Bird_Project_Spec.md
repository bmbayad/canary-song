### Project Specification: Canary Evaluation Platform

### Overview & Scope

* **Purpose:** A simple platform where canary owners upload song recordings and certified judges evaluate them using a configurable scoring system.

* **Non-Goals:** 
  * No payment processing.
  * No competition brackets or rankings.
  * No AI scoring.

* **Core Principles:** 
  * Keep it simple and maintainable.
  * Preserve historical evaluations.
  * Enforce rules server-side.
  * Store media separately, defaulting to a 14-day retention period.

### User Roles
* **Participants:** Register, add birds, upload MP3 or MP4 recordings, and view evaluations.
* **Judges:** Created by admins, pull recordings from a queue, evaluate them, and submit scores/comments.
* **Admin:** Manages judges, scoring categories, and retention settings only. There are no manual judge assignments; judges independently choose work from the queue.

### User Screens & Interfaces

### Participant Screens

* **Dashboard:** Contains tabs for navigating the platform features.
* **My Birds:** Add and edit bird profiles.
* **Upload Recordings:** Upload audio/video files assigned to a specific bird.
* **My Evaluations:**
  * List of recordings with their current status (*Pending*, *In Progress*, *Completed*, *Unable to Evaluate*).
  * Countdown timer until media expiration.
  * Detail view showing individual judge scores and comments.
  * Simple comparison view.
* **Profile:** Manage email and notification preferences.

### Judge Screens

* **Judging Queue:** Shows recordings with filters (*Available*, *In Progress*, *Evaluated by You*). Each item card shows bird info, band/cage number, media type, and time remaining.
* **Score Entry Screen:** Features an integrated media player, a configurable score sheet with auto-calculation, a comments section, and buttons to *Submit* or *Save and Resume*. Includes an "Unable to Evaluate" option requiring a specified reason.

### Admin Screens

* **Manage Judges:** Create and manage judge accounts.
* **Manage Scoring Categories:** Configure category names and point ranges.
* **Set Retention Period:** Configure the automated cleanup timeline.

### Technical Architecture & Constraints

* **Frontend:** React with TypeScript.
* **Backend:** FastAPI.
* **Database:** PostgreSQL.
* **Storage:** Cloudflare R2 for separate media storage.
* **API:** RESTful API architecture.
* **Authorization:** Server-side role-based access control (RBAC).
* **Explicit Constraints:** Absolutely no payments, no rankings, and no AI services.

### Core Workflows

1. **Participant Workflow:** 
Adds a bird → Uploads a recording → Monitors evaluation status → Views final results.
2. **Judge Workflow:** 
Pulls a recording from the queue → Evaluates the audio/video → Adds comments → Submits scores (or marks as *Unable to Evaluate*).
3. **Admin Workflow:** 
Manages judges, customizes scoring categories, and adjusts retention limits.

### Data & Architecture Rules

* **Media Storage:** Do not store media blobs in PostgreSQL; route all media files to Cloudflare R2.
* **Blind Judging:** Do not expose other judges' scores to a judge before they submit their own evaluation.
* **No Duplicates:** Prevent duplicate evaluations for the same recording by the same judge.
* **Data Integrity:** Preserve historical scores exactly as submitted, even if an admin changes the scoring categories or point ranges later.
* **Media Retention:** Default 14-day retention period (configurable) backed by a countdown and automatic deletion task.
* **Database Design:** Keep database relationships straightforward and enforce all business rules strictly on the backend.
* **Focus:** Build a small, reliable evaluation platform, not a generalized competition system.

### Implementation Plan

* **Phase 1:** Project scaffolding, authentication, and role models.
* **Phase 2:** Birds management and participant UI components.
* **Phase 3:** Recording upload integration with Cloudflare R2.
* **Phase 4:** Judge queue and score entry screen development.
* **Phase 5:** Evaluation result and comparison views.
* **Phase 6:** Admin management dashboards.
* **Phase 7:** Automated retention system and cleanup cron jobs.
* **Phase 8:** Comprehensive testing and final polish.

### Testing Strategy

* **Automated Tests:** Write tests covering authentication, bird ownership validation, duplicate evaluation prevention, scoring auto-calculations, and media retention behavior.
* **Acceptance Criteria:** Ensure clear acceptance criteria are defined for each core workflow before development begins.

### Open Decisions & Next Steps

* Define exact file size limits for MP3/MP4 uploads.
* Establish the exact default scoring category definitions.
* Determine the precise behavior for judge notifications.

**Instruction for GitHub Copilot:** Read this specification completely. Identify any genuine ambiguities or missing implementation details, and pause to prompt the user for approval before writing any application code.