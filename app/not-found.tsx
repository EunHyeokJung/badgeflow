import Link from "next/link";

export default function NotFound() {
  return (
    <main className="error-page">
      <section>
        <span className="error-code">404</span>
        <h1>요청한 페이지를 찾을 수 없습니다.</h1>
        <p>BadgeFlow 시작 화면에서 새 명찰 프로젝트를 열어 주세요.</p>
        <Link href="/">시작 화면으로</Link>
      </section>
    </main>
  );
}
