import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

// Server-only: the Access Gate / Core Orchestration layer (Next.js Server Actions / API
// Routes) uses this to enforce business rules with elevated privileges — never import
// from a client component. See CLAUDE.md rules #1/#3/#5 for what must be checked here.
function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!rawKey) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set — copy the service account JSON " +
        "(Firebase console → Project settings → Service accounts → Generate new private key) " +
        "into .env.local as one line."
    );
  }

  const serviceAccount = JSON.parse(rawKey);
  return initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const adminApp = getAdminApp();

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);
