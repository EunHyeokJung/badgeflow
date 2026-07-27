"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="error-page">
      <section>
        <span className="error-code">RECOVERY</span>
        <h1>편집 화면을 불러오지 못했습니다.</h1>
        <p>
          작업 내용은 이 브라우저에 자동 저장됩니다. 다시 시도해도 문제가
          이어지면 페이지를 새로고침해 주세요.
        </p>
        <button type="button" onClick={reset}>
          다시 시도
        </button>
      </section>
    </main>
  );
}
