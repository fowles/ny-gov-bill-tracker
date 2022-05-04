// https://legislation.nysenate.gov/static/docs/html/index.html

const billLabelRow = 2
const billStatusRow = 3
const billCommitteeRow = 4
const billLiarStatusRowStart = 6

function updateAllSheets() {
  updateSheet("Senate");
  updateSheet("Assembly");
}

function updateSheet(body) {
  const liarDistricts = getColumnContent(getDistrictRange(body));
  const districtToLiar = getDistrictToLiar(body.toLowerCase());
  const liarIds = liarDistricts.map(district => districtToLiar[district].memberId);
  const { labels: labels, range: range } = getBillLabels(getBillLabelRange(body));
  const liarStatus = [];
  const statuses = [];
  const committees = [];
  const latestLabels = [];
  for (label of labels) {
    const bills = getBills(label);
    liarStatus.push(buildLiarStatusColumn(liarIds, bills));
    statuses.push([buildBillStatus(bills)]);
    committees.push([buildBillCommitteeName(bills)]);
    latestLabels.push([buildLatestLabels(bills)]);
  }
  setColumnContent(range, latestLabels);
  setColumnContent(getBillStatusRange(range), statuses);
  setColumnContent(getBillCommitteeRange(range), committees);
  setColumnContent(getBillLiarStatusRange(range), liarStatus);
}

function getDistrictRange(body) {
  return `${body}!A${billLiarStatusRowStart}:A`;
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

function getBillLiarStatusRange(billLabelRange) {
  return billLabelRange.replace(billLabelRow, billLiarStatusRowStart).replace(billLabelRow, "")
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

function getDistrictToLiar(body) {
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

function getVotes(bill) {
  for (vote of bill.votes.items) {
    if (vote.billId.printNo !== bill.printNo) continue;
    if (vote.voteType !== "FLOOR") continue;
    return vote.memberVotes.items;
  }
  return {};
}

function getCoSponsors(amendment) {
  return amendment.coSponsors.items.map(item => item.memberId);
}

function getSponsor(bill) {
  return bill.sponsor.member.memberId;
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

function buildLiarStatusColumn(liars, bills) {
  const mainBill = bills[0];
  const finalBill = bills[bills.length - 1];
  const amendment = getLatestAmendment(mainBill);
  const sponsor = getSponsor(mainBill);
  const coSponsors = getCoSponsors(amendment);
  const votes = getVotes(finalBill);
  const liarStatuses = [];
  for (liar of liars) {
    var liarStatus = "";
    if (liar === sponsor) liarStatus += "SPONSOR";
    if (coSponsors.includes(liar)) liarStatus += "COSPONSOR";
    for (const voteType in votes) {
      const voters = votes[voteType].items;
      for (voter of voters) {
        if (voter.memberId === liar) {
          if (liarStatus !== "") liarStatus += "/";
          liarStatus += voteType;
        }
      }
    }
    liarStatuses.push(liarStatus);
  }
  return liarStatuses;
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