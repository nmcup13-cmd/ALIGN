import { redirect, notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { Button, Card, CurriculumTag, Field, Input, PageShell, PageTitle, TextLink, EmptyState } from "@/components/ui";
import { createPlo } from "./actions";
import { PloRow } from "./plo-row";

export const dynamic = "force-dynamic";

export default async function ManagePlosPage({
  params,
}: {
  params: Promise<{ curriculumId: string }>;
}) {
  const { curriculumId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.account_status !== "approved") redirect("/account-status");

  // Authorization check: must be program_admin with scope
  if (user.effectiveRole !== "program_admin" || !(user.program_admin_curriculum_scope ?? []).includes(curriculumId)) {
    redirect("/dashboard");
  }

  // Verify curriculum exists
  const curriculumRef = adminDb.collection("curricula").doc(curriculumId);
  const curriculumSnap = await curriculumRef.get();
  if (!curriculumSnap.exists) notFound();
  const curriculum = curriculumSnap.data() as { name: string };

  // Load all PLOs (including soft-deleted)
  const plosSnap = await curriculumRef.collection("plos").get();
  const plos = plosSnap.docs
    .map((d) => {
      const data = d.data() as { code: string; description: string; is_deleted: boolean };
      return {
        code: d.id,
        description: data.description,
        isDeleted: data.is_deleted,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

  return (
    <PageShell width="md">
      <div className="flex items-center gap-3">
        <PageTitle>จัดการ PLO</PageTitle>
        <CurriculumTag id={curriculumId} />
      </div>
      <p className="mt-1 text-body-sm text-text-secondary">{curriculum.name}</p>

      <div className="mt-6 flex flex-col gap-4">
        {plos.length === 0 ? (
          <EmptyState>ยังไม่มี PLO ในหลักสูตรนี้</EmptyState>
        ) : (
          <div className="flex flex-col gap-3">
            {plos.map((plo) => (
              <PloRow key={plo.code} plo={plo} curriculumId={curriculumId} />
            ))}
          </div>
        )}

        <Card>
          <form action={createPlo} className="flex items-end gap-3">
            <input type="hidden" name="curriculum_id" value={curriculumId} />
            <Field label="เพิ่ม PLO ใหม่">
              <Input type="text" name="description" placeholder="คำอธิบาย PLO" required className="w-96" />
            </Field>
            <Button type="submit" variant="primary">
              เพิ่ม PLO
            </Button>
          </form>
        </Card>
      </div>

      <div className="mt-8">
        <TextLink href="/dashboard">&larr; กลับ</TextLink>
      </div>
    </PageShell>
  );
}
