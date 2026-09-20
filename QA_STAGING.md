# QA / Staging Setup

## Purpose

This branch is the non-production QA lane for the Rehab Centre Management System.

Flow:

`main` → GitHub branch/PR → Vercel Preview → QA browser tests → review → merge to `main`

Do not put real patient, medical, payment, or production Firebase data into QA.

## Vercel

The project is `rehab-centre-management`.

Create a Preview deployment from this branch. Vercel Preview deployments are separate from production and can use Preview-scoped environment variables.

Keep Deployment Protection enabled for previews. For automated browser testing, use an authorized Vercel access mechanism rather than exposing production data.

Reference: https://vercel.com/docs/deployment-protection

## Firebase

For a proper QA environment, create a separate Firebase project/database for staging.

Configure these variables in Vercel **Preview** scope only:

- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY

Never copy production service-account credentials into GitHub.

Seed only synthetic test records and dedicated QA users.

## Browser tests

Install Playwright locally:

`npm install -D @playwright/test`

Install browsers:

`npx playwright install`

Run the smoke suite:

`QA_BASE_URL=https://<preview-url> npx playwright test`

For authenticated tests:

`QA_BASE_URL=https://<preview-url> QA_STAFF_EMAIL=<qa-user> QA_STAFF_PASSWORD=<qa-password> npx playwright test`

Credentials must be supplied through the shell/CI secret store, never committed.

## CI

The workflow in `.github/workflows/qa-e2e.yml` runs the browser suite when a QA branch or PR is tested. It requires `QA_BASE_URL` and optional QA credentials as GitHub Actions secrets.

## Minimum QA account set

Create dedicated synthetic accounts for:

- Super Admin
- Admin
- Doctor
- Staff
- Accounts
- Reception
- Viewer
- Patient Attender

The existing application also supports legacy `sub_admin` and `patient_attender` profiles.

## Test coverage to add after staging access

1. Login/logout and session persistence
2. Role-based module visibility
3. Sidebar logo visibility
4. Sidebar collapse/expand and content-width restoration
5. Patients CRUD
6. Staff CRUD
7. Attendance manual entry
8. Attendance QR generation/scanning
9. Vitals CRUD
10. Bills/payments
11. Invoice generation
12. Letterhead generation
13. Reports upload/list/download
14. Deleted-patient restore
15. Settings/branding
16. Firestore/Storage authorization
17. Error states and 4xx/5xx responses
18. Tablet/mobile layouts
19. Audit-log creation for security-sensitive operations

## Safety gate

QA is considered ready for production review only after:

- Preview build succeeds.
- Smoke suite passes.
- Authenticated role tests pass for every supported role.
- No unexpected 5xx responses are observed during the suite.
- Firebase rules are tested against the synthetic QA dataset.
- No production secrets or real patient data are used.
