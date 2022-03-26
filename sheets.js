// https://legislation.nysenate.gov/static/docs/html/index.html

const billLabelRow = 2
const billStatusRow = 3
const billCommitteeRow = 4
const billSponsorRowStart = 6

function updateAllSheets() {
  updateSheet("Senate");
  updateSheet("Assembly");
}

function updateSheet(body) {
  const liarDistricts = getColumnContent(getDistrictRange(body));
  const districtToLiar = getDistrictToLiarShortName(body.toLowerCase());
  const liarShortNames = liarDistricts.map(district => districtToLiar[district]);
  const { labels: labels, range: range } = getBillLabels(getBillLabelRange(body));
  const spsonsorships = [];
  const statuses = [];
  const committees = [];
  const latestLabels = [];
  for (label of labels) {
    const bill = getBill(label);
    const amendment = getLatestAmendment(bill);
    spsonsorships.push(buildSponsorshipColumn(liarShortNames, bill, amendment));
    statuses.push([bill.status.statusDesc]);
    committees.push([bill.status.committeeName]);
    latestLabels.push([label.replace(/[a-zA-Z]?$/, amendment.version)]);
  }
  setColumnContent(range, latestLabels);
  setColumnContent(getBillStatusRange(range), statuses);
  setColumnContent(getBillCommitteeRange(range), committees);
  setColumnContent(getBillSponsorRange(range), spsonsorships);
}

function getDistrictRange(body) {
  return `${body}!A${billSponsorRowStart}:A`;
}

function getBillLabelRange(body) {
  return `${body}!E${billLabelRow}:${billLabelRow}`;
}

function getBillStatusRange(billLabelRange) {
  return billLabelRange.replaceAll(billLabelRow, billStatusRow)
}

function getBillCommitteeRange(billLabelRange) {
  return billLabelRange.replaceAll(billLabelRow, billCommitteeRow)
}

function getBillSponsorRange(billLabelRange) {
  return billLabelRange.replace(billLabelRow, billSponsorRowStart).replace(billLabelRow, "")
}

function getBill(billLabel) {
  const url = `https://legislation.nysenate.gov/api/3/bills/2021/${billLabel}?key=${nyGovApiKey}&limit=1000`;
  const response = UrlFetchApp.fetch(url).getContentText();
  return JSON.parse(response).result;
}

function getDistrictToLiarShortName(body) {
  const url = `https://legislation.nysenate.gov/api/3/members/2022/${body}?key=${nyGovApiKey}&limit=1000`;
  const items = JSON.parse(UrlFetchApp.fetch(url).getContentText()).result.items;
  const districtToName = {};
  for (item of items) {
    districtToName[item.districtCode] = item.shortName;
  }
  return districtToName;
}

function getLatestAmendment(bill) {
  const amendments = Object.keys(bill.amendments.items);
  amendments.sort();
  return bill.amendments.items[amendments[amendments.length - 1]];
}

function getCoSponsors(amendment) {
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

function buildSponsorshipColumn(liars, bill, amendment) {
  const sponsor = getSponsor(bill);
  const coSponsors = getCoSponsors(amendment);
  return liars.map(liar => {
    if (liar === sponsor) return "SPONSOR";
    if (coSponsors.includes(liar)) return "COSPONSOR";
    return "";
  });
}

function setColumnContent(col, vals) {
  const updated = Sheets.Spreadsheets.Values.get(sheetId, col);
  updated.values = new Array(vals[0].length);
  for (let j = 0; j < vals[0].length; ++j) {
    updated.values[j] = new Array(vals.length);
  }

  for (let i = 0; i < vals.length; ++i) {
    for (let j = 0; j < vals[i].length; ++j) {
      updated.values[j][i] = vals[i][j];
    }
  }
  Sheets.Spreadsheets.Values.update(updated, sheetId, updated.range, { valueInputOption: "RAW" });
}
