import { format } from "date-fns";
import { enUS } from "date-fns/locale/en-US";

const postPattern = "eeee, dd MMM yyyy";

export function rfc2822(date) {
  const pattern = "eee, dd MMM yyyy HH:mm:ss zzz";

  return format(date, pattern, { locale: enUS });
}

export function postdate(date) {
  return format(date, postPattern, { locale: enUS });
}

export function year() {
  return format(new Date(), "yyyy");
}

export function daysBetweenDates(date1, date2) {
  const oneDay = 1000 * 60 * 60 * 24; // number of milliseconds in one day
  const timeDiff = Math.abs(date2.valueOf() - date1.valueOf()); // get the time difference in milliseconds
  const numDays = Math.ceil(timeDiff / oneDay); // divide by the number of milliseconds in one day and round up to get the number of days
  return numDays;
}
