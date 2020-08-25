function getRecentFollowingWorkouts(ride_id, page, limit){
  var config=getConfigDetails();
  var peloton=config.peloton;
  
  var url=peloton.http_base +'/api/ride/'+ride_id+"/recent_following_workouts?sort_by=id&joins=user&limit="+limit+"&page="+page;
  var json= UrlFetchApp.fetch(url,peloton.http_options).getContentText();
  var result = JSON.parse(json);
  
  var page={
    workouts:[],
    page: result.page,
    page_count: result.page_count,
    limit: result.limit,
    count: result.count,
    total: result.total,
    sort_by: result.sort_by,
    show_next: result.show_next,
    show_previous: result.show_previous
  };
  
  result.data.map(workout => {
                  page.workouts.push({
                   
                  id: workout.id,
                  pr: workout.is_total_work_personal_record,
                  output: workout.total_work/1000,
                  start_time: new Date(workout.start_time *1000),
                  end_time: new Date(workout.end_time *1000),
                  timezone: workout.timezone,
                  platform: workout.platform,
                  username: workout.user.username,
                  user_id: workout.user.id,
                  user_image: workout.user.image_url,
                  user_location: workout.user.location,
                  user_private: workout.user.is_profile_private,
                  user_rides: workout.user.total_pedaling_metric_workouts
                 });               
             });
  
  console.log(page);
console.log("Returning page "+ (page.page+1) +" out of "+page.page_count+" pages, containing "+page.workouts.length+"( limit = "+page.limit+") records out of the total "+page.total);
  return page;
}

function getRecentFollowingWorkoutsForClass(ride_id, days_ago){
  var cfg=getConfigDetails();
  var all_workouts={};
  var done=false;
  var page=0;
  var page_size=20;
  var cutoff=new Date().getTime()-(days_ago * 24*60*60*1000);
  while(!done){
    var results=getRecentFollowingWorkouts(ride_id, page, page_size);
    console.log("Loading page "+page);
    results.workouts.map(workout => {
                         var user=workout.user_id;
                         if(!all_workouts[user] || all_workouts[user].start_time.getTime() < workout.start_time.getTime()){
      if(workout.output == 0 && cfg.peloton.ignore_zero_output){
        console.log("Ignoring workout with Zero Output. (Presumably app) by "+workout.username+" from "+workout.start_time);
        return;
      }
      if(workout.start_time.getTime()> cutoff){
                console.log("Adding eligible ride by "+workout.username+" from "+workout.start_time);
                               all_workouts[user]=workout;
      } else {
        console.log("Ignoring ineligible ride by "+workout.username+" from "+workout.start_time);
      }
                             }
                         });
  console.log("Show Next :"+results.show_next+"; total pages "+results.page_count);
    if(!results.show_next || page==(results.page_count-1)){
      done=true;
    } else {
      ++page;
    }
  }

 var arr=Object.values(all_workouts);
return arr;
}

function testFollowingWorkouts(){
    var ride_id="0f3c1aaa6b124b91a3691787f2d572ab";

  var results=getRecentFollowingWorkoutsForClass(ride_id, 2);

  console.log(results);

  console.log("I got "+ results.length+" unique user workouts for ride "+ride_id);
  
}

function testLoadAllWorkoutsForRide(){
  loadAllWorkoutsForRide("0f3c1aaa6b124b91a3691787f2d572ab");
}

function purgeWorkouts(ride_id){
  var sheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RESULTS_SHEET_NAME);
  var rows = sheet.getDataRange().getValues();
  var ride_id_column=9; // array index, not column number which would be 10
  var rows_to_delete=[];
  for(var i=0; i<rows.length;++i){
    if(rows[i][ride_id_column]==ride_id) rows_to_delete.push( i+1 /*row number not array idx*/);
  }
  // reverse sort, to delete from bottom up
  rows_to_delete.sort(function(a, b){return b-a});
  rows_to_delete.forEach(function(val){sheet.deleteRow(val);});
  console.log("Deleted "+rows_to_delete.length+" rows");
}

function loadAllWorkoutsForRide(ride_id){
  var ride=getRide(ride_id);
  var days=getConfigDetails().peloton.eligible_ride_age;
  var workouts=getRecentFollowingWorkoutsForClass(ride_id, days);
  console.log("Got "+workouts.length+" workouts performed on "+ride.title+" by "+ride.instructor.name);
  console.log("Purging any existing workouts on this ride");
  purgeWorkouts(ride.id);
  var sheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RESULTS_SHEET_NAME);
  var lastRow=sheet.getLastRow();
  var rows=[];
  workouts.forEach(function(workout){
    rows.push([
      workout.id,
      workout.start_time,
      workout.username,
      workout.user_location,
      workout.pr,
      workout.output,
      ride.instructor.name,
      ride.title,
      ride.aired,
      ride.id,
      workout.user_id,
      workout.timezone,
      workout.platform,
      workout.user_provate
    ]);
  });
  
    sheet.getRange(lastRow+1, 1, workouts.length, rows[0].length).setValues(rows);
   return workouts;
}

