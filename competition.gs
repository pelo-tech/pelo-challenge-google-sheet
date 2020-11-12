function getCompetitions(){
  var sheet=SpreadsheetApp.getActive().getSheetByName(COMPETITIONS_SHEET_NAME);
  return getDataAsObjects(sheet);
}

function incrementallyPullLatestCompetition(){
  var result={competition:null, rides:0, workouts:0};
  var page_size="50";
  var now=new Date().getTime();
  var event=eventStart("IncrementalPullCompetition","PageSize="+page_size);
  var competitions=getCompetitions()
    .filter(c=>{ return now>=c.Start.getTime() &&now < c.End.getTime()})
    .sort((a,b)=>{return a.Start.getTime()-b.Start.getTime();});
  if(competitions.length>0) {
    var competition=competitions[0];
    Logger.log("Currently in competition: "+JSON.stringify(competition));
    var rideSheet=SpreadsheetApp.getActive().getSheetByName(RIDES_SHEET_NAME);
    var rides=getDataAsObjects(rideSheet);
    var rideSet={};
    var totalResults=0;
    rides.forEach(ride=>{ if(ride.Competition== competition.Name && rideSet[ride.ID]==null) rideSet[ride.ID]=ride;});
    Logger.log("Rides: "+JSON.stringify(rideSet));
    Object.values(rideSet).forEach(ride=>{
        Logger.log("Loading Incremental Results for ride:" +ride.ID+" ("+ride.Title+" "+ride.Instructor+" "+ride["Originally Aired"]+")");
        var workouts=loadRaceResults(ride.ID, competition.Name, true, page_size);
        totalResults+=workouts.length;
        Logger.log("Loaded race results incrementally for "+competition.Name+" - Total found="+(workouts?workouts.length:-1));
    });
    result.competition=competition;
    result.rides=Object.keys(rideSet).length;
    result.workouts=totalResults;
    eventEnd(event,competition.Name+", "+totalResults+" workouts from "+Object.keys(rideSet).length+" rides");
  } else {
    Logger.log("In no active Competition");
    eventEnd(event,"No active Competition");
    result.error="No Active Competition found";
  }
 
   // to deal with web calls to this method
   return JSON.parse(JSON.stringify(result));
}