export function hostname(url) {
  const urlObject = new URL(url);
  return urlObject.hostname;
}

export function origin(url) {
  const urlObject = new URL(url);
  return urlObject.origin;
}

export function url(domain, path) {
  return new URL(path, domain);
}
