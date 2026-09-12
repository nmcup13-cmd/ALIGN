import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { createCourse } from "./actions";
import { CourseSelectFields } from "./course-select-fields";
import { Button, Card, Field, InfoNote, Input, PageShell, PageTitle, TextLink } from "@/components/ui";

// Reads Firestore per-request — must not be statically cached at build time.
export const dynamic = "force-dynamic";

export default async function NewCoursePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.account_status !== "approved") {
    redirect("/account-status");
  }

  const curriculaSnap = await adminDb.collection("curricula").orderBy("year_code").get();
  const curricula = curriculaSnap.docs.map((doc) => ({
    id: doc.id,
    name: (doc.data().name as string) ?? doc.id,
  }));

  return (
    <PageShell>
      <PageTitle>เพิ่มรายวิชาใหม่</PageTitle>

      <Card className="mt-6">
        <form action={createCourse} className="flex flex-col gap-4">
          <CourseSelectFields curricula={curricula} />

          {user.effectiveRole === "program_admin" && (
            <Field label="Instructor UID (มอบหมายให้อาจารย์ท่านอื่น)">
              <Input name="instructor_id" required placeholder="Firebase Auth UID ของอาจารย์ผู้สอนหลัก" />
            </Field>
          )}

          <Button type="submit" disabled={curricula.length === 0} className="mt-2">
            บันทึกรายวิชา
          </Button>
        </form>
      </Card>

      {curricula.length === 0 && (
        <div className="mt-4">
          <InfoNote>
            ยังไม่มีข้อมูลหลักสูตรในระบบ — รัน <code className="font-mono text-text-primary">node scripts/seed-curricula.mjs</code> ก่อน
          </InfoNote>
        </div>
      )}

      <p className="mt-6 text-body-sm">
        <TextLink href="/courses">&larr; กลับหน้ารายการ</TextLink>
      </p>
    </PageShell>
  );
}
