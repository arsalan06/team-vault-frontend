/**
 * Only follow same-app paths, so a crafted ?returnUrl= can't redirect off-site
 * (e.g. "//evil.com" or "https://evil.com") or loop back to an auth page.
 */
export function safeReturnUrl(url: string | null): string {
  return url &&
    url.startsWith('/') &&
    !url.startsWith('//') &&
    !url.startsWith('/login') &&
    !url.startsWith('/signup')
    ? url
    : '/';
}
