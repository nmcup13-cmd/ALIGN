"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireApprovedUser } from "@/lib/auth/session";

// POST /admin/accounts/{user_id}/approve|reject per align-technical-design.md §3.14/§4.6 —
// program_admin only, writes `users` + `account_approval_logs` in one transaction, and
// rejects (409-equivalent) if the account isn't still 'pending'.
export async function decideAccount(formData: FormData) {
  const admin = await requireApprovedUser(["program_admin"]);

  const userId = String(formData.get("user_id") ?? "");
  const action = String(formData.get("action") ?? ""); // 'approve' | 'reject'
  const rejectionReason = String(formData.get("rejection_reason") ?? "").trim() || null;

  if (!userId || (action !== "approve" && action !== "reject")) {
    throw new Error("คำขอไม่ถูกต้อง");
  }

  const userRef = adminDb.collection("users").doc(userId);
  const logRef = adminDb.collection("account_approval_logs").doc();

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) throw new Error("ไม่พบบัญชีนี้");
    if (snap.data()?.account_status !== "pending") {
      throw new Error("บัญชีนี้ถูกดำเนินการไปแล้ว");
    }

    tx.update(userRef, {
      account_status: action === "approve" ? "approved" : "rejected",
      approved_by: admin.uid,
      approved_at: FieldValue.serverTimestamp(),
      rejection_reason: action === "reject" ? rejectionReason : null,
    });

    tx.create(logRef, {
      log_id: logRef.id,
      account_id: userId,
      action,
      decided_by: admin.uid,
      decided_at: FieldValue.serverTimestamp(),
    });
  });

  revalidatePath("/admin/accounts");
}
