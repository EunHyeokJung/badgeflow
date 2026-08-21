import Script from "next/script";

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
const serviceName =
  process.env.NEXT_PUBLIC_ANALYTICS_SERVICE_NAME?.trim() || "lanyardstudio";
const analyticsDomains = [
  "lanyard-studio.com",
  "lanyardstudio.silverhyeok.dev",
];

export function GoogleAnalytics() {
  if (!measurementId || !/^G-[A-Z0-9]+$/i.test(measurementId)) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', ${JSON.stringify(measurementId)}, {
            service_name: ${JSON.stringify(serviceName)},
            linker: {
              domains: ${JSON.stringify(analyticsDomains)}
            }
          });
        `}
      </Script>
    </>
  );
}
