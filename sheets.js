function myFunction() {
  const liars = getColumnContent("B3:B");
  const bill = getBill("S6843B");
  const col = buildColumn(liars, bill);
  console.log(col);
  setColumnContent("E3:E", col);
}

function getBill(billLabel) {
  const url = `https://legislation.nysenate.gov/api/3/bills/2021/${billLabel}?key=${apiKey}`
  const response = UrlFetchApp.fetch(url).getContentText();
  return JSON.parse(response).result;
}

function getLatestAmendment(bill) {
  const amendments = Object.keys(bill.amendments.items);
  amendments.sort();
  return bill.amendments.items[amendments[amendments.length - 1]];
}

function getCoSponsors(bill) {
  const amendment = getLatestAmendment(bill);
  return amendment.coSponsors.items.map(item => item.fullName);
}

function getSponsor(bill) {
  return bill.sponsor.member.fullName;
}

function getColumnContent(col) {
  const r = Sheets.Spreadsheets.Values.get(sheedId, col);
  return r.values.map(x => x[0]);
}

function buildColumn(liars, bill) {
  const sponsor = getSponsor(bill);
  const coSponsors = getCoSponsors(bill);
  const result = liars.map(liar => {
    if (liar == sponsor) return "SPONSOR";
    if (coSponsors.includes(liar)) return "COSPONSOR";
    return "X";

  })
  return result;
}

function setColumnContent(col, vals) {
  const updated = Sheets.Spreadsheets.Values.get(sheedId, col);
  for (let i = 0; i < vals.length; ++i) {
    updated.values[i][0] = vals[i];
  }Sheets.Spreadsheets.Values.update(updated, sheedId, updated.range, {valueInputOption: "RAW"})
}

