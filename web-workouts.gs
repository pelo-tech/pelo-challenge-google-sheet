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