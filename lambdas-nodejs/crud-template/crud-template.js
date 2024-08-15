// Imports
const MongoClient = require("mongodb").MongoClient; // MongoDB client for database operations
const AWS = require('aws-sdk'); // AWS SDK for interacting with AWS services
const Joi = require('joi'); // Joi library for data validation
const merge = require('deepmerge'); // Library for deep merging of objects
const ourDB = require('/opt/nodejs/db-connection'); // Custom module for database connection
const Headers = require('/opt/nodejs/create-headers'); // Custom module for creating HTTP headers
const EncryptionLibrary = require("/opt/nodejs/EncryptionLibrary"); // Custom module for encryption

// Get environmental variables
const MONGODB_URI = process.env.MONGODB_URI; // MongoDB URI for database connection
const MONGODB = process.env.MONGODB; // MongoDB database name
const MONGODB_COLL = process.env.MONGODB_COLL; // MongoDB collection name
const ORIGINS_LIST = process.env.ORIGINS_LIST.split(','); // List of allowed origins for CORS, split into an array
const SECRET_ARN = process.env.SECRET_ARN; // ARN of the secret stored in AWS Secrets Manager

// Create an instance of AWS Secrets Manager
const secretsManager = new AWS.SecretsManager();

// Function to retrieve the secret value from AWS Secrets Manager
const getSecretValue = async (secretArn) => {
    // Fetch the secret value using the provided ARN
    const data = await secretsManager.getSecretValue({ SecretId: secretArn }).promise();
    // Check if the secret is a string
    if ('SecretString' in data) {
        return data.SecretString; // Return the secret string
    } else {
        // If the secret is binary, decode it from base64
        let buff = Buffer.from(data.SecretBinary, 'base64');
        return buff.toString('ascii'); // Return the decoded secret
    }
};

// Define validation schemas for different HTTP methods using Joi
const schemas = {
    POST: Joi.object({
        userId: Joi.string().required(), // userId is required and must be a string
        // add other required fields here
    }),
    GET: Joi.object({
        userId: Joi.string().required(), // userId is required and must be a string
        // add other required fields here
    }),
    PUT: Joi.object({
        userId: Joi.string().required(), // userId is required and must be a string
        // add other required fields here
    }),
    DELETE: Joi.object({
        userId: Joi.string().required(), // userId is required and must be a string
        // add other required fields here
    })
};

// Function to validate the event against the appropriate schema
const validateEvent = (pathParameters, schema) => {
    const { error } = schema.validate(pathParameters); // Validate the path parameters
    if (error) {
        console.error('Validation error:', error.details); // Log validation errors
        throw new Error(`Validation error: ${error.details.map(x => x.message).join(', ')}`); // Throw an error if validation fails
    }
};

//====================================================================================================
// MAIN FUNCTION HANDLER
//====================================================================================================
exports.handler = async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false; // Prevent the Lambda function from waiting for the event loop to be empty

    console.log('Received event:', JSON.stringify(event, null, 2)); // Log the received event

    let statusCode = '200'; // Default status code
    const headers = Headers.createHeaders(event.headers.origin, ORIGINS_LIST); // Create HTTP headers from the list of allowed origins
    let body = {
        status: 'ERROR',
        message: 'Premature exit',
        record: {}
    };

    try {
        const secretValue = await getSecretValue(SECRET_ARN); // Retrieve the secret value
        const secret = JSON.parse(secretValue); // Parse the secret value
        const encryptionLibInstance = new EncryptionLibrary(secret.cryptoKey, 'ca-central-1'); // Create an instance of the encryption library

		// Connect to the database and return an error if the connection fails
        let db;
        try {
            db = await ourDB.connectToDatabase(MONGODB_URI, MONGODB, context.functionName); // Connect to the database
            if (!db) {
                throw new Error(":: Database not found");
            }
            console.log("Connected to database");
        } catch (error) {
            const errorString = "Error connecting to database " + error.stack;
            statusCode = '404';
            body.message = errorString;
            body = JSON.stringify(body);
            console.log(body);
            return {
                statusCode,
                headers,
                body
            };
        }

        let userId = event.pathParameters ? decodeURIComponent(event.pathParameters.userId) : null; // Get the userId from the path parameters
        console.log('userId: ' + userId);

        const schema = schemas[event.httpMethod]; // Get the schema for the HTTP method
        if (!schema) {
            throw new Error(`Unsupported method "${event.httpMethod}"`);
        }
        validateEvent(event.pathParameters, schema); // Validate the event

        let data = event.body ? JSON.parse(event.body) : null; // Parse the event body
        console.log('data: ' + JSON.stringify(data));

        const { encryptedData, iv } = data || {}; // Get encrypted data and initialization vector
        let usingEncryption = false;
        let encryptionKey = null;
        let decryptedData = null;

		// If encrypted data and IV are present, decrypt the data
        if (encryptedData && iv) {
            console.log('encrypted data found');
            usingEncryption = true;
            encryptionKey = await encryptionLibInstance.retrieveEncryptionKey(); // Retrieve the encryption key
            decryptedData = await encryptionLibInstance.decryptWithIV(encryptedData, encryptionKey, iv); // Decrypt the data
            console.log("Decrypted data:", decryptedData);
            data = JSON.parse(decryptedData); // Parse the decrypted data
        }

		// Set up a default response body in case of premature exit
        body = {
            status: 'ERROR',
            message: 'Premature exit',
            record: {
                userId: userId,
                data: data
            }
        };

        const def_query = { "userId": userId }; // Define the default query for MongoDB
        const method = event.httpMethod; // Get the HTTP method

        switch (method) {
            case 'DELETE':
                body = await handleDelete(db, def_query); // Handle DELETE request
                break;
            case 'GET':
                body = await handleGet(db, def_query); // Handle GET request
                break;
            case 'POST':
                body = await handlePost(db, userId, data); // Handle POST request
                break;
            case 'PUT':
                body = await handlePut(db, def_query, data); // Handle PUT request
                break;
            default:
                throw new Error(`Unsupported method "${method}"`);
        }

        body.status = 'SUCCESS'; // Set status to SUCCESS

		// If using encryption, encrypt the response data
        if (usingEncryption) {
            console.log('encrypting response');
            const encryptedResponseData = await encryptionLibInstance.encryptWithIV(JSON.stringify(body.record), encryptionKey, iv); // Encrypt the response data
            body.record = {
                encryptedData: encryptedResponseData,
                iv
            };
        }

    } catch (err) {
        console.error('Error:', err); // Log the error
        statusCode = '400';
        body.message = err.message;
        body.status = 'ERROR';
    } finally {
        body = JSON.stringify(body); // Convert the body to a JSON string
    }

    return {
        statusCode,
        body,
        headers,
    };
};

// Function for DELETE method
async function handleDelete(db, def_query) {
    let record = await db.collection(MONGODB_COLL).deleteOne(def_query); // Delete the record from the database
    let message = record ? 'Record deleted' : 'Record not deleted'; // Set the message based on the result
    return { record, message };
}

// Function for GET method
async function handleGet(db, def_query) {
    let record = await db.collection(MONGODB_COLL).findOne(def_query); // Find the record in the database
    let message = record ? 'Record found' : 'Record not found'; // Set the message based on the result
    return { record, message };
}

// Function for POST method
async function handlePost(db, userId, data) {
    let template_doc = {
        userId: userId,
        data: data
    };

    let record = await db.collection(MONGODB_COLL).insertOne(template_doc); // Insert the record into the database
    let message = record ? 'Record created' : 'Record not created'; // Set the message based on the result
    return { record: { id: template_doc.userId }, message };
}

// Function for PUT method
async function handlePut(db, def_query, data) {
    let old_doc = await db.collection(MONGODB_COLL).findOne(def_query); // Find the old record in the database
    let template_doc = {
        userId: def_query.userId,
        configs: data
    };
    let new_doc = merge(old_doc, template_doc); // Merge the old and new records
    delete new_doc['_id']; // Remove the _id field

    let record = await db.collection(MONGODB_COLL).updateOne(def_query, {
        $set: new_doc
    }); // Update the record in the database
    let message = record ? 'Record updated' : 'Record not updated'; // Set the message based on the result
    return { record, message };
}