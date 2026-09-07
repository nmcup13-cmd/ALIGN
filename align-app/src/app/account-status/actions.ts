"use server";

import { cookies } from "next/headers";
import { getCurrentUser, ACT_AS_COOKIE_NAME, ACT_AS_MAX_AGE_MS } from "@/lib/auth/session";

// [DEVIATION FROM SPEC — see the comment on ACT_AS_COOKIE_NAME in src/lib/auth/session.ts]
// Only a *real* program_admin may switch into instructor view — never the other way
// around, and never for an instructor account (checked against the real `role`, not
// `effectiveRole`, so this can't be chained to escalate).
export async function setActAsInstructor(formData: FormData) {
  const mode = String(formData.get("mode") ?? ""); // 'instructor' | 'admin'
  const cookieStore = await cookies();

  if (mode === "instructor") {
    const user = await getCurrentUser();
    if (!user || user.role !== "program_admin" || user.account_status !== "approved") {
      throw new Error("เฉพาะผู้บริหารหลักสูตรที่ได้รับอนุมัติแล้วเท่านั้นที่สลับมุมมองได้");
    }
    cookieStore.set(ACT_AS_COOKIE_NAME, "instructor", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: ACT_AS_MAX_AGE_MS / 1000,
      path: "/",
    });
  } else {
    cookieStore.delete(ACT_AS_COOKIE_NAME);
  }
}
