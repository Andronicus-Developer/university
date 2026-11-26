export interface CountryOption {
  name: string;
  code: string; // Uppercase ISO 3166-1 alpha-2 (or "OTHER")
  flagEmoji: string;
  aliases?: string[];
}

export const OTHER_COUNTRY_CODE = "OTHER";
export const OTHER_COUNTRY_NAME = "Other (Outside Africa)";

// All 54 sovereign African nations in alphabetical order
export const AFRICAN_COUNTRIES: CountryOption[] = [
  { name: "Algeria", code: "DZ", flagEmoji: "🇩🇿", aliases: ["people's democratic republic of algeria"] },
  { name: "Angola", code: "AO", flagEmoji: "🇦🇴" },
  { name: "Benin", code: "BJ", flagEmoji: "🇧🇯" },
  { name: "Botswana", code: "BW", flagEmoji: "🇧🇼" },
  { name: "Burkina Faso", code: "BF", flagEmoji: "🇧🇫" },
  { name: "Burundi", code: "BI", flagEmoji: "🇧🇮" },
  { name: "Cabo Verde", code: "CV", flagEmoji: "🇨🇻", aliases: ["cape verde"] },
  { name: "Cameroon", code: "CM", flagEmoji: "🇨🇲", aliases: ["cameroun"] },
  { name: "Central African Republic", code: "CF", flagEmoji: "🇨🇫", aliases: ["car"] },
  { name: "Chad", code: "TD", flagEmoji: "🇹🇩", aliases: ["tchad"] },
  { name: "Comoros", code: "KM", flagEmoji: "🇰🇲" },
  { name: "Congo (Republic of the Congo)", code: "CG", flagEmoji: "🇨🇬", aliases: ["republic of the congo", "congo-brazzaville", "congo"] },
  { name: "Côte d'Ivoire", code: "CI", flagEmoji: "🇨🇮", aliases: ["cote d'ivoire", "cote divoire", "ivory coast"] },
  { name: "DR Congo", code: "CD", flagEmoji: "🇨🇩", aliases: ["democratic republic of the congo", "drc", "congo-kinshasa"] },
  { name: "Djibouti", code: "DJ", flagEmoji: "🇩🇯" },
  { name: "Egypt", code: "EG", flagEmoji: "🇪🇬" },
  { name: "Equatorial Guinea", code: "GQ", flagEmoji: "🇬🇶" },
  { name: "Eritrea", code: "ER", flagEmoji: "🇪🇷" },
  { name: "Eswatini", code: "SZ", flagEmoji: "🇸🇿", aliases: ["swaziland"] },
  { name: "Ethiopia", code: "ET", flagEmoji: "🇪🇹" },
  { name: "Gabon", code: "GA", flagEmoji: "🇬🇦" },
  { name: "Gambia", code: "GM", flagEmoji: "🇬🇲", aliases: ["the gambia"] },
  { name: "Ghana", code: "GH", flagEmoji: "🇬🇭", aliases: ["republic of ghana"] },
  { name: "Guinea", code: "GN", flagEmoji: "🇬🇳", aliases: ["guinea-conakry"] },
  { name: "Guinea-Bissau", code: "GW", flagEmoji: "🇬🇼", aliases: ["guinea bissau"] },
  { name: "Kenya", code: "KE", flagEmoji: "🇰🇪", aliases: ["republic of kenya"] },
  { name: "Lesotho", code: "LS", flagEmoji: "🇱🇸" },
  { name: "Liberia", code: "LR", flagEmoji: "🇱🇷" },
  { name: "Libya", code: "LY", flagEmoji: "🇱🇾" },
  { name: "Madagascar", code: "MG", flagEmoji: "🇲🇬" },
  { name: "Malawi", code: "MW", flagEmoji: "🇲🇼" },
  { name: "Mali", code: "ML", flagEmoji: "🇲🇱" },
  { name: "Mauritania", code: "MR", flagEmoji: "🇲🇷" },
  { name: "Mauritius", code: "MU", flagEmoji: "🇲🇺" },
  { name: "Morocco", code: "MA", flagEmoji: "🇲🇦" },
  { name: "Mozambique", code: "MZ", flagEmoji: "🇲🇿" },
  { name: "Namibia", code: "NA", flagEmoji: "🇳🇦" },
  { name: "Niger", code: "NE", flagEmoji: "🇳🇪" },
  { name: "Nigeria", code: "NG", flagEmoji: "🇳🇬", aliases: ["federal republic of nigeria"] },
  { name: "Rwanda", code: "RW", flagEmoji: "🇷🇼" },
  { name: "São Tomé and Príncipe", code: "ST", flagEmoji: "🇸🇹", aliases: ["sao tome and principe", "sao tome"] },
  { name: "Senegal", code: "SN", flagEmoji: "🇸🇳" },
  { name: "Seychelles", code: "SC", flagEmoji: "🇸🇨" },
  { name: "Sierra Leone", code: "SL", flagEmoji: "🇸🇱" },
  { name: "Somalia", code: "SO", flagEmoji: "🇸🇴" },
  { name: "South Africa", code: "ZA", flagEmoji: "🇿🇦", aliases: ["rsa", "republic of south africa"] },
  { name: "South Sudan", code: "SS", flagEmoji: "🇸🇸" },
  { name: "Sudan", code: "SD", flagEmoji: "🇸🇩" },
  { name: "Tanzania", code: "TZ", flagEmoji: "🇹🇿", aliases: ["united republic of tanzania"] },
  { name: "Togo", code: "TG", flagEmoji: "🇹🇬" },
  { name: "Tunisia", code: "TN", flagEmoji: "🇹🇳" },
  { name: "Uganda", code: "UG", flagEmoji: "🇺🇬" },
  { name: "Zambia", code: "ZM", flagEmoji: "🇿🇲" },
  { name: "Zimbabwe", code: "ZW", flagEmoji: "🇿🇼" },
];

export const ALL_SCHOOL_COUNTRY_OPTIONS: CountryOption[] = [
  ...AFRICAN_COUNTRIES,
  {
    name: OTHER_COUNTRY_NAME,
    code: OTHER_COUNTRY_CODE,
    flagEmoji: "🌍",
    aliases: ["other", "international", "outside africa"],
  },
];

const NON_AFRICAN_CODE_FALLBACK: Array<{ name: string; code: string; aliases?: string[] }> = [
  { name: "United Kingdom", code: "GB", aliases: ["uk", "great britain", "england"] },
  { name: "United States", code: "US", aliases: ["usa", "united states of america", "america"] },
  { name: "Canada", code: "CA" },
  { name: "Germany", code: "DE" },
  { name: "France", code: "FR" },
  { name: "United Arab Emirates", code: "AE", aliases: ["uae", "dubai"] },
  { name: "India", code: "IN" },
  { name: "China", code: "CN" },
  { name: "Australia", code: "AU" },
];

function normalizeText(value?: string | null): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function findCountryOption(input?: string | null, codeInput?: string | null): CountryOption | null {
  const normCode = String(codeInput || "").trim().toUpperCase();
  if (normCode) {
    const byCode = ALL_SCHOOL_COUNTRY_OPTIONS.find((item) => item.code === normCode);
    if (byCode) return byCode;
  }

  const normName = normalizeText(input);
  if (!normName) return null;

  for (const item of ALL_SCHOOL_COUNTRY_OPTIONS) {
    if (normalizeText(item.name) === normName || item.code.toLowerCase() === normName) {
      return item;
    }
    if (item.aliases?.some((alias) => normalizeText(alias) === normName)) {
      return item;
    }
  }

  return null;
}

export function extractCountryFromAddress(address?: string | null): string {
  const raw = String(address || "").trim();
  if (!raw) return "";
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const match = findCountryOption(parts[i]);
    if (match) return match.name;
  }
  const lower = normalizeText(raw);
  for (const item of AFRICAN_COUNTRIES) {
    if (lower.includes(normalizeText(item.name))) {
      return item.name;
    }
  }
  return "";
}

export function resolveSchoolCountry(params: {
  country?: string | null;
  countryCode?: string | null;
  address?: string | null;
}): { country: string; countryCode: string; flagEmoji: string } {
  const rawCountry = String(params.country || "").trim();
  const rawCode = String(params.countryCode || "").trim().toUpperCase();

  const direct = findCountryOption(rawCountry, rawCode);
  if (direct) {
    return {
      country: direct.name,
      countryCode: direct.code,
      flagEmoji: direct.flagEmoji,
    };
  }

  if (rawCountry) {
    const norm = normalizeText(rawCountry);
    const nonAfrican = NON_AFRICAN_CODE_FALLBACK.find(
      (c) => normalizeText(c.name) === norm || c.aliases?.some((a) => normalizeText(a) === norm)
    );
    if (nonAfrican) {
      return {
        country: rawCountry,
        countryCode: rawCode || nonAfrican.code,
        flagEmoji: "🌐",
      };
    }
    if (/^[A-Z]{2}$/.test(rawCode)) {
      return { country: rawCountry, countryCode: rawCode, flagEmoji: "🌍" };
    }
    return {
      country: rawCountry,
      countryCode: OTHER_COUNTRY_CODE,
      flagEmoji: "🌍",
    };
  }

  const fromAddress = extractCountryFromAddress(params.address);
  if (fromAddress) {
    const matched = findCountryOption(fromAddress);
    if (matched) {
      return {
        country: matched.name,
        countryCode: matched.code,
        flagEmoji: matched.flagEmoji,
      };
    }
  }

  return { country: "", countryCode: "", flagEmoji: "" };
}

export function getFlagCdnUrl(countryCode?: string | null): string | null {
  const code = String(countryCode || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  return `https://flagcdn.com/${code.toLowerCase()}.svg`;
}
