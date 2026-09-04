# Rehab Centre Management System

A responsive Next.js + Firebase management system for rehabilitation centres. The project is designed for desktop, tablet and Android PWA use.

## Included modules

- 🔐 Firebase Authentication with role-based access
- 📊 Dashboard and operational overview
- 🧑‍⚕️ Patient management
- 🗑️ Deleted Patients / restore workflow
- 👨‍⚕️ Doctors & Staff management
- 🕒 Staff attendance
- ❤️ Patient vitals and clinical monitoring
- 💳 Payments & bills
- 🧾 Invoice generator
- 📜 Letterhead / document maker
- 📁 Patient files and reports
- ⚙️ Settings and centre configuration

## Roles

Super Admin, Admin, Doctor, Staff, Accounts, Reception and Viewer are supported. Legacy `sub_admin` and `patient_attender` roles remain supported for existing Firebase profiles.

## Tech stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Firebase Authentication
- Cloud Firestore
- Firebase Storage

## Local setup

1. Install Node.js 20+.
2. Copy `.env.example` to `.env.local`.
3. Fill in the Firebase Web SDK values.
4. Keep Firebase Admin credentials server-only; never prefix them with `NEXT_PUBLIC_`.
5. Run `npm install`.
6. Run `npm run dev`.
7. Open the local development URL shown by Next.js.

## Firebase security

`firestore.rules` and `storage.rules` provide role-based starting rules. Review them against the exact data model before production deployment, then deploy them through the Firebase CLI or Firebase Console.

Do not put real patient records, passwords, service-account private keys, or other secrets into GitHub. Use environment variables and Firebase security rules.

## PWA

The app includes a web manifest and responsive viewport configuration so it can be installed from a supported mobile browser. A production deployment should also use HTTPS and a proper app icon set.

## Important production checklist

- Configure Firebase Authentication providers.
- Create a `users/{uid}` profile for every authorized account with a valid `role`.
- Deploy and test Firestore/Storage rules.
- Replace demo dashboard values with live aggregate queries.
- Test backups, restore procedures and audit logging.
- Test invoice/letterhead output on A4 printers and PDF export.
- Deploy with HTTPS and configure the production domain.

## Repository safety

This repository should remain private while the system is being developed. Never commit `.env.local`, Firebase Admin private keys, patient information, medical reports, or payment credentials.
