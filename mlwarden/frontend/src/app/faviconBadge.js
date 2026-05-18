const FAVICON_HREFS = {
  favicon: '/static/favicon.svg',
  base: '/static/favicon-base.svg',
  notification: '/static/favicon-notification.svg',
  unactive: '/static/favicon-unactive.svg',
}

function findFaviconLink() {
  return document.querySelector('link[rel~="icon"]')
}

export function setFaviconState(state = 'favicon') {
  const faviconLink = findFaviconLink()
  if (!faviconLink) return

  faviconLink.type = 'image/svg+xml'
  faviconLink.href = FAVICON_HREFS[state] || FAVICON_HREFS.favicon
}

export function setUnreadFaviconBadge(hasUnread) {
  setFaviconState(hasUnread ? 'notification' : 'favicon')
}
