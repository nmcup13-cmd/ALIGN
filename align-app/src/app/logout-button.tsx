"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Button } from "@/components/ui";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/session", { method: "DELETE" });
    await signOut(auth);
    router.push("/login");
  }

  return (
    <Button variant="ghost" onClick={handleLogout} className="px-0! py-0!">
      ออกจากระบบ
    </Button>
  );
}
