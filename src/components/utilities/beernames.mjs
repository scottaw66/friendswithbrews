import brew from "../../data/brew.json" assert { type: "json" };

let brews = Array.from(brew).sort((a, b) => {
  if (a.name < b.name) {
    return -1;
  } else {
    return 1;
  }
});
brews.map((brew) => console.log(`${brew.name} ${brew.id}`));
