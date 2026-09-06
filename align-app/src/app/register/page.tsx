"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken();

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, name }),
      });
      if (!res.ok) {
        throw new Error((await res.json()).error ?? "สมัครไม่สำเร็จ");
      }

      router.push("/account-status");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(
        message.includes("auth/email-already-in-use")
          ? "อีเมลนี้มีผู้ใช้แล้ว"
          : message,
      );
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.4rem" }}>สมัครใช้งาน (อาจารย์ผู้สอน)</h1>
      <p style={{ color: "#555" }}>สมัครแล้วบัญชีจะอยู่ในสถานะ &quot;รออนุมัติ&quot; จนกว่าผู้บริหารหลักสูตรจะอนุมัติ</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
        <label style={{ fontWeight: 600 }}>
          ชื่อ-นามสกุล
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ width: "100%", padding: 8, marginTop: 4, fontSize: "1rem", boxSizing: "border-box" }}
          />
        </label>
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
            minLength={6}
            style={{ width: "100%", padding: 8, marginTop: 4, fontSize: "1rem", boxSizing: "border-box" }}
          />
        </label>

        {error && <p style={{ color: "#900" }}>{error}</p>}

        <button type="submit" disabled={submitting} style={{ padding: "10px 16px", fontSize: "1rem", cursor: "pointer" }}>
          {submitting ? "กำลังสมัคร..." : "สมัครใช้งาน"}
        </button>
      </form>

      <p style={{ marginTop: 24 }}>
        มีบัญชีแล้ว? <a href="/login">เข้าสู่ระบบ</a>
      </p>
    </main>
  );
}
