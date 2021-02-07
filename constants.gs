var SESSION_ID_CELL="B2";
var USERNAME_CELL="B5";
var USER_ID_CELL="B1";
var TIME_ZONE_CELL="B3";
var ENABLED_CELL="B4";
var LAST_UPDATED_CELL="B6";
var RECORD_COUNT_CELL="B7";
var ELIGIBLE_RIDE_AGE_CELL="B8";
var PELOTON_PLATFORM="web";
var PELOTON_API_BASE="https://api.onepeloton.com";
var WORKOUTS_SHEET_NAME="Workouts";
var CONFIG_SHEET_NAME="Config";
var FAVORITES_SHEET_NAME="Favorites";
var INSTRUCTORS_SHEET_NAME="Instructors";
var PARTICIPANTS_SHEET_NAME="Participants";
var FRIENDS_SHEET_NAME="Friends"
var RIDES_SHEET_NAME="Rides";
var RESULTS_SHEET_NAME="Results";
var EMAIL_TO_CELL="B9";
var EMAIL_CC_CELL="B10";
var EMAIL_SUBJECT_CELL="B21";
var DISTANCE_UNIT_CELL="B11";
var LOG_SHEET_NAME="System Log";
var REGISTRATION_SHEET_NAME="Registration";
var COMPETITIONS_SHEET_NAME="Competitions";
var VALID_USERNAME_REGEX=/[^A-Za-zÀ-ÖØ-öø-ÿ0-9_]/gi;
// Maximum number of days a competition can span
var MAXIMUM_EVENT_SPAN = 45;
/*****
   Dynamic Table Join Settings
  
   Use this to join ride results with 
     user submitted registration data such as privacy-agreement
     or gender, or age bracket, or assigned subgroup
*****/
var DATA_RESULTS_JOIN_COL="B12";
var DATA_JOIN_SHEETNAME_CELL="B13";
var DATA_JOIN_RANGE_CELL="B14";
var DATA_JOIN_COL1_NAME_CELL="B15";
var DATA_JOIN_COL1_COLUMN_CELL="B16";
var DATA_JOIN_COL2_NAME_CELL="B17";
var DATA_JOIN_COL2_COLUMN_CELL="B18";
var DATA_JOIN_COL3_NAME_CELL="B19";
var DATA_JOIN_COL3_COLUMN_CELL="B20";

/// More joining
var DATA_RESULTS_JOIN2_COL="B22";
var DATA_JOIN2_SHEETNAME_CELL="B23";
var DATA_JOIN2_RANGE_CELL="B24";
var DATA_JOIN2_COL1_COLUMN_CELL="B25";
var DATA_JOIN2_COL1_NAME_CELL="B26";
