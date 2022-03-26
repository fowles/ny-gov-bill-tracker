function myFunction() {
  const liars = getColumnContent("Senate!B3:B").map(normalizeName);
  const { labels: labels, range: range } = getBillLabels("Senate!E2:2");
  const columns = labels
    .map(getBill)
    .map(bill => buildColumn(liars, bill));
  setColumnContent(range.replace(2, 3).replace(2, ""), columns);
}

function normalizeName(name) {
  name = name.toLowerCase();
  name = name.replaceAll(/[àáâãäå]/g, "a");
  name = name.replaceAll(/æ/g, "ae");
  name = name.replaceAll(/ç/g, "c");
  name = name.replaceAll(/[èéêë]/g, "e");
  name = name.replaceAll(/[ìíîï]/g, "i");
  name = name.replaceAll(/ñ/g, "n");
  name = name.replaceAll(/[òóôõö]/g, "o");
  name = name.replaceAll(/œ/g, "oe");
  name = name.replaceAll(/[ùúûü]/g, "u");
  name = name.replaceAll(/[ýÿ]/g, "y");
  return name;
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
  return amendment.coSponsors.items.map(item => normalizeName(item.fullName));
}

function getSponsor(bill) {
  return normalizeName(bill.sponsor.member.fullName);
}

function getColumnContent(col) {
  const range = Sheets.Spreadsheets.Values.get(sheetId, col);
  return range.values.map(x => x[0]);
}

function getBillLabels(billLabelRow) {
  const range = Sheets.Spreadsheets.Values.get(sheetId, billLabelRow);
  return {
    labels: range.values[0],
    range: range.range,
  };
}

function buildColumn(liars, bill) {
  const sponsor = getSponsor(bill);
  const coSponsors = getCoSponsors(bill);
  return liars.map(liar => {
    if (liar === sponsor) return "SPONSOR";
    if (coSponsors.includes(liar)) return "COSPONSOR";
    return "";
  });
}

function setColumnContent(col, vals) {
  const updated = Sheets.Spreadsheets.Values.get(sheetId, col);
  for (let i = 0; i < vals.length; ++i) {
    for (let j = 0; j < vals[i].length; ++j) {
      updated.values[j][i] = vals[i][j];
    }
  }
  Sheets.Spreadsheets.Values.update(updated, sheetId, updated.range, { valueInputOption: "RAW" });
}
