"use client";

import { useI18n } from "@/lib/i18n";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  return (
    <main className="error-page">
      <section>
        <h1>{t("editorErrorTitle")}</h1>
        <p>{t("editorErrorHelp")}</p>
        <button type="button" onClick={reset}>
          {t("retry")}
        </button>
      </section>
    </main>
  );
}
