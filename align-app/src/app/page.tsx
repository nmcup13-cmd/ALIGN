export default function Home() {
  return (
    <main style={{ maxWidth: 480, margin: "80px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
      <h1 style={{ fontSize: "1.6rem" }}>ALIGN</h1>
      <p style={{ color: "#555" }}>ระบบติดตามความสอดคล้อง CLO/PLO</p>
      <p style={{ marginTop: 32 }}>
        <a href="/login">เข้าสู่ระบบ</a> · <a href="/register">สมัครใช้งาน (อาจารย์ผู้สอน)</a>
      </p>
    </main>
  );
}
