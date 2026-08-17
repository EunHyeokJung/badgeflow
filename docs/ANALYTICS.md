# Analytics setup

LanyardStudio ships with an optional GA4 integration. No analytics script is
included unless `NEXT_PUBLIC_GA_MEASUREMENT_ID` contains a valid `G-...` ID.

## Recommended account structure

Use one GA4 property and one web data stream for `silverhyeok.dev` and its
services. Reuse the same measurement ID on:

- `silverhyeok.dev`
- `lanyardstudio.silverhyeok.dev`
- future `*.silverhyeok.dev` services
- services mounted below the apex domain, such as `/lanyardstudio`

GA4 records the page URL, so hostname and path can separate each service. The
integration also sends `service_name=lanyardstudio`; register `service_name` as
an event-scoped custom dimension when a stable product-level filter is useful.

In GA4, open **Admin → Data streams → Web → Configure tag settings → Configure
your domains** and include `silverhyeok.dev` plus its subdomains. Keep the
default highest-level cookie domain unless a service has a specific reason to
override it.

## Cloudflare Pages

Configure both Preview and Production when analytics is wanted in both:

```text
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_ANALYTICS_SERVICE_NAME=lanyardstudio
```

These are build-time public identifiers, not secrets. After changing either
value, trigger a new Pages deployment.

## Future services

Reuse the same measurement ID and give each service a unique
`NEXT_PUBLIC_ANALYTICS_SERVICE_NAME`. Do not combine the embedded Google tag
with a second GA4 page-view tag from Google Tag Manager or Cloudflare Zaraz, or
page views will be counted twice.

Cloudflare Zaraz is a useful alternative when all sites are proxied through one
Cloudflare zone and centralized tag administration matters more than maximum
Google tag compatibility. If Zaraz is adopted later, leave
`NEXT_PUBLIC_GA_MEASUREMENT_ID` empty in every application.

Before enabling analytics for public traffic, add an appropriate privacy notice
and consent flow for the regions and audiences the services support. Google
Consent Mode consumes a visitor's consent choice; it does not provide the
consent banner itself.
