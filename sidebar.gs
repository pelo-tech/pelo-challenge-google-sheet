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
  if(!results) return [];
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
  var subgroupsValue=getSelectedValue(SUBGROUPS_SHEET_NAME,"Leaderboard name");

  // Default to the results sheet
  var value=resultsValue;
  if(activeSheet==FRIENDS_SHEET_NAME && friendsValue!=null) value=friendsValue;
  if(activeSheet==REGISTRATION_SHEET_NAME && registrationValue!=null) value=registrationValue;
  if(activeSheet==SUBGROUPS_SHEET_NAME && subgroupsValue!=null) {
    var profile=getUserProfile(subgroupsValue);
    if(profile) value=profile.user_id;
  }
  
  if(isBlank(value)){
    SpreadsheetApp.getUi().alert("No user row selected in results, registration, friends or subgroups sheet.");
    return;
  }
  
  displayUser(value);
 }

function followSelectedUsers(){
  var names={};
  var wrongFormat=false
  currentSelection=SpreadsheetApp.getSelection().getActiveRangeList().getRanges().map(
    range=>{
      if(wrongFormat) return;
      values=range.getDisplayValues();
      if(!values.length || values[0].length>1){
            SpreadsheetApp.getUi().alert("No names selected. Please select a single set of cells (or one column) containing just leaderboard names or profile IDs"); 
            wrongFormat=true;
      }
      values.map(row=>{names[row[0].toLowerCase()]='-'});
    }
  )
  if(wrongFormat) return;
  SpreadsheetApp.getUi().alert("About to load "+Object.keys(names).length+ " names :"+JSON.stringify(names));
  var friends=getAllFriends();
  friends.map(profile=>{
    var username=profile.username.toLowerCase();
    if(names[username]!=null) {
        names[username]=profile.relationship;
        console.log("Found profile "+username+" // "+ JSON.stringify(profile.relationship));
    } 
  });
  var newNames=[];
  var existingNames=[];
  var privateNames=[];
  Object.keys(names).map(name=>{
    if(names[name].me_to_user && names[name].me_to_user =='following'){
      existingNames.push(name);
    }
    else if(names[name].me_to_user && names[name].me_to_user =='follow_pending'){
      privateNames.push(name);
    }
    else newNames.push(name);
  });

    SpreadsheetApp.getUi().alert(
      "Already Following: "+existingNames.length+"-> "+JSON.stringify(existingNames)+
      "\nPrivate/Pending Follow: "+existingNames.length+"-> "+JSON.stringify(privateNames)+
    "\nProceed with "+newNames.length+" new names:" +JSON.stringify(newNames));
    var results={};
    newNames.map(name=>{
      results[name]="Attempted";
      try{
        Logger.log("Looking up "+name);
        var profile=getUserProfile(name);
        try{
          if(profile.follow_pending){
            results[name]="Already Follow Pending";
          } else {
            var result=followUser(profile.user_id);
            results[name]=result;
          }
        } catch (e){
          Logger.log("Error following user "+name+"/"+profile.user_id);
          Logger.log(e);
          results[name]="Error";
        }
      } catch (e){
        Logger.log("Error finding profile for user "+name);
        Logger.log(e);
        results[name]="Profile not found";

      }
    });
    
    var response={
      privateNames:privateNames,
      existingNames:existingNames,
      newNames:newNames,
      results:results
    }
    SpreadsheetApp.getUi().alert("Final response: "+JSON.stringify(results));
    Logger.log("Final results: "+JSON.stringify(response));
    return response;

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