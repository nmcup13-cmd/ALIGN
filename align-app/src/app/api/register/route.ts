import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from "@/lib/auth/session";

// POST /auth/register per align-technical-design.md §3 (E6): self-service registration
// always gets role='instructor' + account_status='pending' — never anything else. The
// Firebase Auth user itself is created client-side (createUserWithEmailAndPassword,
// which also rejects duplicate emails at the Auth layer); this route only creates the
// matching Firestore `users/{uid}` doc and starts a session so the client can be
// redirected to /account-status right away.
export async function POST(request: Request) {
  const { idToken, name } = await request.json();
  if (!idToken || !name) {
    return NextResponse.json({ error: "missing idToken or name" }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "invalid or expired idToken" }, { status: 401 });
  }

  const userRef = adminDb.collection("users").doc(decoded.uid);
  const existing = await userRef.get();
  if (!existing.exists) {
    await userRef.set({
      user_id: decoded.uid,
      name,
      email: decoded.email ?? "",
      role: "instructor",
      account_status: "pending",
      approved_by: null,
      approved_at: null,
      rejection_reason: null,
      program_admin_curriculum_scope: null,
      created_at: FieldValue.serverTimestamp(),
      is_deleted: false,
      deleted_at: null,
    });
  }

  const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_MS / 1000,
    path: "/",
  });

  return NextResponse.json({ ok: true, user_id: decoded.uid, account_status: "pending" });
}
