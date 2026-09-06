import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LogoutButton } from "../logout-button";

// GET /auth/me/account-status per align-technical-design.md §3 (E6) — one of only 2
// authenticated endpoints exempt from the account_status='approved' check, since
// pending/rejected accounts must be able to see their own status (AB-27).
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ถูกปฏิเสธ",
};

export default async function AccountStatusPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main style={{ maxWidth: 480, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.4rem" }}>สถานะบัญชีของฉัน</h1>
      <p>
        ชื่อ: {user.name} ({user.email})
      </p>
      <p>
        บทบาท: {user.role === "program_admin" ? "ผู้บริหารหลักสูตร" : "อาจารย์ผู้สอน"}
      </p>
      <p style={{ fontSize: "1.2rem", fontWeight: 600 }}>
        สถานะ: {STATUS_LABEL[user.account_status] ?? user.account_status}
      </p>

      {user.account_status === "pending" && (
        <p style={{ color: "#555" }}>รอผู้บริหารหลักสูตรอนุมัติบัญชีนี้ก่อนจึงจะใช้งานฟีเจอร์อื่นได้</p>
      )}
      {user.account_status === "rejected" && (
        <p style={{ color: "#900" }}>บัญชีนี้ถูกปฏิเสธ{user.rejection_reason ? `: ${user.rejection_reason}` : ""}</p>
      )}
      {user.account_status === "approved" && (
        <p>
          ใช้งานระบบได้แล้ว — <a href="/courses">ไปที่รายวิชา</a>
          {user.role === "program_admin" && (
            <>
              {" "}
              · <a href="/admin/accounts">จัดการบัญชีผู้ใช้</a>
            </>
          )}
        </p>
      )}

      <div style={{ marginTop: 24 }}>
        <LogoutButton />
      </div>
    </main>
  );
}
