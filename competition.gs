 function getCompetitions(){
  var sheet=SpreadsheetApp.getActive().getSheetByName(COMPETITIONS_SHEET_NAME);
  return getDataAsObjects(sheet);
}

function testGetRidesForLatestCompetition(){
  var competitions=getActiveCompetitions();
  var competition=(competitions.length>0?competitions[0].Name:null);
  if(competition){
   getRidesForCompetition(competitiom);
  }

}

function getActiveCompetitions(){
 var now=new Date().getTime();
  var competitions=getCompetitions()
    .filter(c=>{ return now>=c.Start.getTime() &&now < c.End.getTime()})
    .sort((a,b)=>{return a.Start.getTime()-b.Start.getTime();});
  return competitions;
}

function getRidesForCompetition(competitionName){
  var event=eventStart("GetRidesForCompetition");
  var rideSet={};
  var result=[];
   
  var rideSheet=SpreadsheetApp.getActive().getSheetByName(RIDES_SHEET_NAME);
  var rides=getDataAsObjects(rideSheet);
  var totalResults=0;
  rides.forEach(ride=>{ if(ride.Competition== competitionName && rideSet[ride.ID]==null) rideSet[ride.ID]=ride;});
  result=Object.values(rideSet);
  eventEnd(event,"Returned "+result.length+" rides for competition "+competitionName);

  return result;
}


function incrementallyPullLatestCompetition(){
 var competitions=getActiveCompetitions();
 var competition=(competitions.length>0?competitions[0].Name:null);
 incrementallyPullRidesForCompetition(competition);
}

function testClearResultsForCompetition(){
  clearResultsForCompetition("Winter Week 3");
}
function clearResultsForCompetition(competition){
  var event=eventStart("ClearRidesForCompetition", competition);
  var resultsSheet=SpreadsheetApp.getActive().getSheetByName(RESULTS_SHEET_NAME);
  var dataRange=resultsSheet.getDataRange();
  var values=dataRange.getValues();
  var competitionIndex=values[0].findIndex(name=>{return name=="Competition"});
  var filteredValues=values.filter(row=>{
    return row[competitionIndex]!=competition;
  });
  if(filteredValues.length!=values.length){
    dataRange.clearContent();
    var newRange = resultsSheet.getRange(1,1,filteredValues.length, filteredValues[0].length);
    newRange.setValues(filteredValues);
  }
  eventEnd(event,"Deleted "+(values.length-filteredValues.length)+" workouts");
  return (values.length-filteredValues.length);

}
function incrementallyPullRidesForCompetition(competition){

  var result={competition:null, rides:0, workouts:0, error:null};
  var page_size="50";
  var event=eventStart("IncrementalPullCompetition",competition+", PageSize="+page_size);
    
  if(competition){
    result.competition=competition;
    Logger.log("Currently in competition: "+competition);
    var rides=getRidesForCompetition(competition);

    if(rides){
      result.rides=rides.length;
      
      rides.forEach(ride=>{
        Logger.log("Loading Incremental Results for ride:" +ride.ID+" ("+ride.Title+" "+ride.Instructor+" "+ride["Originally Aired"]+")");
        
        var workouts=loadRaceResults(ride.ID,competition, true, page_size);
        
        if(workouts) 
          result.workouts+=workouts.length;
          
        Logger.log("Loaded race results incrementally for "+competition+" - Total found="+(workouts?workouts.length:-1));
      });
      
      eventEnd(event,result.workouts+" workouts, "+result.rides+" rides, "+competition);
      
    } else {
      result.error="No rides were found for "+competition;
      eventEnd(event,"0, No rides found for "+competition);
    }
  } else {
    result.error="No competition was found";
    eventEnd(event,"0, No competition found");
  }
  
   // to deal with web calls to this method
   return JSON.parse(JSON.stringify(result));
}

function testGetExistingWorkoutsForUserInCompetition(){
  var workouts=getExistingWorkoutsForUserInCompetition("b3f902e4b6c54777a73b61471ebed471", "RTW Week 1");
  Logger.log(JSON.stringify(workouts));
}

function getExistingWorkoutsForCompetition( competition){
  var event=eventStart("GetWorkoutsForCompetition",competition);
  var resultsSheet=SpreadsheetApp.getActive().getSheetByName(RESULTS_SHEET_NAME);
  var workouts=getDataAsObjects(resultsSheet);
  var results=workouts.filter(workout=>{
    return workout["Competition"]==competition;
  });
  eventEnd(event, results.length);
  return results;
}

function getExistingWorkoutsForUserInCompetition(userId, competition){
  var event=eventStart("GetWorkoutsForUserInCompetition",userId+","+competition);
  var resultsSheet=SpreadsheetApp.getActive().getSheetByName(RESULTS_SHEET_NAME);
  var workouts=getDataAsObjects(resultsSheet);
  var results=workouts.filter(workout=>{
    return workout["User ID"]==userId && workout["Competition"]==competition;
  });
  eventEnd(event, results.length);
  return results;
}

function testGetWorkoutsForUserOnRides(){
  var rides=[];
  var allRides=getRidesForCompetition("RTW Week 2");
  allRides.forEach(ride=>{rides.push(ride.ID);});
  
  var result=getWorkoutsForUserOnRides("b3f902e4b6c54777a73b61471ebed471",rides);
  Logger.log("Found "+result.length+" workouts for "+rides.length+" rides");
  result.forEach(workout=>{
    Logger.log("Result: "+workout.username +" , "+workout.ride.title+","+workout.id);
  });
  //Logger.log(result);
}
function getWorkoutsForUserOnRides(user_id,rides){
  
  var peloton=getConfigDetails().peloton;
  var limit=50;
  var page=0;
  var url=peloton.http_base +'/api/user/'+user_id+"/workouts?sort_by=-created&joins=user,ride,ride.instructor&limit="+limit+"&page="+page;
  Logger.log(url);
  var result= getWorkoutsPage(url);
  if(result && result.workouts && result.workouts.length>0){
    return result.workouts.filter(workout=> rides.indexOf(workout.ride.id)>-1);
  }
  else {
    return [];
  }
}
function refreshUserForCompetition(userId, competition , prompt){
  if(!competition) return;
  if(prompt){
    SpreadsheetApp.getUi().alert("Refreshing user "+userId+ " for event "+competition);
  }
  var result={competition:competition, rides: 0, workouts:0, purged:0};
  var event=eventStart("refreshUserForCompetition",userId+", "+competition);
  
  var rideSet=[];
  Logger.log("Currently in competition: "+competition);
  var rides=getRidesForCompetition(competition);
  rides.forEach(ride=>{rideSet.push(ride.ID);});
  result.rides=rides.length;
  
  
  
  // Get user workouts for each ride, and if scope append them to the workout set
  var workouts=getWorkoutsForUserOnRides(userId, rideSet);
  Logger.log("Found a total of "+workouts.length +" workouts for user "+userId +" in "+rideSet.length+" rides in "+competition);
  
  var rows=getWorkoutDetailRows(workouts, competition);
  Logger.log("Got a total of "+rows.length+" results to append");

  // append to bototm of results
  appendWorkoutRows(rows);

  var dupes=0;
  // Dedupe each ride
  rideSet.forEach(rideID=>{
    dupes+=dedupeUsersWithMultipleRides(rideID,competition);
  });
  Logger.log("Deduped a total of "+dupes+" duplicates after inserting a total of "+rows.length+" rows for a net total of ");
  
  eventEnd("Inserted: "+rows.length+", Dupes: "+dupes);
  if(prompt){
    SpreadsheetApp.getUi().alert("Refreshed user "+userId+ " for event "+competition+" Inserted "+rows.length+" rows, of which "+dupes+" were duplicates");
  }
  return rows.length-dupes;
}