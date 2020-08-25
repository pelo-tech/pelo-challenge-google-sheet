function setup(){
  var username=promptForText("Enter Peloton Username");
  if(username==null) return;
  var password=promptForText("Enter Peloton Password");
  if (password==null) return;
  
    var sheet = SpreadsheetApp.getActive().getSheetByName('Config');

    var ui = SpreadsheetApp.getUi(); // Same variations.
  var auth={
    "username_or_email": username,
    "password": password
  };
  
  var response=UrlFetchApp.fetch(getConfigDetails().peloton.http_base+"/auth/login",{'method':'POST','contentType': 'application/json', 'payload':JSON.stringify(auth)});
                                
  var json = response.getContentText();
  var data = JSON.parse(json);
  ui.alert("Your session ID has been set to "+data.session_id+"\n Your User ID set to "+data.user_id);
  sheet.getRange(SESSION_ID_CELL).setValue(data.session_id); 
  sheet.getRange(USER_ID_CELL).setValue(data.user_id); 
  sheet.getRange(USERNAME_CELL).setValue(username); 
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
   var ignore_zero_output=cfg.getRange(IGNORE_ZERO_OUTPUT_CELL).getValue();
   ignore_zero_output == (ignore_zero_output !=null && ignore_zero_output.toLowerCase()=='true');
  
  return {
    "peloton":{
      "http_base":PELOTON_API_BASE,
      "session_id":session_id, 
      "user_id":user_id,
      "timezone":tz,
      "eligible_ride_age":eligible_ride_age,
      "ignore_zero_output": ignore_zero_output,
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
