function getRecentFollowingWorkouts(ride_id, page, limit){
  var peloton=getConfigDetails().peloton;
  var url=peloton.http_base +'/api/ride/'+ride_id+"/recent_following_workouts?sort_by=-created&joins=user&limit="+limit+"&page="+page;
  return getWorkoutsPage(url);
}

function getWorkoutsPage(url){

  var config=getConfigDetails();
  var peloton=config.peloton;
  
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
  var profiles={};
  result.data.map(workout => {
      
       // Get latest ride count for a user  to get info on impending milestone
        if(workout.status  && workout.status=="IN_PROGRESS"){
          Logger.log("Ignoring incomplete workout: "+workout.id +"//"+workout.user.username+"//"+workout.status);
          return;
        }
        // sometimes we have a list of user's workouts. Since we can't seem to join that, we can add it here and cache so we only load once
        if(!workout.user){
          if(!profiles[workout.user_id]) profiles[workout.user_id] = getUserProfile(workout.user_id);
          workout.user=profiles[workout.user_id] ;
        }
        var rides=0;
        if(workout.user && workout.user.workout_counts){
          workout.user.workout_counts.forEach(obj=>{ if(obj.name=='Cycling') rides=obj.count; });
        }
        
                  page.workouts.push({
                  // This won't always be there - depends if we join with ride
                  ride:workout.ride, 
                  
                  id: workout.id,
                  pr: workout.is_total_work_personal_record,
                  output: workout.total_work/1000,
                  start_time: new Date(workout.start_time *1000),
                  end_time: new Date(workout.end_time *1000),
                  timezone: workout.timezone,
                  platform: workout.platform,
                  username: workout.user.username,
                  user_id: workout.user.id || workout.user.user_id,
                  user_image: workout.user.image_url,
                  user_location: workout.user.location,
                  user_private: workout.user.is_profile_private,
                  user_rides: workout.user.total_pedaling_metric_workouts,
                  buffering: workout.total_video_buffering_seconds,
                  bufferingv2: workout.v2_total_video_buffering_seconds,
                  total_rides:  rides
                 });               
             });
  
  Logger.log(page);
  Logger.log("Returning page "+ (page.page+1) +" out of "+page.page_count+" pages, containing "+page.limit+" records out of the total "+page.total);
  return page;
}

function getRecentFollowingWorkoutsForClassDaysBack(ride_id, days_ago, latest_workout_id){
  var cutoff_start=new Date().getTime()-(days_ago * 24*60*60*1000);
  var cutoff_end=new Date().getTime()+(60*60*1000); // 1 hour from now just to be safe
  return getRecentFollowingWorkoutsForClass(ride_id, cutoff_start, cutoff_end, latest_workout_id);
}

function getRecentFollowingWorkoutsForClass(ride_id, cutoff_start, cutoff_end, latest_workout_id, page_size){
var event=eventStart("Get Following Workouts",ride_id +", max "+new Date(cutoff_start)+" through "+new Date(cutoff_end)+", lastID="+latest_workout_id+",PgSz="+page_size);
  var all_workouts={};
  var done=false;
  var page=0;
  if(!page_size || page_size==0) page_size=200;
  while(!done){
    // Get Page of workouts
    var results=getRecentFollowingWorkouts(ride_id, page, page_size);
    
    // Sort in date reverse order, to stop once we see the ID of our latest workout
    var workouts=results.workouts.sort((a,b)=>{ /*reverse*/ return b.start_time.getTime()-a.start_time.getTime();});
    
    Logger.log("Processing page "+page);
    for(var i=0;!done && i<workouts.length;++i){
      var workout=workouts[i];
      if(latest_workout_id!=null && workout.id === latest_workout_id){
          Logger.log("Found ID Cutoff workout ["+latest_workout_id+"] Ignoring this ["+workout.id+"/"+workout.username+"/"+workout.start_time+"] and earlier ones");
          done=true; 
          break;
      } else if(workout.start_time.getTime()<cutoff_start.getTime()) {
          Logger.log("Found Time Cutoff workout earlier than ["+new Date(cutoff_start)+"] Ignoring this ["+workout.id+"/"+workout.username+"/"+workout.start_time+"] and earlier ones");
          done=true;
          break;
      } else if (workout.start_time.getTime()>cutoff_end.getTime() ) { 
          Logger.log("This workout took place after the end of the cutoff period.  Ignoring this ["+workout.id+"/"+workout.username+"/"+workout.start_time+"]"); 
      } else {
           var user=workout.user_id;
           if(!all_workouts[user] || all_workouts[user].start_time.getTime() < workout.start_time.getTime()){
              Logger.log("Adding eligible ride by "+workout.username+" from "+workout.start_time);
              all_workouts[user]=workout;
           } else {
             Logger.log("Ignoring ineligible ride (Have a later one from this user):"+["+workout.id+"/"+workout.username+"/"+workout.start_time+"]);
           }
      }
      
    }

    Logger.log("Show Next :"+results.show_next+"; total pages "+results.page_count);
    if(!results.show_next || page==(results.page_count-1)){
      done=true;
    } else {
      ++page;
    }
  }

  var arr=Object.values(all_workouts);
  eventEnd(event,arr.length);
  // Return Workouts in Proper Date Order
  return arr.sort((a,b)=>{ return a.start_time-b.start_time;});
}


function testFollowingWorkouts(){
    var ride_id="0f3c1aaa6b124b91a3691787f2d572ab";

  var results=getRecentFollowingWorkoutsForClassDaysBack(ride_id, 2);

  Logger.log(results);

  Logger.log("I got "+ results.length+" unique user workouts for ride "+ride_id);
  
}

function testLoadAllWorkoutsForRide(){
  loadAllWorkoutsForRide("2dbea3318ed6468caad5c9726005e08f");
}
 

function purgeWorkouts(ride_id, competition){
var event=eventStart("PurgeWorkouts",ride_id+","+competition);
  var sheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RESULTS_SHEET_NAME);
  var rows = sheet.getDataRange().getValues();
  var cols=rows[0];
  var ride_id_column=cols.indexOf("Ride ID");
  var competition_column=cols.indexOf("Competition");
  if(ride_id_column==-1){
    eventEnd(event,"Error - cannot find Ride ID Column!!!!");
    return;
  } 
  if(competition && competition_column==-1){
    eventEnd(event,"Error - Was supposed to delete for competition "+competition+" but cannot find column");
    return;
  }
  Logger.log("Found Ride ID Column at index "+ride_id_column);
  Logger.log("Found Competition Column at index "+competition_column);
  var rows_to_delete=[];
  for(var i=0; i<rows.length;++i){
    if( (rows[i][ride_id_column]==ride_id) && (competition==null || rows[i][competition_column]==competition)) {
      rows_to_delete.push( i+1 /*row number not array idx*/);
      }
  }
  if(rows_to_delete.length > 0 && rows_to_delete.length == rows.length-1) {
    Logger.log("This is deleting all rows (except header). Just going to clear them out instead");
    sheet.getRange(2,1,rows_to_delete.length, cols.length).clear();    
    eventEnd(event, "CLEARED:" +rows_to_delete.length);
    return;
  }
  // reverse sort, to delete from bottom up
  rows_to_delete.sort(function(a, b){return b-a});
  rows_to_delete.forEach(function(val){ sheet.deleteRow(val);});
  Logger.log("Deleted "+rows_to_delete.length+" rows");
  eventEnd(event, rows_to_delete.length);
}

function testLatestSaved(){
var id="ecdb59c419964cb1818558b4b820a110";
var competition="RTW Week 1";
  var workoutID=getLatestSavedWorkoutIDForRide(id,competition);
  Logger.log("Workout found: "+workoutID);
  var workouts=getRecentFollowingWorkoutsForClassDaysBack(id, 14, workoutID);
  Logger.log("Workouts After == "+workouts.length);
  if(workouts.length>0){
    Logger.log("First workout="+workouts[0].start_time);
    Logger.log("Last workout="+workouts[workouts.length-1].start_time);
  }
}

function testDedupeRides(){
  var id="99cb17ab637340b5a2731884a55ae889";
  var competition="RTW Week 3";
  dedupeUsersWithMultipleRides(id,competition);
}

function getLatestSavedWorkoutIDForRide(ride_id, competition){
  var event=eventStart("Get Last Saved Workout", ride_id+","+competition);
  var sheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RESULTS_SHEET_NAME);
  var workouts=getDataAsObjects(sheet);
  Logger.log("Get Workouts for ride "+ride_id +" out of total of "+workouts.length+" workouts");
  // Just get these workouts
  var workouts_for_ride=workouts.filter((workout)=>{ return workout["Ride ID"]==ride_id && (competition!=null && workout["Competition"]==competition); });
  Logger.log("Got "+ workouts_for_ride.length +" workouts for ride "+ride_id +"/"+competition+" out of total of "+workouts.length+" workouts");

  // Now sort by date
  var sorted=workouts_for_ride.sort((a,b)=>{ return a["Date"].getTime()-b["Date"].getTime()});
  if(sorted.length>0){
    Logger.log("Sorted. Earliest is "+sorted[0]["Date"]);
    Logger.log("Sorted. Latest is "+sorted[sorted.length-1]["Date"]);
    eventEnd(event,sorted[sorted.length-1]["Workout ID"]+" out of "+sorted.length);
    return sorted[sorted.length-1]["Workout ID"];
  } else {
    Logger.log("No rides found");
    eventEnd(event, "No rides found");
    return null;
  }
}

/****
 if we do an incremental load with existing user rides already in the sheet, 
 we will need to delete the earlier entries for a given user to count their latest entry by date with more than zero output
 To do this we get all rides for a given competition/Ride ID and find rows to delete
***/
function dedupeUsersWithMultipleRides(ride_id,competition){
  var event=eventStart("Dedupe Users", ride_id+","+competition);
  var sheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RESULTS_SHEET_NAME);
  var workouts=getDataAsObjects(sheet);
  workouts=workouts.filter(workout=>{ return workout["Ride ID"]==ride_id || (competition!=null && workout["Competition"] ==competition)});
  var user_workouts={};
  var rows_to_delete=[];
  Logger.log("Deduping users for "+ride_id+"/"+competition+" out of the total sheet of "+workouts.length+" workouts");
  for(var i=0; i<workouts.length;++i){
    var workout=workouts[i];

    // Is this in scope at all?
    if(workout["Ride ID"]!=ride_id || (competition!=null && workout["Competition"] !=competition)){
      // out of scope. 
      Logger.log("Ignoring "+workout["Ride ID"] +" / "+workout["Competition"] +" as not in scope.");
      continue;
    }   
    var uid=workouts[i]["User ID"];
    if(!user_workouts[uid]) { 
      Logger.log("First workout for "+uid);
      // first time seeing this user workout
      user_workouts[uid]=workout ;
    } else {
      Logger.log("We have an existing workout for this user: "+uid);
      // We have an existing workout. which do we keep, and which do we delete?
      
      if(workout["Workout ID"]==user_workouts[uid]["Workout ID"]){
        // duplicate row. Just delete the new one
        rows_to_delete.push(workout._row);  
        Logger.log("Deleting duplicate row "+workout._row+" for workout "+workout["Workout ID"]);
      
      } else  if(workout["Output"]==0 && user_workouts[uid]["Output"]>0){
        // We have a zero output workout that would clobber one with output
        // Let's keep the one with output
        rows_to_delete.push(workout._row);
        Logger.log("Ignoring zero output row "+workout._row+" since it will clobber existing output workout "+user_workouts[uid]._row+": "+JSON.stringify(user_workouts[uid]));
      }
      
      else if(user_workouts[uid]["Date"].getTime()<= workout["Date"].getTime()){
      // We now have a nonzero workout, or they're both zero. Let's keep the latest
          Logger.log("Deleting older ride: row "+user_workouts[uid]._row+": "+JSON.stringify(user_workouts[uid]));
          rows_to_delete.push(user_workouts[uid]._row);
          user_workouts[uid]=workout;
    }
    
  }
 }
  Logger.log("Total rows to delete: "+JSON.stringify(rows_to_delete));
  var sortedReverse=rows_to_delete.sort((a,b)=>{ return b-a});
  sortedReverse.forEach(row=>{
    sheet.deleteRow(row);
  });
  eventEnd(event,rows_to_delete.length);
  return rows_to_delete.length;
}


function appendWorkoutRows(rows){
  var sheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RESULTS_SHEET_NAME);
  var lastRow=sheet.getLastRow();
  if(rows.length>0){
    sheet.getRange(lastRow+1, 1, rows.length, rows[0].length).setValues(rows);
  }
}

function loadAllWorkoutsForRide(ride_id, competition, last_workout_id, page_size){
 var config=getConfigDetails();
 var event=eventStart("Load All Workouts",ride_id +","+competition+",Last="+last_workout_id+", PageSize="+page_size);

  var ride=getRide(ride_id);
  var days=config.peloton.eligible_ride_age;
  var purge=true;
  if(last_workout_id != null){
    Logger.log("Last Workout ID specified. Will use this as a cutoff to load incremental results. Not purging");
    purge=false;
  }
  var competitionDetails=getCompetitionByName(competition);
  Logger.log("Loading competition with cutoff boundaries: " +JSON.stringify(competitionDetails));
  var workouts=getRecentFollowingWorkoutsForClass(ride_id, competitionDetails.cutoff_start, competitionDetails.cutoff_end, last_workout_id, page_size);
  Logger.log("Got "+workouts.length+" workouts performed on "+ride.title+" by "+ride.instructor.name);
  if(purge){
    Logger.log("Purging any existing workouts on this ride (competition="+competition+")");
    purgeWorkouts(ride.id, competition);
  }

  
  // we will sometimes join the workouts and rides, but here we wont since its always the same ride
  if(workouts) workouts.forEach(workout=>{workout.ride=ride});
  var rows=getWorkoutDetailRows(workouts, competition);
  
  if(workouts && workouts.length){
    appendWorkoutRows(rows);
  }
  
   storeRide(ride, competition, workouts?workouts.length:0);
  if(workouts && workouts.length){
    dedupeUsersWithMultipleRides(ride_id,competition);
   }
   eventEnd(event,workouts&& workouts.length?workouts.length : 0);
   return workouts;
}

function getWorkoutDetailRows(workouts, competition){
 var event=eventStart("getWorkoutDetailRows",workouts?workouts.length:-1+","+competition);
 var config=getConfigDetails();
 var rows=[]; 
 if(workouts)
   workouts.forEach(function(workout){
    var row=[
      workout.id,
      workout.start_time,
      workout.username,
      workout.user_location,
      workout.pr,
      workout.output,
      workout.ride.instructor.name,
      workout.ride.title,
      workout.ride.duration / 60,
      workout.ride.aired? workout.ride.aired:new Date(workout.ride.original_air_time * 1000),
      workout.ride.id,
      workout.user_id,
      workout.timezone,
      workout.platform,
      workout.user_private,
      workout.total_rides
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
    // Add the lookup for gender and bracket or any other table joins
    var dataSettings=config.dataSettings;
    var join_sheet=dataSettings.join_sheet_name;
    var join_range=dataSettings.join_range;
    var results_join_col=dataSettings.results_join_col;
    var cols=[dataSettings.col1_column,  dataSettings.col2_column, dataSettings.col3_column];
    
    for(var i=0; i<cols.length; ++i){
          var col=cols[i];
          if(col && col!=""){
            row.push("=VLOOKUP(LOWER(INDIRECT(CONCAT(\""+results_join_col+"\",ROW()))),'"+join_sheet+"'!"+join_range+","+col+",false)");
          } else row.push(null);
    }
   
    row.push(workout.buffering)
    row.push(workout.bufferingv2);
    row.push(competition);
    row.push(new Date());
    
    if(dataSettings.results_join2_col && dataSettings.join2_sheet_name){
        row.push("=VLOOKUP(LOWER(INDIRECT(CONCAT(\""+dataSettings.results_join2_col+"\",ROW()))),'"+dataSettings.join2_sheet_name+"'!"+dataSettings.join2_range+","+dataSettings.join2_col1_column+",false)");
    }
    rows.push(row);
  });
  return rows;
  eventEnd(event,rows.length);

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


