// Embedded high-fidelity vector icons as SVG data URIs and official CDN URLs for cloaking

export const FROSTED_ICON_SVG = `data:image/svg+xml,${encodeURIComponent(
  `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" rx="14" fill="#ffffff"/>
  <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="13.25" stroke="#000000" stroke-width="2" stroke-opacity="0.9"/>
  <g stroke="#000000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
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
  <polygon points="32,27 37,32 32,37 27,32" fill="#000000"/>
</svg>
`.trim(),
)}`;

// Official product favicons for tab cloaking presets
// Using direct official gstatic / vector icons so Google Classroom, Drive, Docs, and Slides show their real icons instead of generic Google 'G' logo
export const CLASSROOM_FAVICON = "https://ssl.gstatic.com/classroom/ic_product_classroom_32.png";
export const DRIVE_FAVICON =
  "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png";
export const DOCS_FAVICON =
  "https://ssl.gstatic.com/images/branding/product/1x/docs_2020q4_32dp.png";
export const SLIDES_FAVICON =
  "https://ssl.gstatic.com/images/branding/product/1x/slides_2020q4_32dp.png";
export const GOOGLE_FAVICON = "https://www.google.com/favicon.ico";

export const IXL_FAVICON = "https://www.google.com/s2/favicons?domain=ixl.com&sz=128";
export const CANVAS_FAVICON = "https://du11hjcvx0uqb.cloudfront.net/br/v9.54.0/images/favicon.ico";
export const SCHOOLOGY_FAVICON = "https://www.schoology.com/favicon.ico";
export const CLEVER_FAVICON = "https://assets.clever.com/assets/p-favicon.ico";
export const DESMOS_FAVICON = "https://www.desmos.com/favicon.ico";
export const KHAN_FAVICON = "https://www.khanacademy.org/favicon.ico";
export const WIKIPEDIA_FAVICON = "https://en.wikipedia.org/static/favicon/wikipedia.ico";
export const QUIZLET_FAVICON = "https://quizlet.com/favicon.ico";
export const GEOGEBRA_FAVICON = "https://www.geogebra.org/favicon.ico";

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
      hostname = hostname.split("/")[0] || hostname;
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
