// One-time setup script: seeds PLOs (Program Learning Outcomes) for both curricula — real,
// shared, curriculum-level data from docs/01-requirements/01-spec/plo-course-master-data.md.
//
// CLOs are course-specific and must be entered by each course's own instructor via the real
// "จัดการรายวิชา" UI (/courses/{curriculumId}/{code}) — this script used to also fake CLO/mapping
// data per course before that UI existed; that was wrong (every course got the same 3 generic
// CLOs) and has been removed. Only PLOs — genuinely shared across all courses in a curriculum —
// belong in a seed script.
//
// Run with: node scripts/seed-clo-plo.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");

function loadEnv(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    env[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return env;
}

const env = loadEnv(envPath);
const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY);
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

const PLOS_BY_CURRICULUM = {
  "2565": [
    { code: "PLO1", description: "ผู้เรียนสามารถใช้ภาษาในการสื่อสารได้อย่างมีประสิทธิภาพ" },
    {
      code: "PLO2",
      description: "ผู้เรียนสามารถใช้เทคโนโลยีการสื่อสารดิจิทัลอย่างรู้เท่าทันทั้งในฐานะผู้รับสารและผู้ส่งสารได้",
    },
    { code: "PLO3", description: "ผู้เรียนสามารถจัดการชีวิตตนเองอย่างมีคุณธรรมและยึดมั่นในจริยธรรมของวิชาชีพ" },
    {
      code: "PLO4",
      description:
        "ผู้เรียนสามารถทำงานร่วมกับผู้อื่นและแสดงออกถึงคุณลักษณะความเป็นพลเมืองที่มีคุณค่าต่อชุมชน สังคมไทยและสังคมโลก",
    },
    { code: "PLO5", description: "ผู้เรียนสามารถแสดงออกซึ่งทักษะการเรียนรู้ตลอดชีวิต" },
  ],
  "2570": [
    {
      code: "PLO1",
      description:
        "ใช้หลักการและทฤษฎีด้านการสื่อสารและสื่อใหม่ เป็นฐานคิดในการสร้างสรรค์เนื้อหาและออกแบบการสื่อสารระดับวิชาชีพได้อย่างถูกต้อง",
    },
    {
      code: "PLO2",
      description:
        "ออกแบบเนื้อหาสื่อใหม่ได้อย่างสร้างสรรค์และเป็นระบบ โดยคำนึงถึงบริบทของกลุ่มเป้าหมายที่หลากหลาย บนพื้นฐานของการรู้เท่าทันสื่อ วิจารณญาณ และจรรยาบรรณวิชาชีพ",
    },
    {
      code: "PLO3",
      description:
        "ผลิตชิ้นงานสื่อใหม่โดยประยุกต์ใช้เทคโนโลยีดิจิทัลและปัญญาประดิษฐ์ อย่างชาญฉลาด และเท่าทันต่อการเปลี่ยนแปลงของอุตสาหกรรมสื่อ",
    },
    {
      code: "PLO4",
      description: "สื่อสารผ่านสื่อใหม่โดยใช้ข้อมูลและการคิดวิเคราะห์ เพื่อให้เข้าถึงกลุ่มเป้าหมายได้อย่างตรงจุดและเกิดผลลัพธ์ที่วัดได้",
    },
    {
      code: "PLO5",
      description:
        "บริหารจัดการสื่อใหม่เพื่อสร้างคุณค่าเชิงเศรษฐกิจและผลกระทบเชิงบวกต่อชุมชนและสังคม อย่างมีวิจารณญาณและความรับผิดชอบ",
    },
  ],
};

for (const [curriculumId, plos] of Object.entries(PLOS_BY_CURRICULUM)) {
  const curriculumRef = db.collection("curricula").doc(curriculumId);
  for (const plo of plos) {
    await curriculumRef.collection("plos").doc(plo.code).set(
      {
        plo_id: plo.code,
        curriculum_id: curriculumId,
        code: plo.code,
        description: plo.description,
        is_deleted: false,
        deleted_at: null,
      },
      { merge: true },
    );
    console.log(`+ curricula/${curriculumId}/plos/${plo.code}`);
  }
}

console.log("Seed เสร็จสมบูรณ์");
process.exit(0);
