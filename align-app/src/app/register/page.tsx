"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import {
  Button,
  Card,
  ErrorText,
  Field,
  InfoNote,
  Input,
  PageShell,
  PageTitle,
  TextLink,
} from "@/components/ui";

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
      setError(message.includes("auth/email-already-in-use") ? "อีเมลนี้มีผู้ใช้แล้ว" : message);
      setSubmitting(false);
    }
  }

  return (
    <PageShell width="sm">
      <PageTitle>สมัครใช้งาน (อาจารย์ผู้สอน)</PageTitle>
      <InfoNote>สมัครแล้วบัญชีจะอยู่ในสถานะ &quot;รออนุมัติ&quot; จนกว่าผู้บริหารหลักสูตรจะอนุมัติ</InfoNote>

      <Card className="mt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="ชื่อ-นามสกุล">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="อีเมล">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="รหัสผ่าน">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </Field>

          {error && <ErrorText>{error}</ErrorText>}

          <Button type="submit" disabled={submitting} className="mt-2">
            {submitting ? "กำลังสมัคร..." : "สมัครใช้งาน"}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-body-sm text-text-secondary">
        มีบัญชีแล้ว? <TextLink href="/login">เข้าสู่ระบบ</TextLink>
      </p>
    </PageShell>
  );
}
