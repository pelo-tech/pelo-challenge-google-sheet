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
console.log("Returning page "+ (page.page+1) +" out of "+page.page_count+" pages, containing "+page.limit+" records out of the total "+page.total);
  return page;
}

function getRecentFollowingWorkoutsForClass(ride_id, days_ago){
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
  loadAllWorkoutsForRide("2dbea3318ed6468caad5c9726005e08f");
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
    var row=[
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
      workout.user_private
    ];
    Logger.log("Getting extended workout details for "+workout.id);
    var extended=getFullWorkoutData(workout.id);
    if(extended){
       Logger.log(JSON.stringify(extended));
       row.push(extended.total_output);
       row.push(extended.ftp);
       row.push(extended.distance);
       row.push(extended.calories);
       row.push(extended.max_output);
       row.push(extended.avg_output);
       row.push(extended.max_cadence);
       row.push(extended.avg_cadence);
       row.push(extended.max_resistance);
       row.push(extended.avg_resistance);
       row.push(extended.max_speed);
       row.push(extended.avg_speed);
    }
    rows.push(row);
  });
  
    sheet.getRange(lastRow+1, 1, workouts.length, rows[0].length).setValues(rows);
   return workouts;
}

function testGetFullWorkoutData(){
 var data=getFullWorkoutData('604cb344c20f46529c78e0e47a8be0fe');
 Logger.log(JSON.stringify(data));
 }

function getFullWorkoutData(workout_id){
  var workout=loadWorkout(workout_id);
  var graph=loadWorkoutPerformanceGraph(workout_id);
  if(!workout || !graph) return null;
  var result={
    id: workout.id,
    total_output: workout.total_work,
    is_pr: workout.is_total_work_personal_record,
    ftp: (workout.ftp_info && workout.ftp_info.ftp)? workout.ftp_info.ftp : 0,
    leaderboard_rank: workout.leaderboard_rank,
    leaderboard_total: workout.total_leaderboard_users
  };
  let m={...result,...normalize_stats(graph.metrics),...normalize_stats(graph.summaries)};
  return m;
}

 
function normalize_stats(arr){
   var peloton=getConfigDetails().peloton;
   var dist_unit=peloton.distance_units;
    var result={};
   for(var i=0;i<arr.length;++i){
     var item=arr[i];
     var name=item.display_name;
     var value=item.value?item.value:null;
     var avg=item.average_value?item.average_value:null;
     var max=item.max_value?item.max_value:null;
    
     var multiplier=1;
     if(name.indexOf("Speed")>-1 || name.indexOf("Distance")>-1){
       if(dist_unit != item.display_unit){
        if(dist_unit=='mi') multiplier=1/1.6;  // convert km to mi
         else multipler=1.6;  // convert mi to km
       }
       if(value) value*=multiplier;
       if(max) max*=multiplier;
       if(avg) avg*=multiplier;
    }
    if(value) result[item.slug]=value;
    if(max) result['max_'+item.slug]=max;
    if(avg) result['avg_'+item.slug]=avg;
   }
  return result;
}

function loadWorkout(workout_id){
  var config=getConfigDetails();
  var peloton=config.peloton;
  
  var url=peloton.http_base +'/api/workout/'+workout_id;
  var json= UrlFetchApp.fetch(url,peloton.http_options).getContentText();
  var result = JSON.parse(json);
  return result;
}

function loadWorkoutPerformanceGraph(workout_id){
  // Set seconds interval to one whole hour to get minimal data slots
  var every_n=3600; 
  var config=getConfigDetails();
  var peloton=config.peloton;
  
  var url=peloton.http_base + '/api/workout/'+ workout_id +'/performance_graph?every_n='+every_n;
  var json= UrlFetchApp.fetch(url,peloton.http_options).getContentText();
  var result = JSON.parse(json);
  return result;
}


