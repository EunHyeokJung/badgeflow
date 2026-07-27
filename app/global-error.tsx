"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body>
        <main className="error-page">
          <section>
            <span className="error-code">BADGEFLOW</span>
            <h1>예상하지 못한 오류가 발생했습니다.</h1>
            <p>
              브라우저에 저장된 프로젝트는 유지됩니다. 잠시 후 다시 시도해
              주세요.
            </p>
            <button type="button" onClick={reset}>
              앱 다시 열기
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
