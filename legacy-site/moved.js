const STORAGE_KEY = "lanyardstudio-moved-locale-v1";
const ANALYTICS_ID = "G-WES0G3FJY5";

const translations = {
  ko: {
    documentTitle: "LanyardStudio 웹사이트가 이전되었습니다",
    languageLabel: "언어",
    skipLink: "이전 안내로 건너뛰기",
    title: "LanyardStudio 웹사이트가 이전되었습니다",
    description: "공식 웹사이트를 새로운 주소에서 계속 이용할 수 있습니다.",
    addressLabel: "새 주소",
    openSite: "새 웹사이트로 이동",
    bookmarkNote: "즐겨찾기에 저장된 주소도 새 주소로 변경해 주세요.",
  },
  en: {
    documentTitle: "LanyardStudio has moved",
    languageLabel: "Language",
    skipLink: "Skip to the notice",
    title: "LanyardStudio has moved",
    description: "The official website is now available at a new address.",
    addressLabel: "New address",
    openSite: "Open the new website",
    bookmarkNote: "Please update your bookmark to the new address.",
  },
  ja: {
    documentTitle: "LanyardStudioは移転しました",
    languageLabel: "言語",
    skipLink: "移転のお知らせへ移動",
    title: "LanyardStudioは移転しました",
    description: "公式サイトは新しいアドレスで引き続きご利用いただけます。",
    addressLabel: "新しいアドレス",
    openSite: "新しいサイトを開く",
    bookmarkNote: "ブックマークを新しいアドレスに変更してください。",
  },
  "zh-CN": {
    documentTitle: "LanyardStudio 网站已迁移",
    languageLabel: "语言",
    skipLink: "跳转到迁移通知",
    title: "LanyardStudio 网站已迁移",
    description: "您可以继续通过新地址使用官方网站。",
    addressLabel: "新地址",
    openSite: "前往新网站",
    bookmarkNote: "请将书签更新为新地址。",
  },
  "zh-TW": {
    documentTitle: "LanyardStudio 網站已搬遷",
    languageLabel: "語言",
    skipLink: "跳至搬遷通知",
    title: "LanyardStudio 網站已搬遷",
    description: "您可以繼續透過新網址使用官方網站。",
    addressLabel: "新網址",
    openSite: "前往新網站",
    bookmarkNote: "請將書籤更新為新網址。",
  },
  es: {
    documentTitle: "LanyardStudio se ha trasladado",
    languageLabel: "Idioma",
    skipLink: "Ir al aviso de traslado",
    title: "LanyardStudio se ha trasladado",
    description: "El sitio web oficial ya está disponible en una nueva dirección.",
    addressLabel: "Nueva dirección",
    openSite: "Abrir el nuevo sitio web",
    bookmarkNote: "Actualiza tu marcador con la nueva dirección.",
  },
  fr: {
    documentTitle: "LanyardStudio a déménagé",
    languageLabel: "Langue",
    skipLink: "Accéder à l’avis de déplacement",
    title: "LanyardStudio a déménagé",
    description: "Le site officiel est désormais disponible à une nouvelle adresse.",
    addressLabel: "Nouvelle adresse",
    openSite: "Ouvrir le nouveau site",
    bookmarkNote: "Veuillez mettre à jour votre favori avec la nouvelle adresse.",
  },
  de: {
    documentTitle: "LanyardStudio ist umgezogen",
    languageLabel: "Sprache",
    skipLink: "Zum Umzugshinweis springen",
    title: "LanyardStudio ist umgezogen",
    description: "Die offizielle Website ist jetzt unter einer neuen Adresse erreichbar.",
    addressLabel: "Neue Adresse",
    openSite: "Neue Website öffnen",
    bookmarkNote: "Bitte aktualisieren Sie Ihr Lesezeichen auf die neue Adresse.",
  },
};

function normalizeLocale(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized.startsWith("ko")) return "ko";
  if (normalized.startsWith("ja")) return "ja";
  if (normalized.startsWith("zh-tw") || normalized.startsWith("zh-hk")) {
    return "zh-TW";
  }
  if (normalized.startsWith("zh")) return "zh-CN";
  if (normalized.startsWith("es")) return "es";
  if (normalized.startsWith("fr")) return "fr";
  if (normalized.startsWith("de")) return "de";
  return normalized.startsWith("en") ? "en" : null;
}

function detectLocale() {
  try {
    const stored = normalizeLocale(localStorage.getItem(STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // Private browsing may block persistent storage.
  }

  for (const language of navigator.languages || [navigator.language]) {
    const locale = normalizeLocale(language);
    if (locale) return locale;
  }
  return "en";
}

function applyLocale(locale) {
  const selectedLocale = translations[locale] ? locale : "en";
  const dictionary = translations[selectedLocale];
  document.documentElement.lang = selectedLocale;
  document.title = dictionary.documentTitle;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (dictionary[key]) element.textContent = dictionary[key];
  });

  const languageSelect = document.querySelector("#language-select");
  languageSelect.value = selectedLocale;

  try {
    localStorage.setItem(STORAGE_KEY, selectedLocale);
  } catch {
    // The language still applies for the current visit.
  }
}

function initializeAnalytics() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...values) {
    window.dataLayer.push(values);
  };
  window.gtag("js", new Date());
  window.gtag("config", ANALYTICS_ID, {
    service_name: "lanyardstudio-moved",
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_ID}`;
  document.head.append(script);
}

const languageSelect = document.querySelector("#language-select");
languageSelect.addEventListener("change", (event) => {
  applyLocale(event.target.value);
});

applyLocale(detectLocale());
initializeAnalytics();
