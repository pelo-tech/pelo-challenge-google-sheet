function getCompetitions(){
  var sheet=SpreadsheetApp.getActive().getSheetByName(COMPETITIONS_SHEET_NAME);
  return getDataAsObjects(sheet);
}
