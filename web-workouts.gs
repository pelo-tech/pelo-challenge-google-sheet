function loadRaceResults(ride_id, competition){
  SpreadsheetApp.getUi().alert("Loading results for this ride. This might take a while.");
  try{
     var workouts=loadAllWorkoutsForRide(ride_id, competition);
     if(workouts==null || workouts.length==0)  SpreadsheetApp.getUi().alert("No eligible workouts from the configured date range was found.See config tab for how many days back we load the data");
      else SpreadsheetApp.getUi().alert("Result processing complete. Loaded a total of "+workouts.length+" eligible workouts in the specified past date range");
     } catch (e){
     SpreadsheetApp.getUi().alert("Error loading results for this ride :"+e);
     }
}


function purgeRaceResults(ride_id, competition){
  var extra=" for all events. ";
  if(competition) " for event ("+competition+") only.";
  SpreadsheetApp.getUi().alert("Purging results for this ride "+extra+ "This might take a while.");
  try{
     var workouts=purgeWorkouts(ride_id, competition);
     if(workouts==null || workouts.length==0)  SpreadsheetApp.getUi().alert("No rides found to purge "+extra);
      else SpreadsheetApp.getUi().alert("Purge complete. Purge a total of "+workouts.length+" records.");
     } catch (e){
     SpreadsheetApp.getUi().alert("Error purging :"+e);
     }
}