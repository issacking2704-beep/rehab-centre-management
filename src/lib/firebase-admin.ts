import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let adminApp: App | undefined;
let adminAuthInstance: Auth | undefined;
let adminDbInstance: Firestore | undefined;

function getAdminApp(): App {
  if (adminApp) return adminApp;

  const existingApp = getApps()[0];
  if (existingApp) {
    adminApp = existingApp;
    return adminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin environment variables.");
  }

  adminApp = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  return adminApp;
}

export function getAdminAuth(): Auth {
  if (!adminAuthInstance) {
    adminAuthInstance = getAuth(getAdminApp());
  }

  return adminAuthInstance;
}

export function getAdminDb(): Firestore {
  if (!adminDbInstance) {
    adminDbInstance = getFirestore(getAdminApp());
  }

  return adminDbInstance;
}

// Backwards-compatible lazy exports for existing server routes.
export const adminAuth = new Proxy({} as Auth, {
  get(_target, property) {
    const auth = getAdminAuth() as unknown as Record<PropertyKey, unknown>;
    const value = auth[property];
    return typeof value === "function" ? value.bind(auth) : value;
  },
});

export const adminDb = new Proxy({} as Firestore, {
  get(_target, property) {
    const db = getAdminDb() as unknown as Record<PropertyKey, unknown>;
    const value = db[property];
    return typeof value === "function" ? value.bind(db) : value;
  },
});

export default getAdminApp;
