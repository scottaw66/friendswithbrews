import brews from "../../data/brews.json";

export function brewList(episode) {
  const ep = episode ?? 0;
  let brewList = Array.from(brews);
  return ep === 0
    ? brewList
    : brewList.filter((brews) => brews.episodes.includes(String(episode)));
}
