"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/session", { method: "DELETE" });
    await signOut(auth);
    router.push("/login");
  }

  return (
    <button onClick={handleLogout} style={{ padding: "6px 12px", cursor: "pointer" }}>
      ออกจากระบบ
    </button>
  );
}
