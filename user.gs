
function getUserProfile(username) {
  if(!username || username.length==0) return null;
  var event=eventStart("Get User Profile",username);
  var config=getConfigDetails();
  var peloton=config.peloton;
  
  var url=peloton.http_base +'/api/user/'+encodeURIComponent(username);
  var json= UrlFetchApp.fetch(url,peloton.http_options).getContentText();
  var data = JSON.parse(json);
    console.log(data);

  var profile={
    username:data.username,
    location: data.location,
    user_id: data.id,
    last_workout: data.last_workout_at,
    image_url:data.image_url,
    followers:data.total_followers,
    following:data.total_following,
    private:data.is_profile_private,
    rides: data.total_pedaling_metric_workouts,
    following_user: (data.relationship  && data.relationship.me_to_user =='following'),
    user_following_me: ( data.relationship  &&  data.relationship.user_to_me =='following'),
    relationship: data.relationship
  };
  console.log(profile);
  eventEnd(event,true);
  return profile;
}

function getUserOverview(user_id){
  var event=eventStart("Get User Overview",user_id);
  var config=getConfigDetails();
  var peloton=config.peloton;
  
  var url=peloton.http_base +'/api/user/'+user_id+"/overview";
  var json= UrlFetchApp.fetch(url,peloton.http_options).getContentText();
  var data = JSON.parse(json);
  console.log(data);
  eventEnd(event,true);
  return data;
}

function followUser(user_id){ 
  return changeRelationship("follow", user_id);
}

function unfollowUser(user_id){
  return changeRelationship("unfollow", user_id);
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


function searchUsers(query){
  var config=getConfigDetails();
  var peloton=config.peloton;
  if(query==null) return [];
  var event=eventStart("Search For Users",query);
  query=query.replace(VALID_USERNAME_REGEX, "");
  Logger.log("Sanitized Query: "+query);
  query=encodeURIComponent(query);
  Logger.log("URI Encoded: "+query);
  var url=peloton.http_base +"/api/user/search?limit=40&user_query="+query;
  var json= UrlFetchApp.fetch(url,peloton.http_options).getContentText();
  var response = JSON.parse(json);
  if(response && response.data) {
    var results=response.data;
    eventEnd(event, results.length);
    return results;
  } else {
    Logger.log("Error: No valid response came back");
    eventEnd(event, -1);
    return [];
  }
}

// This function may be expensive as we need to get a workout history to find a workout that's a cycling workout, then get its details.
function bruteForceGetFTPForUser(user_id){
var event= eventStart("BruteForceGetFTPForUser", user_id);
  var peloton=getConfigDetails().peloton;
  var url="https://api.onepeloton.com/api/user/"+user_id+"/workouts?limit=10&page=0&sort_by=-created";
  var json= UrlFetchApp.fetch(url,peloton.http_options).getContentText();
  var response = JSON.parse(json);
  if(response.data && response.data.length){
    var cycling=response.data.filter(function(val,idx,arr){return val.metrics_type=="cycling";});
    if(cycling.length){
      var workout=loadWorkout(cycling[0].id);
      if(workout && workout.ftp_info) {
          eventEnd(event,workout.ftp_info.ftp);
          return workout.ftp_info.ftp;
          }
      else {
           eventEnd(event,"No FTP info in last"+response.data.length+" workouts");
           return null;
      }
    } else{
        eventEnd(event,"No Cycling workouts in last"+response.data.length+" workouts");
        return null;
      }
    } else{
       eventEnd(event,"No response from user workout list");
      return null;
    }
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

