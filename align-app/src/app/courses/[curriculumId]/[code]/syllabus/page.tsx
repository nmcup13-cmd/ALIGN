import { redirect, notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { Button, CurriculumTag, Field, InfoNote, Input, PageShell, PageTitle, TextLink } from "@/components/ui";
import { updateSyllabus } from "./actions";

export const dynamic = "force-dynamic";

const WEEKS = Array.from({ length: 15 }, (_, i) => i + 1);

export default async function CourseSyllabusPage({
  params,
}: {
  params: Promise<{ curriculumId: string; code: string }>;
}) {
  const { curriculumId, code } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.account_status !== "approved") redirect("/account-status");

  const curriculumRef = adminDb.collection("curricula").doc(curriculumId);
  const courseRef = curriculumRef.collection("courses").doc(code);
  const courseSnap = await courseRef.get();
  if (!courseSnap.exists) notFound();
  const course = courseSnap.data() as { name: string; instructor_id: string };

  if (user.effectiveRole !== "instructor" || user.uid !== course.instructor_id) {
    redirect("/courses");
  }

  const syllabusSnap = await courseRef.collection("syllabus").doc("main").get();
  const content = syllabusSnap.exists
    ? ((syllabusSnap.data() as { content?: { week_no: number; topic: string }[] }).content ?? [])
    : [];
  const topicByWeek = new Map(content.map((c) => [c.week_no, c.topic]));

  return (
    <PageShell width="md">
      <div className="flex items-center gap-3">
        <PageTitle>กำหนด Course Syllabus</PageTitle>
        <CurriculumTag id={curriculumId} />
      </div>
      <p className="mt-1 text-body-sm text-text-secondary">
        {code} — {course.name}
      </p>

      <InfoNote>
        นี่คือหัวข้อที่วางแผนสอนรายสัปดาห์ ใช้เป็นข้อมูลอ้างอิงให้ AI เปรียบเทียบกับบันทึกการสอนจริง ไม่ใช่ไฟล์ syllabus ทางการของวิชา
      </InfoNote>

      <form action={updateSyllabus} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="curriculum_id" value={curriculumId} />
        <input type="hidden" name="code" value={code} />

        {WEEKS.map((week) => (
          <Field key={week} label={`สัปดาห์ที่ ${week}`}>
            <Input
              type="text"
              name={`topic_${week}`}
              defaultValue={topicByWeek.get(week) ?? ""}
              placeholder="หัวข้อที่วางแผนสอน (เว้นว่างได้ถ้ายังไม่กำหนด)"
            />
          </Field>
        ))}

        <div>
          <Button type="submit" variant="primary">
            บันทึก Syllabus
          </Button>
        </div>
      </form>

      <div className="mt-8">
        <TextLink href={`/courses/${curriculumId}/${code}`}>&larr; กลับไปหน้าจัดการรายวิชา</TextLink>
      </div>
    </PageShell>
  );
}
