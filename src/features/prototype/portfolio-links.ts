// Single place to edit which sites portfolio links may point to.
// Types listed here accept links only from these domains (subdomains included).
// Types not listed accept any https link but are shown as unverified.
export const portfolioAllowedHosts: Record<string, string[]> = {
  repository: ["github.com", "gitlab.com", "bitbucket.org"],
  contribution: ["github.com", "gitlab.com", "bitbucket.org"],
  video: ["youtube.com", "youtu.be", "vimeo.com", "loom.com"],
};

// Link shorteners hide the real destination, so they are always refused.
export const portfolioShortenerHosts = [
  "bit.ly",
  "t.co",
  "tinyurl.com",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "buff.ly",
  "rebrand.ly",
  "cutt.ly",
  "shorturl.at",
  "lnkd.in",
  "tiny.cc",
  "rb.gy",
];

const matchesHost = (host: string, domains: string[]) =>
  domains.some((d) => host === d || host.endsWith(`.${d}`));

export type PortfolioUrlCheck = { error: string } | { host: string; verified: boolean };

export function checkPortfolioUrl(type: string, value: string): PortfolioUrlCheck {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { error: "Podaj poprawny adres URL zaczynający się od https://" };
  }
  if (url.protocol !== "https:") return { error: "Link musi zaczynać się od https://" };
  if (url.username || url.password)
    return { error: "Link nie może zawierać nazwy użytkownika ani hasła." };
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.startsWith("[") ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host)
  )
    return { error: "Link nie może wskazywać na adres IP ani localhost. Użyj nazwy domeny." };
  if (matchesHost(host, portfolioShortenerHosts))
    return { error: "Skrócone linki nie są dozwolone. Wklej pełny adres." };
  const allowed = portfolioAllowedHosts[type];
  if (allowed) {
    if (!matchesHost(host, allowed))
      return { error: `Ten rodzaj pracy przyjmuje linki tylko z: ${allowed.join(", ")}.` };
    return { host, verified: true };
  }
  return { host, verified: false };
}
