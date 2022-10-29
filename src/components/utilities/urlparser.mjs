export function hostname(url) {
  const urlObject = new URL(url);
  return urlObject.hostname;
}

export function origin(url) {
  const urlObject = new URL(url);
  return urlObject.origin;
}
