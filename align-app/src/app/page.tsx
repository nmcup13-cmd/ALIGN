import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-20 text-center">
      <span className="text-h1 font-semibold text-primary-green">ALIGN</span>
      <p className="max-w-sm text-body text-text-secondary">ระบบติดตามความสอดคล้อง CLO/PLO</p>
      <div className="flex items-center gap-3 text-body-sm">
        <Link href="/login" className="text-primary-green underline underline-offset-2 hover:text-primary-green-dark">
          เข้าสู่ระบบ
        </Link>
        <span className="text-border-strong">·</span>
        <Link href="/register" className="text-primary-green underline underline-offset-2 hover:text-primary-green-dark">
          สมัครใช้งาน (อาจารย์ผู้สอน)
        </Link>
      </div>
    </main>
  );
}
