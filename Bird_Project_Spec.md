# Canary Evaluation Platform

## 1. Overview & Scope

### Purpose

A simple platform where canary owners create and manage bird profiles, upload song recordings, and have certified judges evaluate those recordings using a configurable scoring system.

The platform is focused specifically on the evaluation of canary recordings and is intentionally designed to remain small, reliable, and maintainable.

### Non-Goals

The platform will not include:

- Payment processing
- Competition brackets
- Rankings
- Leaderboards
- Competition standings
- AI scoring
- AI-generated evaluations
- Manual judge assignment
- Generalized competition-management functionality

### Core Principles

- Keep the system simple and maintainable.
- Preserve historical evaluations exactly as submitted.
- Enforce all business rules server-side.
- Never treat the frontend as a security boundary.
- Store media separately from PostgreSQL.
- Store MP3/MP4 media in Cloudflare R2.
- Default media retention period is 14 days.
- Support English, Arabic, French, and Spanish.
- A Participant is a User with the Participant role.
- A Judge is a User with the Judge role.
- An Admin is a User with the Admin role.
- A User has one account, one profile, and one primary role.
- A bird belongs to one Participant/User.
- A recording belongs to one bird and one bird type.
- Bird identity and bird type are immutable after bird creation.
- The bird type determines the applicable scoring-sheet family.
- Historical evaluations must remain valid even when scoring configuration changes later.
- Keep database relationships straightforward.
- Favor reliability and clarity over unnecessary abstraction.

---

# 2. User Model

The platform uses a single User entity.

Participants, Judges, and Admins are all Users. Their role determines what they can access and do.

### User Structure

    User
     |
     +---- role = Participant
     |
     +---- role = Judge
     |
     +---- role = Admin

There are not separate Participant, Judge, and Admin user accounts.

There are not separate mandatory ParticipantProfile and JudgeProfile entities unless future requirements make role-specific data necessary.

### User Fields

Suggested fields:

    User
    ----
    id
    email
    password_hash
    first_name
    last_name
    display_name
    role
    status
    preferred_language
    timezone
    notification_preferences
    country_region
    phone
    created_at
    updated_at
    last_login_at

Role-specific information should only be added as separate structures if it is genuinely required.

---

# 3. User Roles

The system has three primary roles:

- Participant
- Judge
- Admin

### Participant

A Participant is a User whose role is `Participant`.

Participants can:

- Manage their account/profile.
- Create birds.
- View their birds.
- Archive their birds.
- Upload recordings for their birds.
- View their recordings.
- View evaluations.
- Compare evaluations.

Participants cannot:

- Access another participant's birds or recordings.
- Modify a bird after it has been created.
- Change a bird's type.
- Access judge-only functionality.
- Access admin functionality.

### Judge

A Judge is a User whose role is `Judge`.

Judges can:

- Access the judging queue.
- Select available recordings.
- View required bird information.
- Listen to or watch media.
- Enter scores.
- Add comments.
- Save evaluations and resume later.
- Submit evaluations.
- Mark a recording as "Unable to Evaluate."

Judges cannot:

- See another judge's scores before submitting their own evaluation.
- See another judge's comments before submitting their own evaluation.
- Modify another judge's evaluation.
- Evaluate the same recording more than once.
- Change bird information.
- Access unnecessary participant information.

### Admin

An Admin is a User whose role is `Admin`.

Admins can:

- Create and manage judges.
- Activate/deactivate judges.
- Manage judge certification/status information.
- Manage bird types.
- Manage scoring categories.
- Manage bird-type-specific scoring configurations.
- Configure media retention.
- Manage approved system configuration.

Admins do not manually assign recordings to judges.

---

# 4. Authentication

The platform supports two authentication methods:

- Email/password
- Google account sign-in/sign-up

Both methods access the same internal User account.

## Email/Password Authentication

Users can:

- Register with email/password.
- Sign in with email/password.
- Sign out.
- Recover/reset their password.

Passwords must be securely hashed.

Plain-text passwords must never be stored.

## Google Authentication

Users can:

- Sign up using an existing Google account.
- Sign in using Google.

Google authentication should use a secure OAuth/OpenID Connect flow.

The application stores only the information required to associate the Google identity with the internal User account.

The application must not store the user's Google password.

## Google Account Linking

When a user authenticates with Google:

1. Verify the Google identity.
2. Check whether the Google identity is already linked to a User account.
3. If linked, authenticate that User.
4. If an appropriate verified email match exists, securely associate the Google login with the existing User rather than creating an unintended duplicate.
5. Otherwise, create a new User account.

The system must prevent unintended duplicate accounts.

## Self-Registration

Users who register themselves using email/password or Google become:

    Participant

Users cannot choose Judge or Admin during self-registration.

Judge and Admin roles are assigned by authorized administrators.

Google authentication does not bypass application role-based authorization.

---

# 5. User Status

Possible User status values:

- Active
- Inactive
- Suspended

Inactive and suspended Users must not be able to perform protected operations.

---

# 6. Localization

The application supports:

- English
- Arabic
- French
- Spanish

Requirements:

- Externalize UI strings.
- Store the user's preferred language.
- Support Arabic right-to-left layout where appropriate.
- Ensure validation and error messages are localizable.

---

# 7. Bird Profile

The Bird Profile is a first-class entity.

A Participant must create a bird before uploading a recording.

### Bird Fields

Suggested fields:

    Bird
    ----
    id
    owner_id
    name
    leg_band_number
    bird_type_id
    sex
    notes
    status
    created_at
    updated_at

### Required Fields

- Bird name
- Leg band number
- Bird type

### Optional Fields

- Sex
- Notes

### Bird Status

Possible values:

- Active
- Archived

An archived bird remains available for historical records but normally cannot receive new recordings.

---

# 8. Bird Immutability

A bird's identity is immutable after creation.

The Participant may not change:

- Bird name
- Leg band number
- Bird type
- Other identity-defining attributes

The Participant may:

- View the bird.
- Archive the bird.

The bird cannot be deleted if doing so would compromise historical recordings or evaluations.

### Reason for Immutability

The bird type determines the scoring-sheet family.

Therefore:

    Bird
      |
      +---- Immutable Bird Type
      |
      +---- Recordings
               |
               +---- Evaluations

A bird cannot later be changed from Waterslager to Roller, for example.

This prevents existing recordings from becoming associated with a different evaluation context.

---

# 9. Bird Types

Bird type is a dedicated entity.

Suggested fields:

    BirdType
    --------
    id
    name
    description
    active
    created_at
    updated_at

### Initial Bird Types

The initial system supports:

- Canary – Waterslager
- Canary – Roller
- Canary – American Singer

The design should allow future bird types without changing the database structure.

### Bird Type Administration

Admins can:

- View bird types.
- Add bird types.
- Edit bird types.
- Activate/deactivate bird types.

Deactivating a bird type prevents it from being selected for newly created birds but does not invalidate existing birds, recordings, or evaluations.

---

# 10. Leg Band Number

The leg band number is the physical identification associated with a bird.

It is required during bird creation.

Recommended constraint:

    UNIQUE(owner_id, leg_band_number)

This prevents the same Participant from creating duplicate birds with the same band number.

Global uniqueness should not be assumed unless the real-world band-numbering scheme guarantees it.

Because the bird is immutable, the leg band number cannot be changed after creation.

---

# 11. Recording

Every recording belongs to exactly one bird and exactly one bird type.

The recording identifies:

- The specific bird
- The bird type/scoring context

### Recording Fields

Suggested fields:

    Recording
    ---------
    id
    bird_id
    bird_type_id
    media_type
    storage_key
    original_filename
    file_size
    duration
    uploaded_at
    expires_at
    status

### Recording Invariants

For every recording:

    recording.bird_id IS NOT NULL

    recording.bird_type_id IS NOT NULL

    recording.bird_type_id == recording.bird.bird_type_id

The Participant cannot change the bird or bird type associated with a recording after creation.

The bird type is determined from the bird at recording creation time.

The backend must validate that:

    recording.bird_id
            ↓
    bird.owner_id == authenticated participant
            ↓
    recording.bird_type_id == bird.bird_type_id

This makes the recording's scoring context explicit and immutable.

---

# 12. Recording Media

Supported media formats:

- MP3
- MP4

The actual media file is stored in Cloudflare R2.

The PostgreSQL database stores only metadata and the R2 reference.

PostgreSQL must never store the media blob.

---

# 13. Recording Status

Possible statuses:

- Pending
- In Progress
- Completed
- Unable to Evaluate
- Expired

Exact state transitions must be enforced by the backend.

---

# 14. Participant Screens

## 14.1 Dashboard

The Participant dashboard contains navigation for:

- My Birds
- Upload Recordings
- My Evaluations
- Profile

## 14.2 My Birds

Participants can:

- View their birds.
- Add a bird.
- Archive a bird.
- View recording history.

Participants cannot edit an existing bird's identity.

Each bird card displays:

- Bird name
- Leg band number
- Bird type
- Status

### Add Bird

The Participant enters:

- Bird name
- Leg band number
- Bird type
- Optional sex
- Optional notes

The backend validates:

- Authentication
- Participant role
- Bird type
- Ownership
- Leg band uniqueness

Once created, the bird's identity is immutable.

## 14.3 Upload Recordings

The Participant:

1. Selects one of their active birds.
2. Selects an MP3 or MP4 file.
3. Uploads the recording.
4. Receives confirmation.

The bird type is automatically determined from the selected bird.

The Participant does not select the bird type independently during recording upload.

The system stores:

    Recording
       |
       +---- Bird
       |
       +---- Bird Type

The bird type stored on the Recording must match the bird's immutable bird type.

---

# 15. Participant Evaluations

## My Evaluations

Displays recordings with statuses such as:

- Pending
- In Progress
- Completed
- Unable to Evaluate
- Expired

Each recording displays:

- Bird name
- Leg band number
- Bird type
- Media type
- Upload date
- Current evaluation status
- Countdown until media expiration

## Evaluation Detail

Displays:

- Bird information
- Recording information
- Bird type
- Individual judge evaluations
- Scores
- Comments
- Aggregate/final score where applicable

Historical evaluations remain accessible after the recording media expires.

## Comparison View

Provides a simple comparison of evaluations associated with a recording.

The platform does not provide:

- Rankings
- Leaderboards
- Competition standings

---

# 16. Participant Profile Screen

Participants can manage common User information such as:

- First name
- Last name
- Display name
- Email
- Phone, if enabled
- Country/region, if enabled
- Preferred language
- Time zone
- Notification preferences

Authentication credentials are managed separately from profile information.

---

# 17. Judge Screens

## 17.1 Judging Queue

Shows recordings available for evaluation.

Filters:

- Available
- In Progress
- Evaluated by You

Each queue item displays:

- Bird name
- Leg band number
- Bird type
- Media type
- Time remaining before expiration

Judges independently select work from the queue.

There are no manual judge assignments.

## 17.2 Score Entry Screen

Contains:

- Bird name
- Leg band number
- Bird type
- Integrated media player
- Correct bird-type-specific scoring sheet
- Automatic score calculation
- Comments section
- Save and Resume
- Submit
- Unable to Evaluate

The scoring sheet is determined by the Recording's bird type.

The Judge cannot manually choose a different scoring-sheet family.

### Unable to Evaluate

Selecting "Unable to Evaluate" requires a reason.

The reason must be stored with the evaluation.

## 17.3 Judge Evaluation History

Shows a complete history of all evaluations completed by the judge.

Displays:

- Total evaluation statistics (Completed, Unable to Evaluate, In Progress counts)
- Individual evaluation cards showing:
  - Recording ID
  - Submission date and time
  - Status (Completed, Unable to Evaluate, In Progress)
  - For submitted evaluations:
    - Total score
    - Categorical score breakdown with individual scores
    - Comments (if provided)
  - For unable-to-evaluate evaluations:
    - Reason provided

Judges can reference their evaluation history for quality assurance and personal record-keeping.

---

# 18. Judge Profile

Judges can manage common User information such as:

- First name
- Last name
- Display name
- Preferred language
- Time zone
- Notification preferences

Judges can view their status.

Certification and administrative status are managed by Admins.

The architecture should allow future support for judge qualification by bird type.

Example:

    Judge
     |
     +-- Waterslager qualified
     +-- Roller qualified
     +-- American Singer qualified

This does not have to be implemented in the first release.

---

# 19. Admin Screens

## 19.1 Admin Dashboard

Provides navigation for all administrative functions:

- Manage Judges
- Manage Bird Types
- Manage Scoring Configuration
- Set Retention Period

The dashboard displays quick-access cards for each administrative function.

## 19.2 Manage Judges

Admins can:

- Create new judge accounts
- View all judge accounts
- Activate judges
- Deactivate judges
- Suspend judges
- View judge status and creation date

Each judge is displayed with:

- Display name
- Email address
- First and last name
- Current status (Active, Inactive, Suspended)
- Option to change status via dropdown

## 19.3 Manage Bird Types

Admins can:

- Create bird types
- View all bird types (including inactive)
- Edit bird type information
- Activate/deactivate bird types

Each bird type displays:

- Name
- Description
- Active status
- Option to toggle active status

Deactivating a bird type prevents it from being selected for newly created birds but does not invalidate existing birds, recordings, or evaluations.

## 19.4 Manage Scoring Configurations & Categories

Admins can:

- View existing scoring configurations
- Create new scoring configurations for bird types
- View all scoring categories for a configuration
- Create scoring categories with:
  - Category name
  - Description
  - Minimum points
  - Maximum points
  - Display order
- Edit scoring categories
- Deactivate scoring categories
- Delete scoring categories (if not used in historical evaluations)

Scoring configuration changes do NOT modify historical evaluations.

Each scoring configuration displays:

- Bird type name
- Configuration name
- Version number
- Active status
- List of scoring categories

Each category displays:

- Category name
- Point range (min-max)
- Display order
- Active status
- Edit/delete controls

## 19.5 Set Retention Period

Admins can:

- View current media retention period (default: 14 days)
- Configure the number of days media remains available
- See the impact of retention changes

The retention period is:

- Applied to all new recordings
- Configurable in days
- Displayed to users as a countdown

---

# 20. Technical Architecture

## Frontend

- React
- TypeScript

## Backend

- FastAPI
- RESTful API

## Database

- PostgreSQL

## Media Storage

- Cloudflare R2

Media files must never be stored as PostgreSQL blobs.

PostgreSQL stores:

- User/account data
- Bird data
- Bird type data
- Recording metadata
- R2 object key/reference
- Evaluation data
- Scoring configuration
- Historical scoring snapshots
- Retention metadata

## Authorization

All important authorization and business rules are enforced by the backend.

The backend validates:

- Authentication
- User status
- User role
- Bird ownership
- Recording ownership
- Bird status
- Bird type
- Judge permissions
- Evaluation permissions
- Administrative permissions

The frontend may guide the user and hide unavailable controls, but the backend is the final authority.

---

# 21. Core Data Model

The initial relational model should remain straightforward.

    User
     |
     +---- Bird
            |
            +---- BirdType
            |
            +---- Recording
                   |
                   +---- BirdType
                   |
                   +---- Evaluation
                          |
                          +---- Judge/User
                          |
                          +---- EvaluationScore

    ScoringConfiguration
             |
             +---- BirdType
             |
             +---- ScoringCategory

### Relationships

    User 1 ─── N Bird

    Bird N ─── 1 BirdType

    Bird 1 ─── N Recording

    Recording N ─── 1 BirdType

    Recording 1 ─── N Evaluation

    User 1 ─── N Evaluation
    (Judge role only)

    ScoringConfiguration N ─── 1 BirdType

    ScoringConfiguration 1 ─── N ScoringCategory

    Evaluation 1 ─── N EvaluationScore

---

# 22. Scoring System

Scoring is bird-type-specific.

Each bird type can have its own scoring configuration.

Example:

    Waterslager
        |
        +---- Waterslager scoring configuration

    Roller
        |
        +---- Roller scoring configuration

    American Singer
        |
        +---- American Singer scoring configuration

The exact scoring categories and point ranges will be defined later.

The Judge score-entry screen automatically uses the scoring configuration associated with the Recording's bird type.

The Judge cannot choose a different scoring system.

---

# 23. Scoring Configuration

Scoring configuration may contain:

    ScoringConfiguration
    --------------------
    id
    bird_type_id
    version
    name
    description
    active
    created_at
    updated_at

Each configuration may contain categories such as:

    ScoringCategory
    ---------------
    id
    scoring_configuration_id
    name
    description
    minimum_points
    maximum_points
    display_order
    active

The exact versioning mechanism can be finalized during implementation.

---

# 24. Evaluation

Suggested fields:

    Evaluation
    ----------
    id
    recording_id
    judge_id
    status
    total_score
    comments
    unable_to_evaluate_reason
    scoring_configuration_id
    started_at
    submitted_at
    created_at
    updated_at

The evaluation derives its scoring configuration from the Recording's bird type.

The Judge cannot select a different bird type or scoring configuration.

---

# 25. Multiple Judges

A Recording may be evaluated independently by multiple Judges if the configured workflow requires multiple evaluations.

A particular Judge may evaluate a specific Recording at most once.

Database protection:

    UNIQUE(recording_id, judge_id)

Backend validation must also enforce this rule.

---

# 26. Blind Judging

Before submitting their own evaluation, a Judge must not be able to see:

- Another Judge's score
- Another Judge's comments
- Another Judge's evaluation result

Blind judging must be enforced at the API/backend level.

It is not sufficient to merely hide information in the React interface.

The API must not return protected evaluation data to a Judge who has not yet submitted their own evaluation.

---

# 27. Evaluation States

An evaluation may have:

- In Progress
- Submitted
- Unable to Evaluate

Submitted evaluations should be immutable unless a future, explicitly defined administrative correction process is introduced.

---

# 28. Historical Scoring Preservation

This is a critical requirement.

When an evaluation is submitted, the exact scoring configuration used at that time must be preserved.

Suggested EvaluationScore structure:

    EvaluationScore
    ---------------
    id
    evaluation_id
    category_id
    category_name_snapshot
    minimum_points_snapshot
    maximum_points_snapshot
    score

The snapshot preserves the exact category definition used when the Judge submitted the evaluation.

For example, if the scoring configuration originally contains:

    Tone = 10 points

and an Admin later changes it to:

    Tone = 20 points

the historical evaluation must continue to show:

    Tone = 10 points

and the originally submitted score.

Historical evaluations must never be recalculated using the current scoring configuration.

This remains true if:

- A category is renamed.
- A category's point range changes.
- A category is removed.
- A category is deactivated.
- A scoring configuration is replaced.
- A bird type receives a new scoring configuration.

---

# 29. Media Retention

Default retention:

    14 days

Every Recording receives an expiration timestamp.

The UI displays a countdown.

Example:

    Expires in 5 days, 4 hours

When media expires:

- The R2 media object is deleted.
- Recording metadata remains in PostgreSQL.
- Bird information remains.
- Bird type remains.
- Evaluation history remains.
- Scores remain unchanged.
- Historical scoring snapshots remain.
- The UI indicates that the media has expired.

The cleanup process must be automated and retry-safe.

---

# 30. Core Workflows

## 30.1 Participant Registration Workflow

    User visits registration
           ↓
    Choose:
       - Email/password
       OR
       - Continue with Google
           ↓
    Authentication succeeds
           ↓
    Create or load User
           ↓
    User role = Participant for self-registration
           ↓
    Complete profile information
           ↓
    Participant Dashboard

---

## 30.2 Participant Bird Workflow

    Participant
         ↓
    My Birds
         ↓
    Add Bird
         ↓
    Enter:
       - Bird Name
       - Leg Band Number
       - Bird Type
       - Optional Sex
       - Optional Notes
         ↓
    Backend validates
         ↓
    Bird Created
         ↓
    Bird identity becomes immutable
         ↓
    Bird can later be archived

---

## 30.3 Participant Recording Workflow

    Participant
         ↓
    Select Active Bird
         ↓
    Select MP3/MP4
         ↓
    Validate File
         ↓
    Read Bird Type from Bird
         ↓
    Create Recording
         ↓
    Store:
       - bird_id
       - bird_type_id
       - media metadata
         ↓
    Store Media in R2
         ↓
    Recording enters judging queue

---

## 30.4 Judge Workflow

    Judge Account Created by Admin
           ↓
    Judge Account Activated
           ↓
    Open Judging Queue
           ↓
    Select Recording
           ↓
    Recording Becomes In Progress
           ↓
    Review:
       - Bird Name
       - Leg Band Number
       - Bird Type
           ↓
    Backend selects scoring configuration
           ↓
    Judge listens/watches media
           ↓
    Judge enters scores
           ↓
    Judge adds comments
           ↓
    Submit
          OR
    Save and Resume
          OR
    Unable to Evaluate

---

## 30.5 Admin Workflow

    Create / Manage Judges
    Manage Bird Types
            ↓
            ↓
    Manage Scoring Configurations
            ↓
    Manage Scoring Categories
            ↓
    Configure Retention

---

# 31. Data Integrity Rules

The backend must enforce all of the following:

1. A Participant is a User with the Participant role.
2. A Judge is a User with the Judge role.
3. An Admin is a User with the Admin role.
4. Participants can access only their own birds.
5. Participants can modify only their own account/profile data.
6. Participants cannot modify an existing bird's identity.
7. Bird name cannot change after creation.
8. Leg band number cannot change after creation.
9. Bird type cannot change after creation.
10. Archived birds retain historical records.
11. Archived birds normally cannot receive new recordings.
12. Participants can upload recordings only for their own active birds.
13. Every recording belongs to exactly one bird.
14. Every recording belongs to exactly one bird type.
15. A recording's bird type must match the bird's bird type.
16. Recording bird association cannot change after creation.
17. Recording bird type cannot change after creation.
18. Judges can access recordings only according to judge permissions and queue rules.
19. Judges cannot see other judges' scores before submitting their own evaluation.
20. Judges cannot see other judges' comments before submitting their own evaluation.
21. A Judge cannot create duplicate evaluations for the same recording.
22. The database enforces uniqueness of `(recording_id, judge_id)`.
23. The scoring configuration is determined by the recording's bird type.
24. Judges cannot manually select a different scoring-sheet family.
25. Submitted evaluations preserve the scoring configuration used at submission time.
26. Submitted evaluations preserve submitted scores exactly.
27. Historical evaluations remain accessible after media expiration.
28. Media files are stored only in Cloudflare R2.
29. No media blobs are stored in PostgreSQL.
30. All authentication checks occur server-side.
31. All authorization checks occur server-side.
32. All ownership checks occur server-side.
33. Inactive or suspended users cannot perform protected operations.
34. Self-registration creates Participant accounts only.
35. Google authentication cannot bypass application RBAC.
36. Unintended duplicate accounts must not be created through Google authentication.
37. Configuration changes must not modify historical evaluation data.
38. The frontend must never be the sole enforcement mechanism for any business rule.

---

# 32. API Architecture

The backend exposes RESTful APIs.

Logical API areas should include:

    /auth
    /auth/google
    /users
    /profile
    /birds
    /bird-types
    /recordings
    /evaluations
    /scoring-configurations
    /scoring-categories
    /judges
    /admin
    /retention

Exact endpoint naming can be finalized during implementation.

Every protected endpoint must perform authorization and ownership checks server-side.

---

# 33. Testing Strategy

## 33.1 Authentication Tests

Test:

- Registration with email/password
- Login with email/password
- Invalid credentials
- Password reset
- Google sign-up
- Google sign-in
- Google account linking
- Duplicate-account prevention
- Session/token handling
- Role enforcement
- Disabled account enforcement
- Suspended account enforcement
- Self-registration always creates Participant role
- Self-registration cannot create Judge/Admin role

## 33.2 User/Profile Tests

Test:

- User creation
- Profile updates
- Language preference
- Notification preferences
- Role-based access
- Account status enforcement

## 33.3 Bird Tests

Test:

- Create bird
- Create bird with each supported bird type
- Bird ownership validation
- Duplicate leg band validation
- Bird type validation
- Bird immutability
- Attempt to modify bird name is rejected
- Attempt to modify band number is rejected
- Attempt to modify bird type is rejected
- Archive bird
- Archived bird restrictions

## 33.4 Recording Tests

Test:

- MP3 support
- MP4 support
- File type validation
- File size validation
- Duration validation
- Bird ownership validation
- Active-bird restriction
- Recording creation
- Recording bird type inheritance
- Recording bird type matches bird type
- Recording bird cannot be changed
- Recording bird type cannot be changed
- R2 upload
- Metadata creation
- Expiration timestamp creation

## 33.5 Evaluation Tests

Test:

- Judge queue behavior
- Recording selection
- In-progress state
- Duplicate evaluation prevention
- Blind judging enforcement
- API-level blind judging
- Correct scoring configuration selected by bird type
- Judge cannot select an incorrect scoring sheet
- Score calculation
- Save and resume
- Submit
- Unable to Evaluate
- Historical scoring snapshot preservation
- Immutable submitted evaluation

## 33.6 Retention Tests

Test:

- Expiration detection
- R2 deletion
- Database history preservation
- Evaluation accessibility after media expiration
- Retry-safe cleanup
- Countdown behavior

## 33.7 Localization Tests

Test:

- English
- Arabic
- French
- Spanish
- Arabic RTL rendering
- Localized validation/error messages

## 33.8 Security Tests

Test:

- Participant accessing another participant's bird
- Participant accessing another participant's recording
- Participant modifying another participant's bird
- Participant modifying an existing bird
- Participant attempting Admin functionality
- Non-admin attempting Admin functionality
- Judge accessing unauthorized data
- Judge attempting to access another Judge's score
- Judge attempting duplicate evaluation
- Judge attempting to manipulate bird type
- Judge attempting to select an incorrect scoring configuration
- Suspended/inactive accounts attempting protected actions
- Google authentication attempting role escalation
- Unauthorized API access

---

# 34. Acceptance Criteria

## 34.1 Account & Authentication

A new user can:

1. Register with email/password.
2. Register using Google.
3. Log in with email/password.
4. Log in using Google.
5. Sign out.
6. Recover/reset a local password.

The system must:

1. Create one internal User account regardless of authentication method.
2. Prevent unintended duplicate accounts.
3. Assign self-registered users the Participant role.
4. Prevent self-registration as Judge or Admin.
5. Enforce account status server-side.
6. Enforce application RBAC regardless of authentication method.

## 34.2 User Profile

A user can:

1. Maintain profile information.
2. Select a preferred language.
3. Configure notification preferences.

## 34.3 Participant

A Participant can:

1. Create their account.
2. Create a bird.
3. Enter a bird name.
4. Enter a leg band number.
5. Select a bird type.
6. View their birds.
7. Archive a bird.
8. Upload MP3/MP4 recordings for active birds.
9. View recording status.
10. View media expiration countdown.
11. View completed evaluations.
12. View evaluation details.
13. Compare evaluation results.

A Participant cannot:

1. Change a bird's name after creation.
2. Change a bird's leg band number after creation.
3. Change a bird's type after creation.
4. Change the bird associated with an existing recording.
5. Change the bird type associated with an existing recording.

## 34.4 Judge

A Judge can:

1. Log in.
2. Access the judging queue.
3. Select an available recording.
4. View bird name.
5. View leg band number.
6. View bird type.
7. Play/watch the recording.
8. Automatically receive the correct scoring sheet for the bird type.
9. Enter scores.
10. See automatic score calculations.
11. Add comments.
12. Save and resume.
13. Submit an evaluation.
14. Mark a recording Unable to Evaluate with a reason.
15. Never see another judge's score before submitting.
16. Never see another judge's comments before submitting.
17. Never submit a duplicate evaluation for the same recording.

## 34.5 Admin

An Admin can:

1. Create judge accounts.
2. Activate judges.
3. Deactivate judges.
4. Manage judge certification/status.
5. Manage bird types.
6. Manage scoring configurations.
7. Manage scoring categories.
8. Configure point ranges.
9. Configure media retention.
10. Make configuration changes without modifying historical evaluations.

---

# 35. Implementation Plan

## Phase 1 — Project Scaffolding, Authentication, Users & Roles

Build:

- Repository structure
- React application
- TypeScript configuration
- FastAPI application
- PostgreSQL setup
- Database migrations
- Email/password authentication
- Google OAuth/OIDC authentication
- Google account linking
- User model
- User profile fields
- Role model
- RBAC
- Account status management
- Base API structure
- Localization foundation

### Phase 1 Goal

At the end of Phase 1:

- A user can register with email/password.
- A user can register with Google.
- A user can log in using either method.
- Existing users can securely associate a Google login.
- Self-registration creates Participant accounts.
- Judge and Admin roles are controlled by Admins.
- A user's role is known by the backend.
- Role-based authorization works.
- Account status is enforced.
- User profile information can be managed.

---

## Phase 2 — Bird Management

Build:

- Bird model
- Bird Type model
- Participant bird management
- Bird creation
- Immutable bird identity
- Leg band validation
- Bird ownership enforcement
- Bird archival
- Bird screens
- Initial bird types

### Phase 2 Goal

A Participant can create and manage birds.

Each bird is permanently identified by:

- Bird name
- Leg band number
- Bird type

After creation, these identity-defining fields cannot be changed.

---

## Phase 3 — Recording Upload & Cloudflare R2

Build:

- Recording model
- MP3/MP4 validation
- File size validation
- Duration validation
- Cloudflare R2 integration
- Ensure that client utilize presigned url operation for frontend.
- Bird-to-recording relationship
- Recording bird type relationship
- Media metadata
- Expiration timestamp
- Upload UI



### Phase 3 Goal

A Participant can select one of their active birds and upload a recording that:

- Belongs to exactly one bird.
- Belongs to exactly one bird type.
- Uses the bird's immutable bird type.
- Is safely stored in R2.

---

## Phase 4 — Judge Queue & Score Entry

Build:

- Judge queue
- Queue state management
- Recording selection
- In-progress state
- Media player
- Bird-type-specific scoring configuration selection
- Configurable score sheet
- Automatic score calculations
- Comments
- Save/resume
- Unable to Evaluate
- Blind judging enforcement
- Duplicate evaluation prevention

### Phase 4 Goal

A Judge can independently select and evaluate recordings while:

- The correct scoring sheet is automatically selected from bird type.
- Other judges' results remain hidden.
- Duplicate evaluations are prevented.

---

## Phase 5 — Evaluation Results & Comparison

Build:

- Participant evaluation list
- Evaluation detail
- Judge evaluation display
- Historical scoring snapshots
- Comparison view
- Aggregate/final score behavior where applicable
- Judge evaluation history (for reference)

### Phase 5 Goal

Participants can see complete evaluation results while preserving the exact scoring configuration used during evaluation.

Judges can view their complete evaluation history for personal reference and quality assurance.

---

## Phase 6 — Admin Management

Build:

- Judge administration
- Judge status/certification management
- Bird type administration
- Bird-type-specific scoring configuration
- Scoring category administration
- Retention configuration

### Phase 6 Goal

Admins can manage the system's configurable components without modifying historical bird, recording, or evaluation data.

---

## Phase 7 — Automated Retention

Build:

- Scheduled cleanup process
- Expiration processing
- R2 deletion
- Retry-safe cleanup
- Countdown UI
- Expired media handling

### Phase 7 Goal

Media is automatically deleted after the configured retention period while all historical database records and evaluations remain intact.

### Phase 7 Implementation

**Admin Retention Configuration Screen:**

Admins can:
- View current media retention period (default: 14 days)
- Update retention period (1-365 days)
- See impact of changes (only affects new recordings)
- Confirm existing recordings retain their original expiration dates

**Scheduled Cleanup Process:**

- APScheduler runs every 1 hour
- Finds all recordings where expires_at <= now and status != EXPIRED
- For each expired recording:
  - Delete media file from Cloudflare R2
  - Mark recording status as EXPIRED
  - Preserve all database records (metadata, evaluations, scores)
- Retry-safe: Failed deletions are logged but don't block other deletions

**Data Preservation:**

After media deletion:
- Recording metadata remains accessible
- Evaluation history remains complete
- Submitted scores remain unchanged
- Historical scoring snapshots remain accessible
- Bird information and type remain intact
- UI indicates that media has expired
- Participants can still view historical evaluations

**UI Countdown Display:**

- Recordings show "X days until expiration" countdown
- After expiration, shows "Media Expired" status
- Evaluation detail page indicates expired status
- All functionality remains available except media playback

---

## Phase 8 — Comprehensive Testing & Final Polish

Build and verify:

- Backend unit tests
- API integration tests
- Frontend tests
- End-to-end workflow tests
- Authentication tests
- Google authentication tests
- Security tests
- RBAC tests
- Ownership tests
- Immutable bird tests
- Bird-type scoring tests
- Blind judging tests
- Localization tests
- Retention tests
- Error handling
- UI polish
- Production-readiness review

### Phase 8 Goal

All core workflows work reliably from account creation through bird creation, recording upload, judging, evaluation results, and media expiration.

---

# 36. Open Decisions

The following decisions should be finalized before or during implementation:

1. Maximum MP3 file size.
2. Maximum MP4 file size.
3. Maximum recording duration.
4. Exact default scoring categories for Waterslager.
5. Exact default scoring categories for Roller.
6. Exact default scoring categories for American Singer.
7. Exact scoring ranges for each category.
8. Whether scoring configurations require explicit versions.
9. Number of judges required per recording.
10. Exact definition of "Completed."
11. Judge notification behavior.
12. Participant notification behavior.
13. Whether judge identities are visible to participants.
14. Whether participant phone number is required.
15. Whether country/region is required.
16. Whether bird sex is required.
17. Whether judges require certification by bird type.
18. Whether recordings can be replaced before expiration.
19. Whether participants can delete recordings before expiration.
20. Whether archived birds can be restored.
21. Whether expired media should remain downloadable in any form.
22. Exact calculation method for aggregate/final scores.
23. Whether judges may work on multiple recordings simultaneously.
24. Exact queue locking/claim timeout behavior if a judge abandons an evaluation.
25. Exact Google account-linking behavior for an existing local account.
26. Whether email verification is required for local registration.
27. Whether Google-verified email addresses satisfy application email verification requirements.

---

# 37. Explicit Constraints

The platform must not introduce:

- Payment processing
- Rankings
- Leaderboards
- Competition brackets
- Competition standings
- AI scoring
- AI-generated evaluations
- Manual judge assignment
- PostgreSQL media blobs
- Client-side-only authorization
- Editable bird identity
- Editable bird type after bird creation
- Editable recording bird association
- Editable recording bird type
- Self-selected Judge role
- Self-selected Admin role

The platform remains focused on:

    User
      |
      +---- role = Participant
      |       |
      |       +---- Bird
      |              |
      |              +---- Immutable Bird Type
      |              |
      |              +---- Recording
      |                     |
      |                     +---- Bird Type
      |                     |
      |                     +---- Evaluation
      |                            |
      |                            +---- Historical Score Snapshot
      |
      +---- role = Judge
      |       |
      |       +---- Evaluation
      |
      +---- role = Admin
              |
              +---- System Configuration

The primary product flow is:

    Create Account
          ↓
    Email/Password OR Google
          ↓
    User is created as Participant
          ↓
    Create Bird
          ↓
    Enter:
       - Bird Name
       - Leg Band Number
       - Bird Type
          ↓
    Bird Becomes Immutable
          ↓
    Upload Recording
          ↓
    Recording captures:
       - Bird
       - Bird Type
          ↓
    Store Media in Cloudflare R2
          ↓
    Judge Selects Recording
          ↓
    Backend determines scoring configuration from Bird Type
          ↓
    Judge Evaluates Blindly
          ↓
    Evaluation Submitted
          ↓
    Exact Scoring Configuration Snapshotted
          ↓
    Historical Results Preserved
          ↓
    Media Expires After Retention Period
          ↓
    R2 Media Deleted
          ↓
    Evaluation History Remains

The overall system should favor:

- Simplicity
- Reliability
- Maintainability
- Strong server-side enforcement
- One User model
- Clear ownership relationships
- Immutable bird identity
- Explicit bird-type context
- Bird-type-specific scoring
- Blind judging
- Historical data preservation
- Separate media storage
- Multilingual support
- Simple authentication with email/password and Google sign-in

The platform is an evaluation system, not a generalized competition platform.