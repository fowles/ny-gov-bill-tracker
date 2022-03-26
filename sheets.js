function myFunction() {
  const liars = getColumnContent("B3:B");
  const {labels: labels, range: range} = getBillLabels();
  const columns = labels
      .map(getBill)
      .map(bill => buildColumn(liars, bill));
  setColumnContent(range.replace(2, 3).replace(2, ""), columns);
}

function getBill(billLabel) {
  const url = `https://legislation.nysenate.gov/api/3/bills/2021/${billLabel}?key=${nyGovApiKey}`
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
  const range = Sheets.Spreadsheets.Values.get(sheetId, col);
  return range.values.map(x => x[0]);
}

function getBillLabels() {
  const range = Sheets.Spreadsheets.Values.get(sheetId, "E2:2");
  return {
    labels: range.values[0],
    range: range.range,
  };
}

function buildColumn(liars, bill) {
  const sponsor = getSponsor(bill);
  const coSponsors = getCoSponsors(bill);
  return liars.map(liar => {
    if (liar == sponsor) return "SPONSOR";
    if (coSponsors.includes(liar)) return "COSPONSOR";
    return "";
  });
}

function setColumnContent(col, vals) {
  const updated = Sheets.Spreadsheets.Values.get(sheetId, col);
  console.log(updated.values.length, updated.values[0].length);
  console.log(vals.length, vals[0].length);
  for (let i = 0; i < vals.length; ++i) {
    console.log(updated.values[i].length);
    for (let j = 0; j < vals[i].length; ++j) {
      updated.values[j][i] = vals[i][j];
    }
  }
  // console.log(updated.values);
  Sheets.Spreadsheets.Values.update(updated, sheetId, updated.range, {valueInputOption: "RAW"});
}
