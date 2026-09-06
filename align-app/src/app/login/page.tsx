"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken();

      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        throw new Error((await res.json()).error ?? "เข้าสู่ระบบไม่สำเร็จ");
      }

      router.push("/account-status");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message.includes("auth/invalid-credential") ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง" : message);
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.4rem" }}>เข้าสู่ระบบ</h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
        <label style={{ fontWeight: 600 }}>
          อีเมล
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: 8, marginTop: 4, fontSize: "1rem", boxSizing: "border-box" }}
          />
        </label>
        <label style={{ fontWeight: 600 }}>
          รหัสผ่าน
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: 8, marginTop: 4, fontSize: "1rem", boxSizing: "border-box" }}
          />
        </label>

        {error && <p style={{ color: "#900" }}>{error}</p>}

        <button type="submit" disabled={submitting} style={{ padding: "10px 16px", fontSize: "1rem", cursor: "pointer" }}>
          {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>

      <p style={{ marginTop: 24 }}>
        ยังไม่มีบัญชี? <a href="/register">สมัครใช้งาน</a>
      </p>
    </main>
  );
}
