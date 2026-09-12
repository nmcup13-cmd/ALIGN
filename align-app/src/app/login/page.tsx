"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Button, Card, ErrorText, Field, Input, PageShell, PageTitle, TextLink } from "@/components/ui";

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
    <PageShell width="sm">
      <PageTitle>เข้าสู่ระบบ</PageTitle>

      <Card className="mt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="อีเมล">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="รหัสผ่าน">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>

          {error && <ErrorText>{error}</ErrorText>}

          <Button type="submit" disabled={submitting} className="mt-2">
            {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-body-sm text-text-secondary">
        ยังไม่มีบัญชี? <TextLink href="/register">สมัครใช้งาน</TextLink>
      </p>
    </PageShell>
  );
}
