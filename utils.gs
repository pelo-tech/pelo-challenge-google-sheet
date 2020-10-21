function setup(){
  var username=promptForText("Enter Peloton Username");
  if(username==null) return;
  var password=promptForText("Enter Peloton Password");
  if (password==null) return;
  
  var data=processLogin(username,password);

  ui.alert("Your session ID has been set to "+data.session_id+"\n Your User ID set to "+data.user_id);

}

function testEventStart(){
eventStart("test","1,2,3,4");
}
function testEventEnd(){
eventEnd(1,4);
}

function eventStart(name, arguments){
  logSheet=SpreadsheetApp.getActive().getSheetByName(LOG_SHEET_NAME);
  var id=1+ logSheet.getDataRange().getLastRow();
  var data=[[name,new Date(),arguments, null, null, null]];
  logSheet.getRange(id, 1,1, 6).setValues(data);
  return id;
}

function eventEnd(id, result){
  logSheet=SpreadsheetApp.getActive().getSheetByName(LOG_SHEET_NAME);
  var start=logSheet.getRange(id,2).getValue();
  var now=new Date();
  var duration=0;
  if(start) duration=now.getTime()-start.getTime();
  var data=[[result, new Date(), duration]];
  logSheet.getRange(id,4,1, 3).setValues(data);
}

function processLogin(username, password){
      var sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG_SHEET_NAME);

    var ui = SpreadsheetApp.getUi(); // Same variations.
    var auth={
    "username_or_email": username,
    "password": password
    };
  
  var response=UrlFetchApp.fetch(
     getConfigDetails().peloton.http_base+"/auth/login",
     {'method':'POST','contentType': 'application/json', 'payload':JSON.stringify(auth)}
   );
                                
  var json = response.getContentText();
  var data = JSON.parse(json);
  sheet.getRange(SESSION_ID_CELL).setValue(data.session_id); 
  sheet.getRange(USER_ID_CELL).setValue(data.user_id); 
  sheet.getRange(USERNAME_CELL).setValue(username); 
  return data;
}

function promptForText(msg) {
  var ui = SpreadsheetApp.getUi(); 
  var result = ui.prompt(
    msg+":",
      ui.ButtonSet.OK_CANCEL);

  // Process the user's response.
  var button = result.getSelectedButton();
  if(button == ui.Button.CANCEL) return null;
  var text = result.getResponseText();
  return text;
}


function getConfigDetails(){
   var cfg = SpreadsheetApp.getActive().getSheetByName(CONFIG_SHEET_NAME);
   var session_id=cfg.getRange(SESSION_ID_CELL).getValue(); 
   var user_id=cfg.getRange(USER_ID_CELL).getValue(); 
   var tz=cfg.getRange(TIME_ZONE_CELL).getValue();
   var eligible_ride_age=cfg.getRange(ELIGIBLE_RIDE_AGE_CELL).getValue();
  
  return { 
    "email":{
      "to": cfg.getRange(EMAIL_TO_CELL).getValue(),
      "cc": cfg.getRange(EMAIL_CC_CELL).getValue()
    },
    "peloton":{
      "distance_units":cfg.getRange(DISTANCE_UNIT_CELL).getValue(),
      "http_base":PELOTON_API_BASE,
      "session_id":session_id, 
      "user_id":user_id,
      "timezone":tz,
      "eligible_ride_age":eligible_ride_age,
      "http_options":
      {
        'headers':
        {
          'peloton-platform':PELOTON_PLATFORM, 
          'cookie':'peloton_session_id='+session_id
        }
      }
    }
  };
}
