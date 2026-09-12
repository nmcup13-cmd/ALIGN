import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LogoutButton } from "../logout-button";
import { setActAsInstructor } from "./actions";
import { Button, Card, InfoNote, PageShell, PageTitle, StatusBadge, TextLink } from "@/components/ui";

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
    <PageShell width="sm">
      <PageTitle>สถานะบัญชีของฉัน</PageTitle>

      <Card className="mt-6 flex flex-col gap-3">
        <p className="text-body">
          {user.name} <span className="text-text-secondary">({user.email})</span>
        </p>
        <p className="text-body-sm text-text-secondary">
          บทบาท: {user.role === "program_admin" ? "ผู้บริหารหลักสูตร" : "อาจารย์ผู้สอน"}
          {user.isActingAsInstructor && " (กำลังดูมุมมองอาจารย์ผู้สอน)"}
        </p>
        <div>
          <StatusBadge
            status={user.account_status as "pending" | "approved" | "rejected"}
            label={STATUS_LABEL[user.account_status] ?? user.account_status}
          />
        </div>

        {user.role === "program_admin" && user.account_status === "approved" && (
          <form action={setActAsInstructor} className="flex flex-col gap-2 border-t border-border-default pt-4">
            <input type="hidden" name="mode" value={user.isActingAsInstructor ? "admin" : "instructor"} />
            <Button type="submit" variant="secondary" className="self-start">
              {user.isActingAsInstructor
                ? "กลับเป็นมุมมองผู้บริหารหลักสูตร"
                : "ดูในมุมมองอาจารย์ผู้สอน (กรอกข้อมูลแทนตนเอง)"}
            </Button>
            <p className="text-caption text-text-secondary">
              [เบี่ยงเบนจากสเปกจริงของ ALIGN — สเปกกำหนดว่า 1 บัญชี = 1 บทบาทตายตัว] ใช้ได้เฉพาะผู้บริหารหลักสูตรจริงเท่านั้น
              ไม่ทำให้อาจารย์ผู้สอนได้สิทธิ์ผู้บริหารหลักสูตรเพิ่มขึ้นแต่อย่างใด
            </p>
          </form>
        )}

        {user.account_status === "pending" && (
          <InfoNote>รอผู้บริหารหลักสูตรอนุมัติบัญชีนี้ก่อนจึงจะใช้งานฟีเจอร์อื่นได้</InfoNote>
        )}
        {user.account_status === "rejected" && (
          <p className="text-body-sm text-status-gap">
            บัญชีนี้ถูกปฏิเสธ{user.rejection_reason ? `: ${user.rejection_reason}` : ""}
          </p>
        )}
        {user.account_status === "approved" && (
          <p className="text-body-sm">
            ใช้งานระบบได้แล้ว — <TextLink href="/courses">ไปที่รายวิชา</TextLink>
            {user.effectiveRole === "program_admin" && (
              <>
                {" "}
                · <TextLink href="/admin/accounts">จัดการบัญชีผู้ใช้</TextLink>
              </>
            )}
          </p>
        )}
      </Card>

      <div className="mt-6">
        <LogoutButton />
      </div>
    </PageShell>
  );
}
