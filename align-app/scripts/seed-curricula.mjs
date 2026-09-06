// One-time setup script: seeds the 2 curricula (2565/2570) required before any course can be
// created. Names/years come from docs/01-requirements/01-spec/plo-course-master-data.md
// (real reference data, not test fixtures). Run with: node scripts/seed-curricula.mjs
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

const curricula = [
  {
    id: "2565",
    data: {
      curriculum_id: "2565",
      year_code: "2565",
      name: "หลักสูตรนิเทศศาสตรบัณฑิต สาขาวิชา New Media Communication พ.ศ. 2565 (เก่า)",
    },
  },
  {
    id: "2570",
    data: {
      curriculum_id: "2570",
      year_code: "2570",
      name: "หลักสูตรนิเทศศาสตรบัณฑิต สาขาวิชา New Media Communication พ.ศ. 2570 (ใหม่)",
    },
  },
];

for (const c of curricula) {
  await db.collection("curricula").doc(c.id).set(c.data, { merge: true });
  console.log(`+ curricula/${c.id}`);
}

console.log("Seed เสร็จสมบูรณ์");
process.exit(0);
