
function getUserProfile(username) {
  if(!username || username.length==0) return null;
  
  var config=getConfigDetails();
  sheet  = SpreadsheetApp.getActive().getSheetByName(PARTICIPANTS_SHEET_NAME);
  //sheet.getRange('A1').setValue("Loading... "+new Date().toString());
  var peloton=config.peloton;
  
  var url=peloton.http_base +'/api/user/'+username;
  var json= UrlFetchApp.fetch(url,peloton.http_options).getContentText();
  var data = JSON.parse(json);
    console.log(data);

  var profile={
    username:data.username,
    user_id: data.id,
    last_workout: data.last_workout_at,
    image_url:data.image_url,
    followers:data.total_followers,
    following:data.total_following,
    private:data.is_profile_private,
    rides: data.total_pedaling_metric_workouts,
    following_user: (data.relationship  && data.relationship.user_to_me =='following'),
    user_following_me: ( data.relationship  &&  data.relationship.me_to_user =='following')
  };
  console.log(profile);
  return profile;
}

function changeRelationship(action, user_id){
  var config=getConfigDetails();
  var peloton=config.peloton;
  console.log("Change Relationship: " + action+" --> "+user_id);
  var action={"action":action,"user_id":user_id};
  var url=peloton.http_base +'/api/user/change_relationship';
  var json=UrlFetchApp.fetch(url,{'headers':peloton.http_options.headers,'method':'POST','contentType': 'application/json', 'payload':JSON.stringify(action)});
  var data = JSON.parse(json);
  console.log(data);      
  return data;
}



function onChange(e){
  var sheet= SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if(sheet.getSheetName() != PARTICIPANTS_SHEET_NAME) return;
  
  Logger.log("onChange event fired :" + JSON.stringify(e));
  if(e.range.rowStart>=2 && (e.range.columnStart>=1 && e.range.columnEnd <=1)){
    console.log("Username value changed");
    var username=sheet.getRange("A"+e.range.rowStart).getValue();
    console.log("Looking up username :"+username);
    var profile=getUserProfile(username);
    if(profile==null || !profile.user_id || profile.user_id.length<10) return;
    sheet.getRange("A"+e.range.rowStart+":I"+e.range.rowStart).setValues(
      [[
        profile.username,
        profile.user_id,
        profile.followers,
        profile.following,
        profile.rides,
        profile.private,
        profile.last_workout,
        profile.image_url,
        new Date()
        ]]
      );
    var result=changeRelationship("follow",profile.user_id);
    sheet.getRange("J"+e.range.rowStart).setValue(result.me_to_user);
    sheet.getRange("K"+e.range.rowStart).setValue(result.user_to_me);
  }
}

