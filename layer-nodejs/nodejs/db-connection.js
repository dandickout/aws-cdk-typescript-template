const MongoClient = require("mongodb").MongoClient;
const DEBUG = false;

// Once we connect to the database once, we'll store that connection and reuse it so that we don't have to connect to the database on every request.
let cachedDb = null;

module.exports.connectToDatabase = async (MONGODB_URI, MONGODB, functionName) => {
	if (DEBUG) {
		console.log('MONGODB_URI: ' + MONGODB_URI);
		console.log('MONGODB: ' + MONGODB);
	}

    try {
		if (cachedDb) { 
			return cachedDb; }

		//get the first word of the function name and see if it is "production" or "staging"
		if (functionName.split('-')[0] === 'production') {
			//replace the word SERVER in the MONGODB_URI with the correct MongoDB Cluster name
			MONGODB_URI = MONGODB_URI.replace('SERVER', 'your-production-cluster-name');
		}
		if (functionName.split('-')[0] === 'staging') {
			MONGODB_URI = MONGODB_URI.replace('SERVER', 'your-staging-cluster-name');
		}

		// Connect to our MongoDB database hosted on MongoDB Atlas
		if(DEBUG) { console.log('Connecting to database'); }
		const client = await MongoClient.connect(MONGODB_URI);
		if(DEBUG) { console.log('Connected to database'); }

		// Specify which database we want to use
		if(DEBUG) { console.log('Getting database'); }
		const db = await client.db(MONGODB);
		if(DEBUG) { console.log('Got database'); }
		cachedDb = db;

		return db;

	} catch (error) { 
		throw new Error(error);
	}
}