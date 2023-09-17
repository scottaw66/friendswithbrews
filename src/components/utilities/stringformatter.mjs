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