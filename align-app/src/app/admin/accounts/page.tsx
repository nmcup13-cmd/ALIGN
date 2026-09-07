import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";
import { decideAccount } from "./actions";
import { LogoutButton } from "../../logout-button";

export const dynamic = "force-dynamic";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  account_status: "pending" | "approved" | "rejected";
  rejection_reason?: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ถูกปฏิเสธ",
};

export default async function AdminAccountsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.account_status !== "approved" || user.effectiveRole !== "program_admin") {
    redirect("/account-status");
  }

  // Full roster (not just pending) — an admin should be able to see everyone, not only
  // the approval queue.
  const allSnap = await adminDb.collection("users").get();
  const allUsers = allSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<UserRow, "id">) }));

  const pending = allUsers.filter((u) => u.account_status === "pending");
  const decided = allUsers
    .filter((u) => u.account_status !== "pending")
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main style={{ maxWidth: 640, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.4rem" }}>จัดการบัญชีผู้ใช้</h1>

      <h2 style={{ fontSize: "1.1rem", marginTop: 24 }}>รออนุมัติ</h2>
      {pending.length === 0 ? (
        <p>ไม่มีบัญชีที่รออนุมัติ</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {pending.map((u) => (
            <li key={u.id} style={{ border: "1px solid #ddd", borderRadius: 6, padding: 12, marginBottom: 12 }}>
              <p style={{ margin: 0, fontWeight: 600 }}>
                {u.name} ({u.email})
              </p>
              <p style={{ margin: "4px 0", color: "#555" }}>บทบาท: {u.role}</p>

              {u.id === user.uid ? (
                <p style={{ color: "#900", fontStyle: "italic" }}>(บัญชีของคุณเอง — อนุมัติ/ปฏิเสธเองไม่ได้)</p>
              ) : (
                <>
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
                    <input name="rejection_reason" placeholder="เหตุผล (ไม่บังคับ)" style={{ padding: 6 }} />
                    <button type="submit" style={{ padding: "6px 12px", cursor: "pointer" }}>
                      ปฏิเสธ
                    </button>
                  </form>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>บัญชีอื่นทั้งหมด (อนุมัติแล้ว/ถูกปฏิเสธ)</h2>
      {decided.length === 0 ? (
        <p>ยังไม่มีบัญชีอื่นในระบบ</p>
      ) : (
        <ul style={{ paddingLeft: 20 }}>
          {decided.map((u) => (
            <li key={u.id} style={{ marginBottom: 6 }}>
              {u.name} ({u.email}) — {u.role} — <strong>{STATUS_LABEL[u.account_status]}</strong>
              {u.account_status === "rejected" && u.rejection_reason ? ` (${u.rejection_reason})` : ""}
              {u.id === user.uid ? " — บัญชีของคุณ" : ""}
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
