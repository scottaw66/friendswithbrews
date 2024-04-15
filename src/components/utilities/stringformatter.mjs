export function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function brewIcon(brewType) {
  switch (brewType) {
    case "beer":
      return "ion:beer";
    case "tea":
      return "mdi:tea";
    case "coffee":
      return "fa-solid:coffee";
    case "water":
      return "ion:waterdrop";
    default:
      return "ion:beer";
  }
}

export function globalImageUrls(baseUrl, str) {
  let regex = /src="\/_astro\/([^"]+\.(?:jpg|jpeg|gif|png|webp|avif))"/g;
  // replace all image urls with the correct path
  return str
    .replaceAll(regex, 'src="' + baseUrl + '/_astro/$1"')
    .replaceAll("//_astro", "/_astro");
}
