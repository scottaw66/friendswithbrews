import beer from "../../data/beer.json";

export function beerList(episode) {
  const ep = episode ?? 0;
  let beers = Array.from(beer);
  return ep === 0
    ? beers
    : beers.filter((beer) => beer.episodes.includes(String(episode)));
}
