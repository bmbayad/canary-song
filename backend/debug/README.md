# Debug Scripts

Utility scripts for testing and debugging the Canary Evaluation Platform backend.

## clear_all_data.py

Completely clears all recordings, evaluations, and R2 media files. Use this to reset the system for fresh testing.

**Usage:**
```bash
python clear_all_data.py
```

**What it clears:**
- All evaluation scores from database
- All evaluations from database
- All recordings from database
- All media files from Cloudflare R2 bucket

**Example output:**
```
==================================================
CLEARING DATABASE AND R2 DATA
==================================================

[DB] Clearing evaluation scores...
[DB] Cleared evaluation scores
[DB] Clearing evaluations...
[DB] Cleared evaluations
[DB] Clearing recordings...
[DB] Cleared recordings

[R2] Clearing all objects from bucket...
[R2] Deleted: recordings/...
[R2] Deleted 5 objects from R2

==================================================
SUCCESS: All data cleared!
==================================================
```

**WARNING:** This permanently deletes all data! Use only for testing/development.

---

## verify_deletion.py

Verifies that a recording has been properly deleted from both the database and Cloudflare R2 storage.

**Usage:**
```bash
python verify_deletion.py
```

**What it checks:**
- Queries the R2 bucket to see if the recording file exists
- Queries the database to see if the recording entry exists
- Returns a summary of deletion status

**Example output:**
```
Checking status of recording: 73c16c74-c260-4df6-9de0-d76f25dd1f32

[R2] Total objects in bucket: 2
  [NOT FOUND in R2] Recording file is gone ✓

[Database]
  [NOT FOUND in DB] Recording deleted ✓

==================================================
SUCCESS: Recording fully deleted from R2 and database ✓✓✓
```

**Troubleshooting:**
- If the recording is in R2 but not in DB: deletion happened on frontend but R2 cleanup failed
- If the recording is in DB but not R2: database deletion failed after successful R2 deletion
- If in both: deletion operation didn't complete

**Related files:**
- `app/services/recording_service.py` - handles deletion logic
- `app/services/r2_service.py` - handles R2 operations

