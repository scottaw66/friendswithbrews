import reviews from "../../data/reviews.json";

export function randomReviews(number) {
  const num = number ?? 3;
  let allReviews = Array.from(reviews);

  const randReviews = [];
  while (randReviews.length < num) {
    randReviews.push(
      allReviews.splice(Math.floor(Math.random() * allReviews.length), 1)[0]
    );
  }

  return randReviews;
}
