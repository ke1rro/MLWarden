const baseFaviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <defs>
    <linearGradient id="logo-gradient" x1="6" x2="34" y1="6" y2="34" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#60a5fa" />
      <stop offset="0.55" stop-color="#2563eb" />
      <stop offset="1" stop-color="#0891b2" />
    </linearGradient>
  </defs>
  <rect width="40" height="40" rx="10" fill="#0f172a" />
  <path
    d="M9 27.5V12.25L15.25 20L20 12.25L24.75 20L31 12.25V27.5"
    fill="none"
    stroke="url(#logo-gradient)"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="3.2"
  />
  <path
    d="M11 29.5C15.25 25.7 18.95 25.7 23.2 29.5C25.35 31.4 27.45 31.4 30 29.5"
    fill="none"
    stroke="#dbeafe"
    stroke-linecap="round"
    stroke-width="2"
  />
</svg>`

const unreadFaviconSvg = baseFaviconSvg.replace(
  '</svg>',
  '<circle cx="31" cy="9" r="6.5" fill="#ef4444" stroke="#ffffff" stroke-width="2" /></svg>',
)

function svgDataUrl(svg) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function findFaviconLink() {
  return document.querySelector('link[rel~="icon"]')
}

export function setUnreadFaviconBadge(hasUnread) {
  const faviconLink = findFaviconLink()
  if (!faviconLink) return

  if (!faviconLink.dataset.defaultHref) {
    faviconLink.dataset.defaultHref = faviconLink.getAttribute('href') || '/favicon.svg'
  }

  faviconLink.type = 'image/svg+xml'
  faviconLink.href = hasUnread ? svgDataUrl(unreadFaviconSvg) : faviconLink.dataset.defaultHref
}
