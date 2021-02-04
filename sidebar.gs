function onOpen() {
   SpreadsheetApp.getUi()  
      .createMenu('Peloton')
      .addItem('Login', 'showSidebarLogin')
      .addItem('Find Rides', 'showSidebarRides')
      .addItem('Find Users', 'showSidebarUsers')
      .addItem('Tools', 'showSidebarTools')
      .addToUi();
}

function handleSidebarLogin(obj){
  var results={};
   if(!obj.username || obj.username.length < 5 ||
      !obj.password  || obj.password.length <5 ) {
     return {"error":"Username and password are both required"};
   } 
  var results=processLogin(obj.username,obj.password);
  // for reasons I don't understand, Google has a hard time serializing this remotely 
  // to HTML calling this via google.script.run, but this fixes the issue.
  //    o
  // -\/^\/-
  // Whatever!
  return  JSON.parse(JSON.stringify(results));
}

function displayResultsSheet(){
  SpreadsheetApp.getActive().getSheetByName(RESULTS_SHEET_NAME).activate();
}
function showSidebarLogin() {
  var html = HtmlService.createHtmlOutputFromFile('login-sidebar.html')
      .setTitle('Peloton Login')
      .setWidth(320).setHeight(550);
      SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
      .showModalDialog(html, "Peloton Log In");
}

function showSidebarRides() {
  var tmpl = HtmlService.createTemplateFromFile('rides-sidebar.html').evaluate();
  var html=HtmlService.createHtmlOutput().setContent(tmpl.getContent())
    .setTitle('Peloton On-Demand Ride Search');
  SpreadsheetApp.getUi() 
      .showSidebar(html);
}

function getResultHeaders(sheet){
  var results=SpreadsheetApp.getActive().getSheetByName(sheet);
  var headers=results.getRange("A1:AZ1").getValues()[0];
  return headers;
  }
 
function getSelectedValue(sheetName, columnHeader){
    Logger.log("Looking for "+columnHeader+" in "+sheetName);
    var uidCol=getResultHeaders(sheetName).indexOf(columnHeader);
    if(uidCol==-1){
      Logger.log("Cannot find "+columnHeader+" in "+sheetName);
      return null;
    }
    var sheet=SpreadsheetApp.getActive().getSheetByName(sheetName);
    var selection=sheet.getSelection();
    if(!selection){
      Logger.log("No selection in "+sheetName+". Can only search first row of selected rows");
      return null;
    }
    var row=selection.getActiveRange().getRow();
    Logger.log("Selection in "+sheetName+" starts at row "+row);
    // move column from arrayIndex to Column Number
    var columnNumber=uidCol+1;
    var value=sheet.getRange(row,columnNumber).getValue();
    Logger.log("Selected "+columnHeader+" in "+sheetName+": "+value);
    return value;
}

function displaySelectedUser(){
  var activeSheet=SpreadsheetApp.getActiveSheet().getName();
  
  Logger.log("Searching Active sheet :"+activeSheet+" Otherwise will look in results, then users for a selected user");
  
  var resultsValue=getSelectedValue(RESULTS_SHEET_NAME,"User ID");
  var registrationValue=getSelectedValue(REGISTRATION_SHEET_NAME,"UserID");
  var friendsValue=getSelectedValue(FRIENDS_SHEET_NAME,"UserID");
  // Default to the results sheet
  var value=resultsValue;
  if(activeSheet==FRIENDS_SHEET_NAME && friendsValue!=null) value=friendsValue;
  if(activeSheet==REGISTRATION_SHEET_NAME && registrationValue!=null) value=registrationValue;

  if(isBlank(value)){
    SpreadsheetApp.getUi().alert("No user row selected in results or registration sheet.");
    return;
  }
  
  displayUser(value);
 }

function displaySelectedRide(){
  var resultValue=getSelectedValue(RESULTS_SHEET_NAME,"Ride ID");
  var ridesValue=getSelectedValue(RIDES_SHEET_NAME,"ID");
  var activeSheet=SpreadsheetApp.getActiveSheet().getName();

  // default to results tab
  var value=resultValue;
  if(value==null || (activeSheet==RIDES_SHEET_NAME && ridesValue!=null)) 
    value=ridesValue;
    
  if(isBlank(value)){
     SpreadsheetApp.getUi().alert("No ride row selected in results or rides sheet.");
     return;
  }
  showRideDetails(value);
}

function showSidebarTools() {
  var tmpl = HtmlService.createTemplateFromFile('tools-sidebar.html').evaluate();
  var html=HtmlService.createHtmlOutput().setContent(tmpl.getContent())
    .setTitle('Tools');
  SpreadsheetApp.getUi() 
      .showSidebar(html);
}


function showSidebarUsers() {
  var tmpl = HtmlService.createTemplateFromFile('users-sidebar.html').evaluate();
  var html=HtmlService.createHtmlOutput().setContent(tmpl.getContent())
    .setTitle('Peloton User Search');
  SpreadsheetApp.getUi() 
      .showSidebar(html);
}


function displayUser(id){
  var template=HtmlService.createTemplateFromFile("user-details.html");
  template.user_id=id;
  var output=template.evaluate();
  var html=HtmlService.createHtmlOutput().setContent(output.getContent()).setWidth(800).setHeight(800).setTitle("User Details");
  SpreadsheetApp.getUi().showModalDialog(html,"User Details");
  }
  
function showRideDetails(id){
  var template=HtmlService.createTemplateFromFile("ride-details.html");
  template.ride_id=id;
  
  var output=template.evaluate();
  var html=HtmlService.createHtmlOutput().setContent(output.getContent()).setWidth(800).setHeight(800).setTitle("Ride Details");
  SpreadsheetApp.getUi().showModalDialog(html,"Ride Details");
  }