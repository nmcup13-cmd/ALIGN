// One-time setup: creates the first program_admin account. Per align-technical-design.md
// (line 298), there is NO endpoint that creates a program_admin — only a seed script /
// deploy-time setup can. Run with: node scripts/seed-program-admin.mjs <email> <password> <name>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

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

const [, , email, password, name] = process.argv;
if (!email || !password) {
  console.error("Usage: node scripts/seed-program-admin.mjs <email> <password> [name]");
  process.exit(1);
}

const env = loadEnv(envPath);
const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY);
const app = initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth(app);
const db = getFirestore(app);

let userRecord;
try {
  userRecord = await auth.createUser({ email, password, displayName: name ?? email });
} catch (err) {
  if (err.code === "auth/email-already-exists") {
    userRecord = await auth.getUserByEmail(email);
  } else {
    throw err;
  }
}

await db
  .collection("users")
  .doc(userRecord.uid)
  .set(
    {
      user_id: userRecord.uid,
      name: name ?? email,
      email,
      role: "program_admin",
      account_status: "approved",
      approved_by: null,
      approved_at: FieldValue.serverTimestamp(),
      rejection_reason: null,
      program_admin_curriculum_scope: ["2565", "2570"],
      created_at: FieldValue.serverTimestamp(),
      is_deleted: false,
      deleted_at: null,
    },
    { merge: true },
  );

console.log(`program_admin seeded: uid=${userRecord.uid} email=${email}`);
process.exit(0);
