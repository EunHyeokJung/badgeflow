"use client";

import { useI18n } from "@/lib/i18n";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale, t } = useI18n();

  return (
    <html lang={locale}>
      <body>
        <main className="error-page">
          <section>
            <h1>{t("globalErrorTitle")}</h1>
            <p>{t("globalErrorHelp")}</p>
            <button type="button" onClick={reset}>
              {t("reopenApp")}
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
