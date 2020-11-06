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

function getResultHeaders(){
  var results=SpreadsheetApp.getActive().getSheetByName(RESULTS_SHEET_NAME);
  var headers=results.getRange("A1:AZ1").getValues()[0];
  return headers;
  }
function displaySelectedUser(){
  var uidCol=getResultHeaders().indexOf("User ID");
  Logger.log("UID Column: "+uidCol);
  if(uidCol>-1){
    var results=SpreadsheetApp.getActive().getSheetByName(RESULTS_SHEET_NAME);
    var selection=results.getSelection();
    if(!selection){
      Logger.log("No selection in sheet.");
      return;
    }
    var row=selection.getActiveRange().getRow();
    Logger.log("Selection starts at row "+row);
    var value=results.getRange(row, uidCol+1 /* convert arr index to col number */).getValue();
    Logger.log("User ID is "+value);
    displayUser(value);
  }

}
function displaySelectedRide(){
  var ridCol=getResultHeaders().indexOf("Ride ID");
  Logger.log("RID Column: "+ridCol);
  if(ridCol>-1){
    var results=SpreadsheetApp.getActive().getSheetByName(RESULTS_SHEET_NAME);
    var selection=results.getSelection();
    if(!selection){
      Logger.log("No selection in sheet.");
      return;
    }
    var row=selection.getActiveRange().getRow();
    Logger.log("Selection starts at row "+row);
    var value=results.getRange(row, ridCol+1 /* convert arr index to col number */).getValue();
    Logger.log("Ride ID is "+value);
    showRideDetails(value);
  }
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