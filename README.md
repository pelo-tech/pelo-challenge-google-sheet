# pelo-challenge-google-sheet

This is a script for creating a peloton challenge, and relies on persistence in a google sheet
The sheet you need will have to have a copy of this sheet
https://docs.google.com/spreadsheets/d/1ebCXA0631_5O1cTU0Wl-kFYuq4fgngyKdbsExoWkdrU/edit?usp=sharing

## Step 1: Authenticte the Peloton Account
Click the login button on the Config tab to get a session
NOTE: you might be prompted to allow the script to edit the Google Sheet. Accept that prompt.

## Step 2: Follow people by adding their username on the participants list.
You only need to do this if you're not already following the right people.
Adding users to that list will cause your account to send them a 'follow' request 
NOTE: if they're private profiles, it will show 'follow_pending' in the status
If you're already following them, the relationship status may show empty (we can fix that later)

## Step 3: Enter Ride IDs in the first column of the Rides Sheet
this will load the ride details, and then pull all most recent workouts by people your account follows,
for the last XX days back. It chooses the most recent workout for each person. 
You can control how many days back in the config tab.

## Step 4: Review results
results will be visible on the results tab.
If you need to re-load a ride, delete the row from the rides table, and re-enter the ID there. 
All previous results for that ride will be purged so it can pull the new ones
