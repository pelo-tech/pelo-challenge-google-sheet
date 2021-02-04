function getFriendsPage(user_id, relationship, page, limit){
  var peloton=getConfigDetails().peloton;
  var url=peloton.http_base +'/api/user/'+user_id+"/"+relationship+"?limit="+limit+"&page="+page;
  return getProfileListPage(url);
}


function getProfileListPage(url){

  var config=getConfigDetails();
  var peloton=config.peloton;
  
  var json= UrlFetchApp.fetch(url,peloton.http_options).getContentText();
  var result = JSON.parse(json);
  
  var page={
    profiles:result.data,
    page: result.page,
    page_count: result.page_count,
    limit: result.limit,
    total: result.total,
    sort_by: result.sort_by,
    show_next: result.show_next,
    show_previous: result.show_previous
  };
 
    var profiles=page.profiles.length;

  Logger.log(page);
  Logger.log("Returning page "+ (page.page+1) +" out of "+page.page_count+" pages, containing "+page.limit+" records out of the total "+page.total);
  return page;
}

function getFollowers(user_id, page_size){
  return getFriends(user_id, "followers", page_size);
}

function getFollowing(user_id, page_size){
  return getFriends(user_id, "following", page_size);
}

function testGetFollowing(){
  getFollowing("36fb3771921a45e694057faf629288cd", 200);
}
function testGetFollowers(){
    getFollowers("36fb3771921a45e694057faf629288cd", 200);
}


function getFriends(user_id, relationship, page_size){
var event=eventStart("Get "+relationship.toUpperCase()+" for user",user_id +", PgSz="+page_size);
  var profiles=[];
  var done=false;
  var page=0;
  if(!page_size || page_size==0) page_size=200;
  while(!done){
    // Get Page of workouts
    var results=getFriendsPage(user_id, relationship, page, page_size);

    Logger.log("Processing page "+page);
    if(results.profiles && results.profiles.length >0){
        Logger.log("Adding another "+results.profiles.length+" profiles");
          profiles.push(...results.profiles);  
    }

    Logger.log("Show Next :"+results.show_next+"; total pages "+results.page_count);
    if(!results.show_next || page==(results.page_count-1)){
      done=true;
    } else {
      ++page;
    }
  }

  var arr=Object.values(profiles);
  eventEnd(event,arr.length);
  // Return Profiles in Name order
  return arr.sort((a,b)=>{ return a.username.toLowerCase().localeCompare(b.username.toLowerCase());});
}

function getAllFriends(){
  var peloton=getConfigDetails().peloton;
  var followers=getFollowers(peloton.user_id,200);
  var following=getFollowing(peloton.user_id,200);
  var friends={};
  following.map(profile=>{ friends[profile.username]=profile; })
    followers.map(profile=>{ friends[profile.username]=profile; })

  return Object.values(friends).sort((a,b)=>{return a.username.toLowerCase().localeCompare(b.username.toLowerCase());});
}

 /*
  {
      "id": "xxxxxxxxxx",
      "image_url": "https://s3.amazonaws.com/peloton-profile-images/xxxxx/xxxxxx",
      "is_profile_private": false,
      "location": "xxxxxxxx",
      "total_followers": 733,
      "total_following": 529,
      "total_workouts": 603,
      "username": "xxxxxxx",
      "authed_user_follows": true,
      "relationship": {
        "me_to_user": "following",
        "user_to_me": null
      },
      "category": "following"
    },
  */
function refreshFriends(){
  var event=eventStart("Refresh Friends");
  var sheet=SpreadsheetApp.getActive().getSheetByName(FRIENDS_SHEET_NAME);
  sheet.activate();
  sheet.clear();
  sheet.getRange(1,1).setValue("Loading friends "+new Date()).activateAsCurrentCell();
  var friends=getAllFriends();

  var rows=[];
  rows[0]=["UserID","Leaderboard Name","Private", "Loaded", "Location", "Total Followers", "Total Following", "Total Workouts", "Following Me", "Following Them","Image URL"];
  friends.map(profile=>{
    rows.push([
      profile.id,
      profile.username,
      profile.is_profile_private,
      new Date(),
      profile.location,
      profile.total_followers,
      profile.total_following,
      profile.total_workouts,
      profile.relationship.user_to_me,
      profile.relationship.me_to_user,
      profile.image_url
    ]);
  });
  eventEnd(event, friends.length);
  sheet.getRange(1,1,rows.length,rows[0].length).setValues(rows);
}
