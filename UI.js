function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Bill Tracking')
    .addItem('Update All Data', 'updateAllSheets')
    .addToUi();
}
