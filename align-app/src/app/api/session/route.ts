import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from "@/lib/auth/session";

// POST: exchange a fresh Firebase Auth ID token (from the client SDK sign-in) for an
// httpOnly session cookie Server Components/Actions can read via next/headers.
export async function POST(request: Request) {
  const { idToken } = await request.json();
  if (!idToken) {
    return NextResponse.json({ error: "missing idToken" }, { status: 400 });
  }

  let sessionCookie: string;
  try {
    sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
  } catch {
    return NextResponse.json({ error: "invalid or expired idToken" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_MS / 1000,
    path: "/",
  });

  return NextResponse.json({ ok: true });
}

// DELETE: logout — clears the session cookie (client also calls Firebase Auth signOut()).
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
