//create a function that takes in an origin and the list ORIGINS_LIST and returns the headers
//with the correct CORS origin
exports.createHeaders = function(origin, ORIGINS_LIST) {
    //set the CORS origin to the default origin
    let CORS_ORIGINS = '';
    //check if the origin is in the list of allowed origins
    if (ORIGINS_LIST.indexOf(origin) > -1) {
        //if so, set the CORS origin to the origin of the request
        CORS_ORIGINS = origin;
    }
    //return the headers with the correct CORS origin
    return {
        "Access-Control-Allow-Headers" : "Content-Type",
        "Access-Control-Allow-Origin": CORS_ORIGINS,
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE",
        'Content-Type': 'application/json',
    };
}

