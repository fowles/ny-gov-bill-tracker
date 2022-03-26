function myFunction() {
  const liarDistricts = getColumnContent("Senate!A3:A");
  const districtToLiar = getDistrictToLiarShortName();
  const liarShortNames = liarDistricts.map(district => districtToLiar[district]);
  console.log(liarShortNames);
  const { labels: labels, range: range } = getBillLabels("Senate!E2:2");
  const columns = labels
    .map(getBill)
    .map(bill => buildColumn(liarShortNames, bill));
  setColumnContent(range.replace(2, 3).replace(2, ""), columns);
}

function getBill(billLabel) {
  const url = `https://legislation.nysenate.gov/api/3/bills/2021/${billLabel}?key=${nyGovApiKey}&limit=1000`;
  const response = UrlFetchApp.fetch(url).getContentText();
  return JSON.parse(response).result;
}

function getDistrictToLiarShortName() {
  const url = `https://legislation.nysenate.gov/api/3/members/2022/senate?key=${nyGovApiKey}&limit=1000`;
  const items = JSON.parse(UrlFetchApp.fetch(url).getContentText()).result.items;
  const districtToName = {};
  for (item of items) { districtToName[item.districtCode] = item.shortName; }
  return districtToName;
}

function getLatestAmendment(bill) {
  const amendments = Object.keys(bill.amendments.items);
  amendments.sort();
  return bill.amendments.items[amendments[amendments.length - 1]];
}

function getCoSponsors(bill) {
  const amendment = getLatestAmendment(bill);
  return amendment.coSponsors.items.map(item => item.shortName);
}

function getSponsor(bill) {
  return bill.sponsor.member.shortName;
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
