function loadRaceResults(ride_id, competition){
  
  try{
     var lastWorkoutIDFound=getLatestSavedWorkoutIDForRide(ride_id,competition);
     var msg="No existing rides in the spreadsheet.";
     if(lastWorkoutIDFound) msg=" Loading all rides after "+lastWorkoutIDFound;
     SpreadsheetApp.getUi().alert("Loading results for this ride. This might take a while. ["+msg+"]");
     var workouts=loadAllWorkoutsForRide(ride_id, competition, lastWorkoutIDFound);
     if(workouts==null || workouts.length==0)  SpreadsheetApp.getUi().alert("No eligible workouts from the configured date range was found.See config tab for how many days back we load the data");
      else SpreadsheetApp.getUi().alert("Result processing complete. Loaded a total of "+workouts.length+" eligible workouts in the specified past date range");
     } catch (e){
     Logger.log(e);
     SpreadsheetApp.getUi().alert("Error loading results for this ride :"+e);
     }
}


function purgeRaceResults(ride_id, competition){
  var extra=" for all events. ";
  if(competition) extra=" for event ("+competition+") only.";
  SpreadsheetApp.getUi().alert("Purging results for this ride "+extra+ "This might take a while.");
  try{
     var workouts=purgeWorkouts(ride_id, competition);
     if(workouts==null || workouts.length==0)  SpreadsheetApp.getUi().alert("No rides found to purge "+extra);
      else SpreadsheetApp.getUi().alert("Purge complete. Purge a total of "+workouts.length+" records.");
     } catch (e){
     SpreadsheetApp.getUi().alert("Error purging :"+e);
     }
}