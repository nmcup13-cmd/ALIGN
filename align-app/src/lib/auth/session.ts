import "server-only";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export const SESSION_COOKIE_NAME = "align_session";
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000; // 5 days (Firebase session cookie limit is 14 days)

export type AccountStatus = "pending" | "approved" | "rejected";
export type Role = "instructor" | "program_admin";

export interface CurrentUser {
  uid: string;
  name: string;
  email: string;
  role: Role;
  account_status: AccountStatus;
  rejection_reason: string | null;
  program_admin_curriculum_scope: string[] | null;
}

// Reads+verifies the session cookie, then loads the Firestore `users/{uid}` doc — the
// single source of truth for role/account_status (rule #6), separate from Firebase Auth
// identity itself. Returns null if there's no valid session or no matching user doc.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  let uid: string;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    uid = decoded.uid;
  } catch {
    return null;
  }

  const snap = await adminDb.collection("users").doc(uid).get();
  if (!snap.exists) return null;

  const data = snap.data() as Record<string, unknown>;
  if (data.is_deleted) return null;

  return {
    uid,
    name: String(data.name ?? ""),
    email: String(data.email ?? ""),
    role: data.role as Role,
    account_status: data.account_status as AccountStatus,
    rejection_reason: (data.rejection_reason as string | null) ?? null,
    program_admin_curriculum_scope: (data.program_admin_curriculum_scope as string[] | null) ?? null,
  };
}

// Throws if not logged in, not approved, or (when roles is given) not one of the allowed
// roles — the single enforcement point for business rule #6 that every protected
// Server Action/page should call first.
export async function requireApprovedUser(roles?: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("ต้องเข้าสู่ระบบก่อน");
  }
  if (user.account_status !== "approved") {
    throw new Error("บัญชียังไม่ได้รับอนุมัติ หรือถูกปฏิเสธ");
  }
  if (roles && !roles.includes(user.role)) {
    throw new Error("ไม่มีสิทธิ์เข้าถึงฟีเจอร์นี้");
  }
  return user;
}
