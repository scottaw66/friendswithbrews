export function episodeLength(length) {
  var hours = "";
  var minutes = "";
  var lengthDisplay = "";

  const leadingZeroReg = /^0/;
  const epLength = length.split(":");

  hours = epLength[0];
  minutes = epLength[1];

  if (Number(hours) > 0) {
    lengthDisplay = hours + " hour";
    if (Number(hours) > 1) {
      lengthDisplay += "s";
    }
    lengthDisplay += " ";
  }
  lengthDisplay += minutes + " minutes";

  return lengthDisplay.replace(leadingZeroReg, "");
}
