// Embedded high-fidelity vector icons as SVG data URIs and official CDN URLs for cloaking

export const FROSTED_ICON_SVG = `data:image/svg+xml,${encodeURIComponent(
  `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" rx="14" fill="#000000"/>
  <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="13.25" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.3"/>
  <g stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="32" y1="14" x2="32" y2="50"/>
    <line x1="16.4" y1="23" x2="47.6" y2="41"/>
    <line x1="16.4" y1="41" x2="47.6" y2="23"/>
    <path d="M27 19 L32 24 L37 19"/>
    <path d="M27 45 L32 40 L37 45"/>
    <path d="M19 28 L25 28 L23 21"/>
    <path d="M45 36 L39 36 L41 43"/>
    <path d="M19 36 L25 36 L23 43"/>
    <path d="M45 28 L39 28 L41 21"/>
  </g>
  <polygon points="32,27 37,32 32,37 27,32" fill="#ffffff"/>
</svg>
`.trim(),
)}`;

export const CLASSROOM_FAVICON = "https://ssl.gstatic.com/classroom/favicon.png";
export const DRIVE_FAVICON =
  "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png";
export const DOCS_FAVICON =
  "https://ssl.gstatic.com/images/branding/product/1x/docs_2020q4_32dp.png";
export const SLIDES_FAVICON =
  "https://ssl.gstatic.com/images/branding/product/1x/slides_2020q4_32dp.png";
export const GOOGLE_FAVICON = "https://www.google.com/favicon.ico";
export const CANVAS_FAVICON = "https://www.google.com/s2/favicons?domain=instructure.com&sz=128";
export const SCHOOLOGY_FAVICON = "https://www.google.com/s2/favicons?domain=schoology.com&sz=128";
export const CLEVER_FAVICON = "https://www.google.com/s2/favicons?domain=clever.com&sz=128";
export const EDPUZZLE_FAVICON = "https://www.google.com/s2/favicons?domain=edpuzzle.com&sz=128";
export const DESMOS_FAVICON = "https://www.google.com/s2/favicons?domain=desmos.com&sz=128";
export const KHAN_FAVICON = "https://www.google.com/s2/favicons?domain=khanacademy.org&sz=128";

/**
 * Returns a high-res real favicon URL for any domain or full URL using Google's Favicon CDN
 */
export function getFaviconUrl(target: string): string {
  if (!target) return FROSTED_ICON_SVG;
  try {
    let hostname = target.trim();
    if (hostname.startsWith("http://") || hostname.startsWith("https://")) {
      hostname = new URL(hostname).hostname;
    } else if (hostname.includes("/")) {
      hostname = hostname.split("/")[0];
    }
    hostname = hostname.replace(/^www\./, "").toLowerCase();
    if (!hostname || hostname === "localhost" || hostname.startsWith("frosted:")) {
      return FROSTED_ICON_SVG;
    }
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=128`;
  } catch {
    return FROSTED_ICON_SVG;
  }
}
