import beer from "../../data/beer.json" assert { type: "json" };

let beers = Array.from(beer).sort((a, b) => {
  if (a.name < b.name) {
    return -1;
  } else {
    return 1;
  }
});
beers.map((beer) => console.log(`${beer.name} ${beer.id}`));
