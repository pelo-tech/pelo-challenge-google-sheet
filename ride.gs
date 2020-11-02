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

function storeRide(ride, competition, workoutCount){
  var event=eventStart("Store Ride", ride.id+","+competition+","+workoutCount);
  var sheet=SpreadsheetApp.getActive().getSheetByName(RIDES_SHEET_NAME);
  var row=[
    new Date(), // Timestamp
    ride.id, // ID
    competition, // Competition
    workoutCount, // Workout Count from this loadiong of the results
    ride.title, // Title
    ride.instructor.name, // Instructor
    ride.instructor.id, // instructor ID
    ride.aired, // Originally Aired
    ride.workouts, // Total Workouts
    ride.duration, // Duration
    ride.image_url, // Ride IMAGE
    ride.instructor.image_url //Instructor Image   
  ];
  sheet.getRange
  sheet.getRange(sheet.getDataRange().getLastRow()+1, 1, 1, row.length).setValues([row]);
  eventEnd(event);
}
