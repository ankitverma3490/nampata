# Google Business Categories Parity Status

## Requirement
Client asks for Google Business categories (4000+), with amendment workflow before final implementation.

## Current Snapshot

- `categories-list.json` currently has **3968** entries (repo audit, 2026-06-01).
- This is near-full Google-style long-tail coverage and materially different from the old 90-entry seed state.
- The repo also includes:
  - `backend/scripts/build-google-categories-list.js`
  - `google_categories_base.json`

## Current Status

1. Large-scale category coverage is now implemented in-repo through `categories-list.json`.
2. Backend import/sync paths already exist for:
   - local file import
   - admin-triggered bulk import
   - Google Business Profile sync workflow
3. The main remaining gap is not "missing category support"; it is amendment governance:
   - final client review/version sign-off
   - optional top-up from 3968 to a strict 4000+ target if required

## Evidence

- File: `categories-list.json`
- Count command:

```bash
node -e "const fs=require('fs');console.log(JSON.parse(fs.readFileSync('categories-list.json','utf8')).length)"
```

## Gap

1. `3968` is slightly below a strict `4000+` interpretation if that exact threshold is mandatory.
2. No formal approval log/version tag is committed yet for client amendments.
3. If the client wants exact Google parity, the final source-of-truth export still needs approval and lock-in.

## Required Closure

1. Treat `categories-list.json` as the editable review file for amendments.
2. Capture client-approved version/date in docs or release notes.
3. If needed, top up the remaining delta to exceed `4000` and re-run bulk import with a parity report.
