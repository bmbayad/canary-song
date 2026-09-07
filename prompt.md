specYou are the primary implementation agent for this project.

IMPORTANT:
Read Bird_Bird_Project_Spec.md completely before making any changes to the repository.

Bird_Project_Spec.md is the authoritative source of truth for this project.

Your job is to implement the project incrementally, one phase at a time, while preserving the architecture, scope, constraints, and business rules defined in Bird_Project_Spec.md.

==================================================
GENERAL RULES
==================================================

1. Read the entire Bird_Project_Spec.md before starting work.

2. Bird_Project_Spec.md defines:
   - Project scope
   - Functional requirements
   - User roles
   - Data model
   - Architecture
   - Business rules
   - Security requirements
   - Workflows
   - Testing requirements
   - Implementation phases
   - Non-goals
   - Open decisions

3. Do not invent major requirements that are not in Bird_Project_Spec.md.

4. Do not add features that are explicitly listed as non-goals.

5. Do not implement future phases when working on the current phase.

6. Implement exactly ONE phase at a time.

7. After completing the current phase, STOP.

8. Do not automatically continue to the next phase.

9. Wait for my explicit instruction before starting the next phase.

10. The entire project specification must remain consistent as development progresses.

==================================================
ARCHITECTURE RULES
==================================================

Follow the architecture defined in Bird_Project_Spec.md:

Frontend:
- React
- TypeScript

Backend:
- FastAPI
- RESTful APIs

Database:
- PostgreSQL

Media:
- Cloudflare R2

Authentication:
- Email/password
- Google sign-in/sign-up

Authorization:
- Server-side RBAC

Do not replace these technologies unless I explicitly instruct you to do so.

==================================================
USER MODEL RULES
==================================================

There is ONE User entity.

Participant, Judge, and Admin are roles of the User.

Do NOT create separate independent account systems for:
- Participants
- Judges
- Admins

Do NOT create separate ParticipantProfile or JudgeProfile entities unless the specification is later explicitly changed.

The basic model is:

User
 ├── role = Participant
 ├── role = Judge
 └── role = Admin

A Participant/User owns Birds.

A Judge/User performs Evaluations.

An Admin/User manages administrative configuration.

==================================================
AUTHENTICATION RULES
==================================================

Support:

- Email/password authentication
- Google authentication

Self-registration must create a Participant account.

A user must not be able to select Judge or Admin during self-registration.

Judge and Admin roles are controlled by authorized administrators.

Google authentication must not bypass application authorization.

Prevent unintended duplicate accounts when a Google identity corresponds to an existing account.

==================================================
BIRD RULES
==================================================

A Bird belongs to one Participant/User.

A Bird contains at least:

- Bird name
- Leg band number
- Bird type

Bird identity is IMMUTABLE after creation.

The Participant may NOT change:

- Bird name
- Leg band number
- Bird type

A Bird may be archived.

Archiving a Bird must preserve historical recordings and evaluations.

Do not implement editable bird identity unless I explicitly change this requirement.

==================================================
RECORDING RULES
==================================================

Every Recording belongs to:

- exactly one Bird
- exactly one Bird Type

The Recording must explicitly store its Bird Type.

The Recording's bird type must match the Bird's immutable bird type.

Once created:

- Recording bird cannot change.
- Recording bird type cannot change.

Supported media:

- MP3
- MP4

Media files must be stored in Cloudflare R2.

Never store media blobs in PostgreSQL.

==================================================
SCORING RULES
==================================================

Scoring is bird-type-specific.

The Bird Type determines the scoring-sheet family.

The Judge must receive the correct scoring configuration automatically.

The Judge must not manually choose an unrelated scoring sheet.

Historical evaluations must preserve the exact scoring configuration that existed when the evaluation was submitted.

Do not recalculate historical evaluations from newer scoring configurations.

==================================================
JUDGE RULES
==================================================

Judges independently select recordings from the queue.

There are no manual judge assignments.

A Judge can evaluate a Recording only once.

The database and backend must prevent duplicate evaluations.

Judges must not see another Judge's:

- scores
- comments
- evaluation results

before submitting their own evaluation.

Blind judging must be enforced by the backend/API, not only by the UI.

==================================================
BUSINESS RULE ENFORCEMENT
==================================================

The backend is the final authority.

Any important business or security rule must be enforced server-side.

Do not rely on:
- hidden UI controls
- disabled buttons
- frontend validation
- React state

for security.

Examples that must be enforced by FastAPI:

- authentication
- role authorization
- bird ownership
- recording ownership
- bird immutability
- recording immutability
- judge permissions
- duplicate evaluation prevention
- blind judging
- scoring validation
- correct bird-type scoring selection
- retention rules
- admin permissions

Frontend validation may improve user experience, but backend validation is mandatory.

==================================================
DATABASE RULES
==================================================

Keep database relationships straightforward.

Use database constraints where appropriate.

Use migrations for schema changes.

Business rules that can safely be enforced at the database level should be reinforced there.

Examples:

- unique participant + leg band number
- unique recording + judge evaluation

Do not introduce unnecessary abstraction or excessive normalization.

==================================================
HISTORICAL DATA RULES
==================================================

Historical data is extremely important.

A submitted evaluation must preserve:

- submitted scores
- scoring category information
- scoring ranges used at the time
- applicable scoring configuration
- comments
- evaluation state
- submission timestamp

Changes to current configuration must never rewrite history.

Examples:

If a scoring category changes later, old evaluations must remain unchanged.

If a scoring category is removed later, old evaluations must remain viewable.

If a scoring range changes later, old evaluations must retain the old range.

==================================================
MEDIA RETENTION RULES
==================================================

Default media retention is 14 days.

The retention period is configurable by Admin.

Each Recording must have an expiration timestamp.

The system must automatically delete expired media from Cloudflare R2.

Deleting media must NOT delete:

- Recording metadata
- Bird information
- Bird type
- Evaluation history
- Scores
- Comments
- Historical scoring snapshots

Cleanup must be retry-safe.

==================================================
NON-GOALS
==================================================

Do not implement:

- payments
- rankings
- leaderboards
- competition brackets
- competition standings
- AI scoring
- AI-generated evaluations
- manual judge assignment

==================================================
IMPLEMENTATION PROCESS
==================================================

Before implementing the current phase:

1. Read Bird_Bird_Project_Spec.md completely.
2. Inspect the existing repository.
3. Determine what has already been implemented.
4. Determine the current implementation phase.
5. Review the complete specification for dependencies affecting the current phase.
6. Identify any conflicts with existing code.
7. Prefer the smallest change that correctly satisfies the specification.

Then implement ONLY the requested phase.

During implementation:

- Keep the project runnable.
- Keep code understandable.
- Follow the existing project structure when reasonable.
- Avoid unnecessary refactoring.
- Avoid implementing future functionality.
- Add appropriate tests.
- Update migrations when database changes are required.
- Maintain API consistency.
- Maintain security boundaries.

==================================================
TESTING REQUIREMENTS
==================================================

Every phase must include appropriate automated tests.

Tests should verify actual behavior, not just implementation details.

At minimum, test the business rules introduced by the current phase.

Examples include:

- authentication
- authorization
- ownership
- bird immutability
- bird type handling
- recording ownership
- duplicate evaluation prevention
- blind judging
- scoring calculations
- historical scoring preservation
- media retention

Do not consider a phase complete if important tests are failing.

==================================================
PHASE BOUNDARIES
==================================================

The phases defined in Bird_Project_Spec.md are:

Phase 1:
Project Scaffolding, Authentication, Users & Roles

Phase 2:
Bird Management

Phase 3:
Recording Upload & Cloudflare R2

Phase 4:
Judge Queue & Score Entry

Phase 5:
Evaluation Results & Comparison

Phase 6:
Admin Management

Phase 7:
Automated Retention

Phase 8:
Comprehensive Testing & Final Polish

Implement one phase only.

When the phase is complete, STOP.

==================================================
PHASE COMPLETION REQUIREMENTS
==================================================

Before declaring a phase complete:

1. Verify the implementation against Bird_Project_Spec.md.
2. Run the relevant automated tests.
3. Fix failures.
4. Verify that previously implemented functionality still works.
5. Verify that no future-phase functionality was accidentally introduced.
6. Verify important security/business rules.
7. Review the code for obvious defects.
8. Confirm the project remains runnable.

==================================================
PHASE COMPLETION REPORT
==================================================

When the current phase is complete, provide a concise report containing:

Phase completed:
- [phase name]

Implemented:
- [summary]

Files created or modified:
- [list]

Database changes:
- [summary]

API changes:
- [summary]

Frontend changes:
- [summary]

Tests added:
- [summary]

Tests executed:
- [commands/results]

Business rules verified:
- [summary]

Assumptions:
- [summary]

Issues or decisions requiring my attention:
- [summary]

Deferred to later phases:
- [summary]

Update the implementation_status.md file

Then STOP.

Do not begin the next phase.

==================================================
IMPORTANT BEHAVIOR
==================================================

If the specification contains an ambiguity that does NOT prevent safe implementation:

- choose the simplest implementation consistent with the rest of the specification
- document the assumption in the phase completion report

If there is a significant conflict between requirements:

- do not silently redesign the system
- identify the conflict
- explain the impact
- choose the smallest safe interpretation only when implementation can continue without changing the project's architectural intent

Never silently change the project scope.

==================================================
STARTING INSTRUCTION
==================================================

Do not implement anything yet.

First:

1. Read Bird_Bird_Project_Spec.md completely.
2. Inspect the repository.
3. Determine the current project state.
4. Summarize your understanding of the architecture and current repository state.
5. Identify the phase that should be implemented next.

Then STOP and wait for my instruction to begin that phase.




Start Phase 1 only.

Implement Phase 1 according to Bird_Bird_Project_Spec.md and the master implementation instructions.

Do not begin Phase 2 or any later phase.

When Phase 1 is complete, run the tests, provide the phase completion report, and stop.