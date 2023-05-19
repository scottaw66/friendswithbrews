import { format } from "date-fns";
import enUS from "date-fns/locale/en-US/index.js";
import { formatInTimeZone } from "date-fns-tz";

const postPattern = "eeee, dd MMM yyyy";
const tz = "America/Los_Angeles";

export function rfc2822(date) {
  const pattern = "eee, dd MMM yyyy HH:mm:ss zzz";

  return formatInTimeZone(date, tz, pattern, { locale: enUS });
}

export function postdate(date) {
  return formatInTimeZone(date, tz, postPattern, { locale: enUS });
}

export function utcdate(date) {
  return formatInTimeZone(date, "UTC", postPattern, { locale: enUS });
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
