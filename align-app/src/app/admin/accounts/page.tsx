import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";
import { decideAccount } from "./actions";
import { LogoutButton } from "../../logout-button";

export const dynamic = "force-dynamic";

export default async function AdminAccountsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.account_status !== "approved" || user.role !== "program_admin") {
    redirect("/account-status");
  }

  const pendingSnap = await adminDb.collection("users").where("account_status", "==", "pending").get();
  const pendingUsers = pendingSnap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as { name: string; email: string; role: string; created_at?: { toDate(): Date } }),
  }));

  return (
    <main style={{ maxWidth: 640, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.4rem" }}>จัดการบัญชีผู้ใช้ — รออนุมัติ</h1>

      {pendingUsers.length === 0 ? (
        <p>ไม่มีบัญชีที่รออนุมัติ</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {pendingUsers.map((u) => (
            <li
              key={u.id}
              style={{ border: "1px solid #ddd", borderRadius: 6, padding: 12, marginBottom: 12 }}
            >
              <p style={{ margin: 0, fontWeight: 600 }}>
                {u.name} ({u.email})
              </p>
              <p style={{ margin: "4px 0", color: "#555" }}>บทบาท: {u.role}</p>

              <form action={decideAccount} style={{ display: "inline" }}>
                <input type="hidden" name="user_id" value={u.id} />
                <input type="hidden" name="action" value="approve" />
                <button type="submit" style={{ marginRight: 8, padding: "6px 12px", cursor: "pointer" }}>
                  อนุมัติ
                </button>
              </form>

              <form action={decideAccount} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                <input type="hidden" name="user_id" value={u.id} />
                <input type="hidden" name="action" value="reject" />
                <input
                  name="rejection_reason"
                  placeholder="เหตุผล (ไม่บังคับ)"
                  style={{ padding: 6 }}
                />
                <button type="submit" style={{ padding: "6px 12px", cursor: "pointer" }}>
                  ปฏิเสธ
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <div style={{ marginTop: 24 }}>
        <a href="/account-status">&larr; กลับ</a> · <LogoutButton />
      </div>
    </main>
  );
}
