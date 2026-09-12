import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";
import { decideAccount } from "./actions";
import { LogoutButton } from "../../logout-button";
import {
  Button,
  Card,
  EmptyState,
  Input,
  PageShell,
  PageTitle,
  SectionTitle,
  StatusBadge,
  TextLink,
} from "@/components/ui";

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
    <PageShell>
      <PageTitle>จัดการบัญชีผู้ใช้</PageTitle>

      <div className="mt-8">
        <SectionTitle>รออนุมัติ</SectionTitle>
        {pending.length === 0 ? (
          <div className="mt-3">
            <EmptyState>ไม่มีบัญชีที่รออนุมัติ</EmptyState>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {pending.map((u) => (
              <li key={u.id}>
                <Card className="flex flex-col gap-2">
                  <p className="text-h3 font-medium text-text-primary">
                    {u.name} <span className="text-body-sm font-normal text-text-secondary">({u.email})</span>
                  </p>
                  <p className="text-body-sm text-text-secondary">บทบาท: {u.role}</p>

                  {u.id === user.uid ? (
                    <p className="text-body-sm text-status-info">(บัญชีของคุณเอง — อนุมัติ/ปฏิเสธเองไม่ได้)</p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3 border-t border-border-default pt-3">
                      <form action={decideAccount}>
                        <input type="hidden" name="user_id" value={u.id} />
                        <input type="hidden" name="action" value="approve" />
                        <Button type="submit" variant="primary" className="px-3 py-1">
                          อนุมัติ
                        </Button>
                      </form>

                      <form action={decideAccount} className="flex items-center gap-2">
                        <input type="hidden" name="user_id" value={u.id} />
                        <input type="hidden" name="action" value="reject" />
                        <Input name="rejection_reason" placeholder="เหตุผล (ไม่บังคับ)" className="w-56" />
                        <Button type="submit" variant="secondary" className="px-3 py-1">
                          ปฏิเสธ
                        </Button>
                      </form>
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-10">
        <SectionTitle>บัญชีอื่นทั้งหมด (อนุมัติแล้ว/ถูกปฏิเสธ)</SectionTitle>
        {decided.length === 0 ? (
          <div className="mt-3">
            <EmptyState>ยังไม่มีบัญชีอื่นในระบบ</EmptyState>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {decided.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center gap-2 border-b border-border-default py-2 text-body-sm"
              >
                <span className="text-text-primary">{u.name}</span>
                <span className="text-text-secondary">({u.email})</span>
                <span className="text-text-secondary">— {u.role} —</span>
                <StatusBadge status={u.account_status} label={STATUS_LABEL[u.account_status]} />
                {u.account_status === "rejected" && u.rejection_reason && (
                  <span className="text-text-secondary">({u.rejection_reason})</span>
                )}
                {u.id === user.uid && <span className="text-status-info">— บัญชีของคุณ</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8 flex items-center gap-3 text-body-sm">
        <TextLink href="/account-status">&larr; กลับ</TextLink>
        <span className="text-border-strong">·</span>
        <LogoutButton />
      </div>
    </PageShell>
  );
}
