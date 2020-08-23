function getRide(id){
  var config=getConfigDetails();
  var peloton=config.peloton;
  
  var url=peloton.http_base +'/api/ride/'+id+"/details";
  var json= UrlFetchApp.fetch(url,peloton.http_options).getContentText();
  var data = JSON.parse(json);
  console.log(data);

  var ride=data.ride;
  if(!ride.has_pedaling_metrics){
    console.log("Ride does not have pedaling metrics. Cannot proceed");
    return null;
  }
  var rideObj= {
    id: ride.id,
    workouts: ride.total_workouts,
    aired: new Date(ride.original_air_time * 1000),
    title: ride.title,
    instructor:{
      id:ride.instructor.id,
      name: ride.instructor.name,
      image_url: ride.instructor.image_url
    },
    workouts:ride.total_workouts,
    image_url:ride.image_url,
    duration:ride.duration,
    difficulty_estimate:ride.difficulty_estimate,
    overall_estimate: ride.overall_estimate,
  }
  console.log(rideObj);
  return rideObj;
}

function testGetRide(){
  var id="0f3c1aaa6b124b91a3691787f2d572ab";
  var ride=getRide(id);
  console.log("I got ride "+id);
}


function onRideIDChange(e){
  var sheet= SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if(sheet.getSheetName() != RIDES_SHEET_NAME) return;
  
  Logger.log("onChange event fired :" + JSON.stringify(e));
  if(e.range.rowStart>=2 && (e.range.columnStart>=1 && e.range.columnEnd <=1)){
    console.log("Ride ID value changed");
    var ride_id=sheet.getRange("A"+e.range.rowStart).getValue();
    if(!ride_id || ride_id.length < 10) {
      console.log("Ignoring invalid ride id: "+ride_id);
      return;
    }
    console.log("Looking up ride :"+ride_id);
    var ride=getRide(ride_id);
    if(ride==null || !ride.id || ride.id.length<10) return;
    sheet.getRange("A"+e.range.rowStart+":M"+e.range.rowStart).setValues(
      [[
        ride.id,
        ride.title,
        ride.instructor.name,
        ride.instructor.id,
        ride.aired,
        ride.workouts,
        new Date(),
        ride.duration,
        ride.difficulty_estimate,
        ride.overall_estimate,
        0,
        '=IMAGE("'+ride.image_url+'",4,75,100)',
        '=IMAGE("'+ride.instructor.image_url+'",4,75,75)'
        ]]
      );
    sheet.setColumnWidth(11,100);
    sheet.setColumnWidth(12,75);
    sheet.setRowHeights(e.range.rowStart,1,75);
    var workouts= loadAllWorkoutsForRide(ride_id);
    sheet.getRange("K"+e.range.rowStart).setValue(workouts.length);
  }
}
