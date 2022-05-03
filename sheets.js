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
  const liarShortNames = liarDistricts.map(district => districtToLiar[district].shortName);
  const { labels: labels, range: range } = getBillLabels(getBillLabelRange(body));
  const spsonsorships = [];
  const statuses = [];
  const committees = [];
  const latestLabels = [];
  for (label of labels) {
    const bills = getBills(label);
    spsonsorships.push(buildSponsorshipColumn(liarShortNames, bills[0]));
    statuses.push([buildBillStatus(bills)]);
    committees.push([buildBillCommitteeName(bills)]);
    latestLabels.push([buildLatestLabels(bills)]);
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
  return `${body}!C${billLabelRow}:${billLabelRow}`;
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

function getBills(billLabels) {
  const bills = [];
  const labels = billLabels.split("\n")
  for (billLabel of labels) {
    const url = `https://legislation.nysenate.gov/api/3/bills/2021/${billLabel}?key=${nyGovApiKey}&limit=1000`;
    const response = UrlFetchApp.fetch(url).getContentText();
    const bill = JSON.parse(response).result;
    if (bill.substitutedBy && labels.indexOf(bill.substitutedBy.basePrintNo) == -1) {
      labels.push(bill.substitutedBy.basePrintNo);
    }
    bills.push(bill);
  }
  return bills;
}

function getDistrictToLiarShortName(body) {
  const url = `https://legislation.nysenate.gov/api/3/members/2022/${body}?key=${nyGovApiKey}&limit=1000`;
  const items = JSON.parse(UrlFetchApp.fetch(url).getContentText()).result.items;
  const districtToName = {};
  for (item of items) {
    // There may be multiple liars with the same district code in the event that a liar was elected in a
    // special mid-term election. In that case, though it's not documented anywhere, Hyrum told me that the
    // `sessionMemberId` seems to be increasing with newer members, so we select the liar with the largest
    // `sessionMemberId`.
    if (districtToName[item.districtCode] === undefined || districtToName[item.districtCode].sessionMemberId < item.sessionMemberId) {
      districtToName[item.districtCode] = item;
    }
  }
  return districtToName;
}

function getLatestAmendment(bill) {
  return bill.amendments.items[bill.activeVersion];
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

function buildSponsorshipColumn(liars, bill) {
  const amendment = getLatestAmendment(bill);
  const sponsor = getSponsor(bill);
  const coSponsors = getCoSponsors(amendment);
  return liars.map(liar => {
    if (liar === sponsor) return "SPONSOR";
    if (coSponsors.includes(liar)) return "COSPONSOR";
    return "";
  });
}

function buildBillStatus(bills) {
  const bill = bills[bills.length - 1];
  const statuses = [];
  for (milestone of bill.milestones.items) {
    if (milestone.statusType === "PASSED_SENATE") {
      statuses.push(milestone.statusDesc);
    } else if (milestone.statusType === "PASSED_ASSEMBLY") {
      statuses.push(milestone.statusDesc);
    }
  }
  const lastStatus = bills[bills.length - 1].status.statusDesc;
  if (statuses.indexOf(lastStatus) == -1) {
    statuses.push(lastStatus);
  }
  return statuses.join("\n");
}

function buildBillCommitteeName(bills) {
  return bills[bills.length - 1].status.committeeName;
}

function buildLatestLabels(bills) {
  return bills.map(bill => bill.printNo).join("\n");
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