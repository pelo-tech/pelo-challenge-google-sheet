function testSubmit(){
  var event={namedValues:{"Leaderboard Name":["DovOps"]}};
  onFormSubmit(event);
}

function onFormSubmit(event){
 
  Logger.log(JSON.stringify(event));
  Logger.log(event.namedValues);
  var message="";
  var username=event.namedValues["Leaderboard Name"][0];
  var formEvent=eventStart("New Registration", username);
  var profile=null;
  if(username!=null){
     Logger.log("Scrubbing username:"+username);
     username=username.replace(/[^A-Za-z0-9_]/gi, "");
     Logger.log("Scrubbed username:"+username);
     }
  // Retrieve User Profile
  try{
      profile=getUserProfile(username);
      var status="Success Loading";
      message="Successfully Loaded User Profile: "+profile.username +" ("+profile.user_id+")";
      
      // Reassign corrected username
      event.namedValues["Leaderboard Name"]=[profile.username];
      event.namedValues["UserID"]=[profile.user_id];
      event.namedValues["AlreadyFollowing"]=[profile.following_user];
      
      // Check if Following the user, otherwise Follow
      if(profile.following_user){
        message+=" (Already Following this user)";
        status="Already Following";
        Logger.log("Already Following");
      } else {
        // Try Following
        try{
            var result=changeRelationship("follow",profile.user_id);
            message +=" Relationship Changed: me to user:"+result.me_to_user +", user to me:"+result.user_to_me;
            status = "Requested to follow: "+result.me_to_user;
            event.namedValues["FollowRequest"]=[result.me_to_user];
         }  catch (x){
           event.namedValues["FollowRequest"]=["Error Following"];
           status="Error Following User";
           Logger.log("Error Following "+JSON.stringify(x));
           message+="Error Following user "+username+": "+JSON.stringify(x);
        }
      }
      // Load Additional User Data
      if(profile.user_id){
        Logger.log("Trying to get FTP");
        var ftp=bruteForceGetFTPForUser(profile.user_id);
        event.namedValues["FTP"]=[ftp];
        Logger.log("Got FTP" +ftp);
        var overview=getUserOverview(profile.user_id);
        event.namedValues["PR5 min"]=[null];
        event.namedValues["PR10 min"]=[null];
        event.namedValues["PR15 min"]=[null];
        event.namedValues["PR20 min"]=[null];
        event.namedValues["PR30 min"]=[null];
        event.namedValues["PR45 min"]=[null];
        event.namedValues["PR60 min"]=[null];
        event.namedValues["PR75 min"]=[null];
        event.namedValues["PR90 min"]=[null];
        if(overview.personal_records){
          var records=overview.personal_records.filter(function(val,idx,arr){return val.name=='Cycling'})[0].records;
          for(var i=0;i<records.length;++i){
            event.namedValues["PR"+records[i].name]=[records[i].value];
          }
        }
      }
    } catch (x){
    status="No User Found";
    Logger.log("Error Loading Profile "+JSON.stringify(x));
    message="Error resolving user profile "+username+": "+JSON.stringify(x);
  }    
  
  var formValues = event.namedValues;
  var html = '<hr>'+message+'<hr><ul>';
  for (Key in formValues) {
    var key = Key;
    var data = formValues[Key];
    html += '<li>' + key + ": " + data + '</li>';
  };
  html += '</ul>';
  var cfg=getConfigDetails();
  var to=cfg.email.to;
  
  var options={htmlBody:html};
  if(cfg.email.cc) options.cc=cfg.email.cc;
  
  GmailApp.sendEmail(to,"New Pelo NovPZ Signup ["+username+" : "+status+"]","",options);
  regSheet=SpreadsheetApp.getActive().getSheetByName(REGISTRATION_SHEET_NAME);
  var data=[];
  var keys=Object.keys(formValues).sort();
  
  // Put a second copy of these at front of sheet  so VLOOKUP will work
  var front=["Timestamp","UserID","Leaderboard Name"];
  for(var i=0; i<front.length;++i){
    data.push(formValues[front[i]]);
  }

  for(var i=0;i<keys.length;++i){
    data.push(formValues[keys[i]]);
  }
  
  var id=regSheet.getDataRange().getLastRow();
  var rows=[];
  
  var columns=front.concat(keys);
  
  if(id==1) rows.push(columns);
  rows.push(data);
  Logger.log(JSON.stringify(rows));
  regSheet.getRange(id==1?1:id+1,1,rows.length,columns.length).setValues(rows);
  eventEnd(formEvent, username+":"+status);
}