import "server-only";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export const SESSION_COOKIE_NAME = "align_session";
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000; // 5 days (Firebase session cookie limit is 14 days)

// [DEVIATION FROM align-technical-design.md §2.12 — explicitly requested by the user
// 2026-09-07] The confirmed spec has role fixed 1:1 per account (self-register is always
// 'instructor'; 'program_admin' only via seed script) with no in-app role switching. This
// cookie lets a real program_admin temporarily *view* the app as an instructor would (e.g.
// to fill in course data themselves) without changing their actual `users/{uid}.role` in
// Firestore. It can only ever narrow a program_admin down to instructor — it can never let
// an instructor account gain program_admin powers (checked server-side in setActAs below).
export const ACT_AS_COOKIE_NAME = "align_act_as";
export const ACT_AS_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours — short-lived on purpose

export type AccountStatus = "pending" | "approved" | "rejected";
export type Role = "instructor" | "program_admin";

export interface CurrentUser {
  uid: string;
  name: string;
  email: string;
  role: Role;
  /** role, unless a program_admin has toggled "act as instructor" — every permission
   *  check in this app should gate on this, not on `role` directly. */
  effectiveRole: Role;
  isActingAsInstructor: boolean;
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

  const role = data.role as Role;
  const actingAsInstructor = role === "program_admin" && cookieStore.get(ACT_AS_COOKIE_NAME)?.value === "instructor";

  return {
    uid,
    name: String(data.name ?? ""),
    email: String(data.email ?? ""),
    role,
    effectiveRole: actingAsInstructor ? "instructor" : role,
    isActingAsInstructor: actingAsInstructor,
    account_status: data.account_status as AccountStatus,
    rejection_reason: (data.rejection_reason as string | null) ?? null,
    program_admin_curriculum_scope: (data.program_admin_curriculum_scope as string[] | null) ?? null,
  };
}

// Throws if not logged in, not approved, or (when roles is given) not one of the allowed
// roles — the single enforcement point for business rule #6 that every protected
// Server Action/page should call first. Checks `effectiveRole` (see ACT_AS_COOKIE_NAME
// above), so a program_admin "acting as instructor" is correctly blocked from
// program_admin-only actions until they switch back.
export async function requireApprovedUser(roles?: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("ต้องเข้าสู่ระบบก่อน");
  }
  if (user.account_status !== "approved") {
    throw new Error("บัญชียังไม่ได้รับอนุมัติ หรือถูกปฏิเสธ");
  }
  if (roles && !roles.includes(user.effectiveRole)) {
    throw new Error("ไม่มีสิทธิ์เข้าถึงฟีเจอร์นี้");
  }
  return user;
}
