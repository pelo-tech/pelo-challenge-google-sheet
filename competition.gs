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

function testGetWorkoutsForUserInCompetition(){
  var workouts=getWorkoutsForUserInCompetition("b3f902e4b6c54777a73b61471ebed471", "RTW Week 1");
  Logger.log(JSON.stringify(workouts));
}

function getWorkoutsForUserInCompetition(userId, competition){
  var event=eventStart("GetWorkoutsForUserInCompetition",userId+","+competition);
  var resultsSheet=SpreadsheetApp.getActive().getSheetByName(RESULTS_SHEET_NAME);
  var workouts=getDataAsObjects(resultsSheet);
  var results=workouts.filter(workout=>{
    return workout["User ID"]==userId && workout["Competition"]==competition;
  });
  eventEnd(event, results.length);
  return results;
}

function refreshUserForCompetition(userId, competition){
  if(!competition) return;
  var result={competition:competition, rides: 0, workouts:0, purged:0};
  var event=eventStart("refreshUserForCompetition",userId+", "+competition);
  
  var rideSet={};
  Logger.log("Currently in competition: "+competition);
  var rides=getRidesForCompetition(competition);
  rides.forEach(ride=>{rideSet.push(ride.ID);});
  result.rides=rides.length;
  
  // Get all user workouts
  var workouts=getWorkoutsForUserInCompetition(userId, competition);
  Logger.log("User did "+workouts.length+" workouts in this competition: "+competition);
  Logger.log(JSON.stringify(workouts));
  
  
  /*
  // Now can check rideSet on each workout found
  
   // get all registrations after the start of latest competition
  // if size > X - purge all rides and do a full reload
  // else for each user
  // LOAD USER COMPETITION RIDES (purge optional)
  //  get their ride history going back to start of competition
  //. get list of workouts in scope for competition
  // if !purge
  // compare list of global workouts, and add any missing
  // else Purge any existing and readd all
  */
  
}