import { redirect, notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { CurriculumTag, InfoNote, PageShell, PageTitle, TextLink } from "@/components/ui";
import { TeachingRecordForm } from "./teaching-record-form";

export const dynamic = "force-dynamic";

export default async function NewTeachingRecordPage({
  params,
}: {
  params: Promise<{ curriculumId: string; code: string }>;
}) {
  const { curriculumId, code } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.account_status !== "approved") redirect("/account-status");

  const courseSnap = await adminDb.collection("curricula").doc(curriculumId).collection("courses").doc(code).get();
  if (!courseSnap.exists) notFound();
  const course = courseSnap.data() as { name: string; instructor_id: string; clo_plo_ready: boolean };

  if (user.effectiveRole !== "instructor" || user.uid !== course.instructor_id) {
    redirect("/courses");
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <PageShell width="md">
      <div className="flex items-center gap-3">
        <PageTitle>บันทึกการสอน</PageTitle>
        <CurriculumTag id={curriculumId} />
      </div>
      <p className="mt-1 text-body-sm text-text-secondary">
        {code} — {course.name}
      </p>

      <div className="mt-6">
        {!course.clo_plo_ready ? (
          <InfoNote>
            วิชานี้ยังไม่ได้ผูก CLO–PLO — ต้องผูก CLO อย่างน้อย 1 ข้อกับ PLO อย่างน้อย 1 ข้อก่อน จึงจะบันทึกการสอนได้ (กฎ #1)
          </InfoNote>
        ) : (
          <TeachingRecordForm curriculumId={curriculumId} code={code} today={today} />
        )}
      </div>

      <div className="mt-8">
        <TextLink href="/courses">&larr; กลับ</TextLink>
      </div>
    </PageShell>
  );
}
